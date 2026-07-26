// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {TributaryVault} from "../src/TributaryVault.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {RevenueRouter, IVault} from "../src/RevenueRouter.sol";
import {IERC20} from "../src/interfaces/IERC20.sol";

/// @notice Deploys the Tributary stack to Arc Testnet.
///         Requires UNDERWRITER_ADDRESS in the environment and a funded
///         deployer key (gas is USDC on Arc, faucet: faucet.circle.com).
contract Deploy is Script {
    // USDC ERC-20 interface on Arc Testnet (6 decimals)
    address constant ARC_USDC = 0x3600000000000000000000000000000000000000;

    function run() external {
        address underwriter = vm.envAddress("UNDERWRITER_ADDRESS");

        vm.startBroadcast();
        TributaryVault vault = new TributaryVault(IERC20(ARC_USDC), underwriter);
        AgentRegistry registry = new AgentRegistry(IERC20(ARC_USDC), IVault(address(vault)), underwriter);
        vm.stopBroadcast();

        console2.log("TributaryVault:", address(vault));
        console2.log("AgentRegistry:", address(registry));
        console2.log("Underwriter:", underwriter);
    }
}
