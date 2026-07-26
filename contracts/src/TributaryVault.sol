// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "./interfaces/IERC20.sol";

/// @title TributaryVault
/// @notice USDC lending pool that extends revenue-underwritten credit lines to
///         AI agents. Lenders deposit USDC and earn yield from interest paid by
///         borrowing agents. Repayment is enforced upstream by each agent's
///         RevenueRouter, which splits incoming x402 revenue between the vault
///         and the agent until the debt is cleared.
/// @dev    Interest accrues per second (simple interest on outstanding
///         principal). Paid interest stays in the vault, which raises the share
///         price for lenders. Amounts are 6-decimal USDC (ERC-20 view on Arc).
contract TributaryVault {
    // ---------------------------------------------------------------- errors
    error NotOwner();
    error NotUnderwriter();
    error NotAgent();
    error LineNotActive();
    error LineAlreadyActive();
    error ZeroAmount();
    error ExceedsLimit();
    error InsufficientLiquidity();
    error InsufficientShares();
    error TransferFailed();
    error BadParams();

    // ---------------------------------------------------------------- events
    event Deposited(address indexed lender, uint256 assets, uint256 shares);
    event Withdrawn(address indexed lender, uint256 assets, uint256 shares);
    event LineOpened(address indexed agent, address indexed router, uint128 limit, uint16 aprBps, uint16 repaymentBps);
    event LineUpdated(address indexed agent, uint128 limit, uint16 aprBps, uint16 repaymentBps);
    event LineClosed(address indexed agent);
    event Drawn(address indexed agent, uint256 amount, uint256 principalAfter);
    event Repaid(address indexed agent, address indexed payer, uint256 interestPaid, uint256 principalPaid);
    event InterestAccrued(address indexed agent, uint256 interest);
    event WrittenOff(address indexed agent, uint256 principalLost, uint256 interestLost);
    event UnderwriterChanged(address indexed underwriter);

    // --------------------------------------------------------------- storage
    IERC20 public immutable usdc;
    address public owner;
    /// @notice The underwriter agent key. Opens, resizes, and closes credit lines.
    address public underwriter;

    uint256 public totalShares;
    mapping(address => uint256) public sharesOf;
    /// @notice Sum of outstanding principal across all credit lines.
    uint256 public totalPrincipal;

    struct CreditLine {
        address router;         // RevenueRouter enforcing repayment for this agent
        uint128 limit;          // max outstanding principal
        uint128 principal;      // outstanding principal
        uint128 accruedInterest;// interest accrued but not yet paid
        uint64 lastAccrual;     // timestamp of last interest accrual
        uint16 aprBps;          // simple annual interest rate, basis points
        uint16 repaymentBps;    // share of routed revenue that services the debt
        bool active;
    }
    mapping(address => CreditLine) public lines;

    uint256 private constant BPS = 10_000;
    uint256 private constant YEAR = 365 days;
    // Virtual share offset hardens first-depositor share-price manipulation.
    uint256 private constant VIRTUAL_SHARES = 1e6;
    uint256 private constant VIRTUAL_ASSETS = 1;

    uint256 private locked = 1;

    modifier nonReentrant() {
        if (locked != 1) revert TransferFailed();
        locked = 2;
        _;
        locked = 1;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyUnderwriter() {
        if (msg.sender != underwriter) revert NotUnderwriter();
        _;
    }

    constructor(IERC20 usdc_, address underwriter_) {
        usdc = usdc_;
        owner = msg.sender;
        underwriter = underwriter_;
    }

    // ---------------------------------------------------------------- lender
    /// @notice Total assets backing shares: idle USDC plus outstanding principal.
    ///         Accrued-but-unpaid interest is recognized when it is actually paid.
    function totalAssets() public view returns (uint256) {
        return usdc.balanceOf(address(this)) + totalPrincipal;
    }

    function convertToShares(uint256 assets) public view returns (uint256) {
        return assets * (totalShares + VIRTUAL_SHARES) / (totalAssets() + VIRTUAL_ASSETS);
    }

    function convertToAssets(uint256 shares) public view returns (uint256) {
        return shares * (totalAssets() + VIRTUAL_ASSETS) / (totalShares + VIRTUAL_SHARES);
    }

    function deposit(uint256 assets) external nonReentrant returns (uint256 shares) {
        if (assets == 0) revert ZeroAmount();
        shares = convertToShares(assets);
        if (shares == 0) revert ZeroAmount();
        if (!usdc.transferFrom(msg.sender, address(this), assets)) revert TransferFailed();
        totalShares += shares;
        sharesOf[msg.sender] += shares;
        emit Deposited(msg.sender, assets, shares);
    }

    function withdraw(uint256 shares) external nonReentrant returns (uint256 assets) {
        if (shares == 0) revert ZeroAmount();
        if (sharesOf[msg.sender] < shares) revert InsufficientShares();
        assets = convertToAssets(shares);
        if (assets > usdc.balanceOf(address(this))) revert InsufficientLiquidity();
        sharesOf[msg.sender] -= shares;
        totalShares -= shares;
        if (!usdc.transfer(msg.sender, assets)) revert TransferFailed();
        emit Withdrawn(msg.sender, assets, shares);
    }

    // ----------------------------------------------------------- underwriter
    function openLine(address agent, address router, uint128 limit, uint16 aprBps, uint16 repaymentBps)
        external
        onlyUnderwriter
    {
        if (lines[agent].active) revert LineAlreadyActive();
        if (agent == address(0) || router == address(0)) revert BadParams();
        if (repaymentBps == 0 || repaymentBps > BPS) revert BadParams();
        lines[agent] = CreditLine({
            router: router,
            limit: limit,
            principal: 0,
            accruedInterest: 0,
            lastAccrual: uint64(block.timestamp),
            aprBps: aprBps,
            repaymentBps: repaymentBps,
            active: true
        });
        emit LineOpened(agent, router, limit, aprBps, repaymentBps);
    }

    /// @notice Resize or reprice a line. Setting limit below current principal
    ///         throttles further draws without forgiving existing debt.
    function updateLine(address agent, uint128 limit, uint16 aprBps, uint16 repaymentBps)
        external
        onlyUnderwriter
    {
        CreditLine storage line = lines[agent];
        if (!line.active) revert LineNotActive();
        if (repaymentBps == 0 || repaymentBps > BPS) revert BadParams();
        _accrue(agent, line);
        line.limit = limit;
        line.aprBps = aprBps;
        line.repaymentBps = repaymentBps;
        emit LineUpdated(agent, limit, aprBps, repaymentBps);
    }

    /// @notice Close a line to new draws. Existing debt keeps accruing and the
    ///         router keeps servicing it until cleared.
    function closeLine(address agent) external onlyUnderwriter {
        CreditLine storage line = lines[agent];
        if (!line.active) revert LineNotActive();
        _accrue(agent, line);
        line.limit = 0;
        emit LineClosed(agent);
    }

    // ---------------------------------------------------------------- agent
    function draw(uint256 amount) external nonReentrant {
        CreditLine storage line = lines[msg.sender];
        if (!line.active) revert LineNotActive();
        if (amount == 0) revert ZeroAmount();
        _accrue(msg.sender, line);
        if (uint256(line.principal) + amount > line.limit) revert ExceedsLimit();
        if (amount > usdc.balanceOf(address(this))) revert InsufficientLiquidity();
        line.principal += uint128(amount);
        totalPrincipal += amount;
        if (!usdc.transfer(msg.sender, amount)) revert TransferFailed();
        emit Drawn(msg.sender, amount, line.principal);
    }

    // -------------------------------------------------------------- repayment
    /// @notice Repay an agent's debt. Called by the agent's RevenueRouter on
    ///         every revenue split, but anyone may repay on an agent's behalf.
    ///         Interest is paid before principal. Overpayment reverts; the
    ///         router caps its transfer at current debt.
    function repay(address agent, uint256 amount) external nonReentrant {
        CreditLine storage line = lines[agent];
        if (!line.active) revert LineNotActive();
        if (amount == 0) revert ZeroAmount();
        _accrue(agent, line);
        uint256 debt = uint256(line.principal) + line.accruedInterest;
        if (amount > debt) revert BadParams();
        if (!usdc.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();

        uint256 interestPaid;
        uint256 principalPaid;
        if (amount <= line.accruedInterest) {
            interestPaid = amount;
            line.accruedInterest -= uint128(amount);
        } else {
            interestPaid = line.accruedInterest;
            principalPaid = amount - interestPaid;
            line.accruedInterest = 0;
            line.principal -= uint128(principalPaid);
            totalPrincipal -= principalPaid;
        }
        emit Repaid(agent, msg.sender, interestPaid, principalPaid);
    }

    /// @notice Recognize an unrecoverable loss. Socialized across lenders via
    ///         the share price. Owner only.
    function writeOff(address agent) external onlyOwner {
        CreditLine storage line = lines[agent];
        if (!line.active) revert LineNotActive();
        _accrue(agent, line);
        uint256 principalLost = line.principal;
        uint256 interestLost = line.accruedInterest;
        totalPrincipal -= principalLost;
        line.principal = 0;
        line.accruedInterest = 0;
        line.limit = 0;
        line.active = false;
        emit WrittenOff(agent, principalLost, interestLost);
    }

    // ---------------------------------------------------------------- views
    /// @notice Current debt (principal + interest, including unaccrued) and the
    ///         revenue share owed. Used by RevenueRouter to size its split.
    function debtInfo(address agent) external view returns (uint256 debt, uint16 repaymentBps) {
        CreditLine storage line = lines[agent];
        if (!line.active) return (0, 0);
        uint256 pending = _pendingInterest(line);
        debt = uint256(line.principal) + line.accruedInterest + pending;
        repaymentBps = line.repaymentBps;
    }

    function availableLiquidity() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    // -------------------------------------------------------------- internal
    function _pendingInterest(CreditLine storage line) private view returns (uint256) {
        if (line.principal == 0) return 0;
        uint256 dt = block.timestamp - line.lastAccrual;
        return uint256(line.principal) * line.aprBps * dt / (BPS * YEAR);
    }

    function _accrue(address agent, CreditLine storage line) private {
        uint256 interest = _pendingInterest(line);
        line.lastAccrual = uint64(block.timestamp);
        if (interest > 0) {
            line.accruedInterest += uint128(interest);
            emit InterestAccrued(agent, interest);
        }
    }

    // ---------------------------------------------------------------- admin
    function setUnderwriter(address underwriter_) external onlyOwner {
        underwriter = underwriter_;
        emit UnderwriterChanged(underwriter_);
    }

    function setOwner(address owner_) external onlyOwner {
        owner = owner_;
    }
}
