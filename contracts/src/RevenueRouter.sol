// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "./interfaces/IERC20.sol";

interface IVault {
    function debtInfo(address agent) external view returns (uint256 debt, uint16 repaymentBps);
    function repay(address agent, uint256 amount) external;
}

/// @title RevenueRouter
/// @notice The payout address for one AI agent's x402/nanopayment revenue.
///         Every flush splits the accumulated USDC: while the agent has debt in
///         the TributaryVault, `repaymentBps` of revenue services the loan and
///         the remainder is forwarded to the agent. Once the debt clears, 100%
///         flows through. Repayment is plumbing, not a promise.
/// @dev    On Arc, native gas and the USDC ERC-20 are two views of the same
///         balance, so revenue sent as a plain native transfer and revenue sent
///         via ERC-20 `transfer` both land in this contract's single USDC
///         balance. `flush()` moves funds using the 6-decimal ERC-20 view only.
contract RevenueRouter {
    error TransferFailed();

    event RevenueSplit(uint256 total, uint256 toVault, uint256 toAgent);

    IERC20 public immutable usdc;
    IVault public immutable vault;
    /// @notice The agent's own wallet, where post-split revenue is forwarded.
    address public immutable agent;
    /// @notice Lifetime gross revenue routed through this contract, 6-decimal USDC.
    uint256 public cumulativeRevenue;
    /// @notice Lifetime debt service paid to the vault, 6-decimal USDC.
    uint256 public cumulativeRepaid;

    constructor(IERC20 usdc_, IVault vault_, address agent_) {
        usdc = usdc_;
        vault = vault_;
        agent = agent_;
        usdc_.approve(address(vault_), type(uint256).max);
    }

    /// @notice Accept plain native transfers (the native view of USDC on Arc).
    receive() external payable {}

    /// @notice Split accumulated revenue between the vault and the agent.
    ///         Callable by anyone; typically the agent or a keeper after a
    ///         Gateway withdrawal lands.
    function flush() external returns (uint256 toVault, uint256 toAgent) {
        uint256 balance = usdc.balanceOf(address(this));
        if (balance == 0) return (0, 0);

        (uint256 debt, uint16 repaymentBps) = vault.debtInfo(agent);
        toVault = balance * repaymentBps / 10_000;
        if (toVault > debt) toVault = debt;
        toAgent = balance - toVault;

        cumulativeRevenue += balance;
        if (toVault > 0) {
            cumulativeRepaid += toVault;
            vault.repay(agent, toVault);
        }
        if (toAgent > 0) {
            if (!usdc.transfer(agent, toAgent)) revert TransferFailed();
        }
        emit RevenueSplit(balance, toVault, toAgent);
    }
}
