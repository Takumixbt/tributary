// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {TributaryVault} from "../src/TributaryVault.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {RevenueRouter, IVault} from "../src/RevenueRouter.sol";
import {IERC20} from "../src/interfaces/IERC20.sol";
import {MockUSDC} from "./MockUSDC.sol";

contract TributaryTest is Test {
    MockUSDC usdc;
    TributaryVault vault;
    AgentRegistry registry;
    RevenueRouter router;

    address underwriter = makeAddr("underwriter");
    address lender = makeAddr("lender");
    address lender2 = makeAddr("lender2");
    address agent = makeAddr("agent");
    address buyer = makeAddr("buyer");

    uint256 constant ONE = 1e6; // 1 USDC in 6-decimal units

    function setUp() public {
        usdc = new MockUSDC();
        vault = new TributaryVault(IERC20(address(usdc)), underwriter);
        registry = new AgentRegistry(IERC20(address(usdc)), IVault(address(vault)), underwriter);

        vm.prank(agent);
        router = RevenueRouter(payable(registry.register(0, "ipfs://agent-meta")));

        usdc.mint(lender, 1_000 * ONE);
        usdc.mint(lender2, 1_000 * ONE);
        vm.prank(lender);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(lender2);
        usdc.approve(address(vault), type(uint256).max);
    }

    // ------------------------------------------------------------ helpers
    function _depositAsLender(uint256 amount) internal {
        vm.prank(lender);
        vault.deposit(amount);
    }

    function _openDefaultLine() internal {
        // 100 USDC limit, 10% APR, 20% of revenue services the debt
        vm.prank(underwriter);
        vault.openLine(agent, address(router), uint128(100 * ONE), 1000, 2000);
    }

    // ------------------------------------------------------------- lender
    function test_depositAndWithdraw() public {
        _depositAsLender(500 * ONE);
        assertEq(vault.totalAssets(), 500 * ONE);
        uint256 shares = vault.sharesOf(lender);
        assertGt(shares, 0);

        vm.prank(lender);
        uint256 assets = vault.withdraw(shares);
        assertApproxEqAbs(assets, 500 * ONE, 1);
        assertEq(usdc.balanceOf(lender), 1_000 * ONE - (500 * ONE - assets));
    }

    function test_withdrawRevertsWhenLiquidityLent() public {
        _depositAsLender(100 * ONE);
        _openDefaultLine();
        vm.prank(agent);
        vault.draw(100 * ONE);

        uint256 shares = vault.sharesOf(lender);
        vm.prank(lender);
        vm.expectRevert(TributaryVault.InsufficientLiquidity.selector);
        vault.withdraw(shares);
    }

    // ------------------------------------------------------- credit lines
    function test_onlyUnderwriterOpensLines() public {
        vm.expectRevert(TributaryVault.NotUnderwriter.selector);
        vault.openLine(agent, address(router), uint128(ONE), 1000, 2000);
    }

    function test_drawRespectsLimit() public {
        _depositAsLender(500 * ONE);
        _openDefaultLine();

        vm.prank(agent);
        vault.draw(60 * ONE);
        assertEq(usdc.balanceOf(agent), 60 * ONE);

        vm.prank(agent);
        vm.expectRevert(TributaryVault.ExceedsLimit.selector);
        vault.draw(41 * ONE);
    }

    function test_onlyAgentWithLineCanDraw() public {
        _depositAsLender(500 * ONE);
        vm.prank(buyer);
        vm.expectRevert(TributaryVault.LineNotActive.selector);
        vault.draw(ONE);
    }

    function test_interestAccruesPerSecond() public {
        _depositAsLender(500 * ONE);
        _openDefaultLine();
        vm.prank(agent);
        vault.draw(100 * ONE);

        skip(365 days);
        (uint256 debt,) = vault.debtInfo(agent);
        // 10% APR simple interest on 100 USDC for one year = 10 USDC
        assertApproxEqAbs(debt, 110 * ONE, 2);
    }

    // -------------------------------------------------------- revenue split
    function test_flushSplitsRevenueWhileInDebt() public {
        _depositAsLender(500 * ONE);
        _openDefaultLine();
        vm.prank(agent);
        vault.draw(50 * ONE);

        // agent earns 10 USDC of x402 revenue into its router
        usdc.mint(address(router), 10 * ONE);
        (uint256 toVault, uint256 toAgent) = router.flush();

        // 20% services the debt, 80% reaches the agent
        assertEq(toVault, 2 * ONE);
        assertEq(toAgent, 8 * ONE);
        assertEq(usdc.balanceOf(agent), 50 * ONE + 8 * ONE);
        (uint256 debt,) = vault.debtInfo(agent);
        assertEq(debt, 48 * ONE);
        assertEq(router.cumulativeRevenue(), 10 * ONE);
        assertEq(router.cumulativeRepaid(), 2 * ONE);
    }

    function test_flushCapsAtRemainingDebt() public {
        _depositAsLender(500 * ONE);
        _openDefaultLine();
        vm.prank(agent);
        vault.draw(ONE); // 1 USDC debt

        usdc.mint(address(router), 100 * ONE); // 20% would be 20 USDC, debt is 1
        (uint256 toVault, uint256 toAgent) = router.flush();
        assertEq(toVault, ONE);
        assertEq(toAgent, 99 * ONE);
        (uint256 debt,) = vault.debtInfo(agent);
        assertEq(debt, 0);
    }

    function test_flushPassesEverythingThroughWhenDebtFree() public {
        usdc.mint(address(router), 5 * ONE);
        (uint256 toVault, uint256 toAgent) = router.flush();
        assertEq(toVault, 0);
        assertEq(toAgent, 5 * ONE);
        assertEq(usdc.balanceOf(agent), 5 * ONE);
    }

    function test_interestPaidBeforePrincipal() public {
        _depositAsLender(500 * ONE);
        _openDefaultLine();
        vm.prank(agent);
        vault.draw(100 * ONE);

        skip(365 days); // 10 USDC interest accrued, debt = 110

        usdc.mint(address(router), 25 * ONE); // 20% split = 5 USDC to vault
        router.flush();

        (uint256 debt,) = vault.debtInfo(agent);
        // 5 paid, all against interest first: principal 100, interest 5
        assertApproxEqAbs(debt, 105 * ONE, 2);
        (,, uint128 principal,,,,,) = vault.lines(agent);
        assertEq(principal, 100 * ONE);
    }

    function test_lenderEarnsYieldFromInterest() public {
        _depositAsLender(100 * ONE);
        _openDefaultLine();
        vm.prank(agent);
        vault.draw(100 * ONE);

        skip(365 days); // 10 USDC interest

        // agent earns enough revenue to fully repay: 110 debt at 20% split
        // needs 550 gross; give it 600
        usdc.mint(address(router), 600 * ONE);
        router.flush();

        (uint256 debt,) = vault.debtInfo(agent);
        assertEq(debt, 0);

        // lender redeems all shares for principal + interest
        uint256 shares = vault.sharesOf(lender);
        vm.prank(lender);
        uint256 assets = vault.withdraw(shares);
        assertApproxEqAbs(assets, 110 * ONE, 2);
    }

    // ------------------------------------------------------- risk controls
    function test_underwriterThrottlesLine() public {
        _depositAsLender(500 * ONE);
        _openDefaultLine();
        vm.prank(agent);
        vault.draw(50 * ONE);

        // revenue stops looking healthy: underwriter throttles to zero
        vm.prank(underwriter);
        vault.updateLine(agent, 0, 1000, 2000);

        vm.prank(agent);
        vm.expectRevert(TributaryVault.ExceedsLimit.selector);
        vault.draw(ONE);

        // debt still enforceable through the router
        usdc.mint(address(router), 10 * ONE);
        (uint256 toVault,) = router.flush();
        assertEq(toVault, 2 * ONE);
    }

    function test_writeOffSocializesLoss() public {
        _depositAsLender(100 * ONE);
        _openDefaultLine();
        vm.prank(agent);
        vault.draw(100 * ONE);

        vault.writeOff(agent); // owner is this test contract

        assertEq(vault.totalPrincipal(), 0);
        // loss lands on lenders: their shares now redeem for (almost) nothing
        uint256 shares = vault.sharesOf(lender);
        assertApproxEqAbs(vault.convertToAssets(shares), 0, 1);
        vm.prank(lender);
        uint256 assets = vault.withdraw(shares);
        assertApproxEqAbs(assets, 0, 1);
    }

    // ---------------------------------------------------------- registry
    function test_registryDeploysRouterOnce() public {
        vm.prank(agent);
        vm.expectRevert(AgentRegistry.AlreadyRegistered.selector);
        registry.register(0, "again");

        assertEq(registry.routerOf(agent), address(router));
        assertEq(registry.agentCount(), 1);
    }

    function test_underwriterPostsScore() public {
        vm.prank(underwriter);
        registry.setScore(agent, 742, "30d revenue consistent, 41 unique payers");
        (,, uint32 score,,) = registry.agents(agent);
        assertEq(score, 742);

        vm.expectRevert(AgentRegistry.NotUnderwriter.selector);
        registry.setScore(agent, 1, "nope");
    }

    // ------------------------------------------------------ economic sanity
    function test_fullLifecycle() public {
        // two lenders fund the pool
        _depositAsLender(200 * ONE);
        vm.prank(lender2);
        vault.deposit(200 * ONE);

        _openDefaultLine();

        // agent borrows working capital for a job
        vm.prank(agent);
        vault.draw(80 * ONE);

        // works the job over a week, earning nanopayment revenue in bursts
        for (uint256 i = 0; i < 7; i++) {
            skip(1 days);
            usdc.mint(address(router), 70 * ONE); // ~$70/day gross
            router.flush();
        }

        // 7 * 70 * 20% = 98 > 80 + interest, so debt is fully cleared
        (uint256 debt,) = vault.debtInfo(agent);
        assertEq(debt, 0);

        // share price rose above 1: lenders are in profit
        uint256 assetsPerShare = vault.convertToAssets(1e6);
        assertGt(assetsPerShare, 0);
        uint256 lenderValue = vault.convertToAssets(vault.sharesOf(lender));
        assertGt(lenderValue, 200 * ONE);
    }
}
