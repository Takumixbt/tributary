// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "./interfaces/IERC20.sol";
import {RevenueRouter, IVault} from "./RevenueRouter.sol";

/// @title AgentRegistry
/// @notice Onboards borrowing agents: deploys each agent's RevenueRouter and
///         records its identity and credit score. Scores are posted by the
///         underwriter agent from Gateway revenue history plus onchain router
///         telemetry, and anchor to the agent's ERC-8004 identity where one
///         exists so reputation stays portable across the Arc agent economy.
contract AgentRegistry {
    error AlreadyRegistered();
    error NotRegistered();
    error NotUnderwriter();
    error NotOwner();

    event AgentRegistered(address indexed agent, address indexed router, uint256 erc8004Id, string metadataURI);
    event ScoreUpdated(address indexed agent, uint32 score, string reason);
    event UnderwriterChanged(address indexed underwriter);

    struct AgentInfo {
        address router;
        uint256 erc8004Id;   // ERC-8004 identity token id, 0 if unregistered
        uint32 score;        // 0-1000 credit score set by the underwriter
        uint64 scoredAt;
        string metadataURI;  // what the agent does, service endpoint, etc.
    }

    IERC20 public immutable usdc;
    IVault public immutable vault;
    address public owner;
    address public underwriter;

    mapping(address => AgentInfo) public agents;
    address[] public agentList;

    modifier onlyUnderwriter() {
        if (msg.sender != underwriter) revert NotUnderwriter();
        _;
    }

    constructor(IERC20 usdc_, IVault vault_, address underwriter_) {
        usdc = usdc_;
        vault = vault_;
        owner = msg.sender;
        underwriter = underwriter_;
    }

    /// @notice Called by the agent's own wallet. Deploys the agent's
    ///         RevenueRouter, which becomes its x402 payout address.
    function register(uint256 erc8004Id, string calldata metadataURI) external returns (address router) {
        if (agents[msg.sender].router != address(0)) revert AlreadyRegistered();
        router = address(new RevenueRouter(usdc, vault, msg.sender));
        agents[msg.sender] = AgentInfo({
            router: router,
            erc8004Id: erc8004Id,
            score: 0,
            scoredAt: 0,
            metadataURI: metadataURI
        });
        agentList.push(msg.sender);
        emit AgentRegistered(msg.sender, router, erc8004Id, metadataURI);
    }

    function setScore(address agent, uint32 score, string calldata reason) external onlyUnderwriter {
        AgentInfo storage info = agents[agent];
        if (info.router == address(0)) revert NotRegistered();
        info.score = score;
        info.scoredAt = uint64(block.timestamp);
        emit ScoreUpdated(agent, score, reason);
    }

    function routerOf(address agent) external view returns (address) {
        return agents[agent].router;
    }

    function agentCount() external view returns (uint256) {
        return agentList.length;
    }

    function setUnderwriter(address underwriter_) external {
        if (msg.sender != owner) revert NotOwner();
        underwriter = underwriter_;
        emit UnderwriterChanged(underwriter_);
    }
}
