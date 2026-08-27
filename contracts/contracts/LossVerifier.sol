// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IInsurToken.sol";
import "./interfaces/IPolicyManager.sol";
import "./interfaces/IDEXRouter.sol";
import "./interfaces/IInsurancePool.sol";

/// @title LossVerifier - 亏损校验与理赔执行合约（含三重风控）
/// @notice 校验用户交易亏损，计算赔付金额，调用保险池执行赔付
/// @dev 风控：等待期 + 免赔额 + 月度限额 + 整数安全 + 时间窗口 + 单笔上限
contract LossVerifier is Ownable {
    struct ClaimRecord {
        address claimant;
        uint256 buyTradeId;
        uint256 sellTradeId;
        uint256 lossAmount;
        uint256 deductibleAmount;
        uint256 payoutAmount;
        uint256 timestamp;
        bool exists;
    }

    IInsurToken public immutable insurToken;
    IInsurancePool public immutable insurancePool;
    IPolicyManager public immutable policyManager;
    IDEXRouter public immutable dexRouter;

    // 常量
    uint256 public constant MIN_LOSS_THRESHOLD = 0.001 ether;
    uint256 public constant MAX_TRADE_AGE = 30 days;

    // 理赔记录
    mapping(bytes32 => bool) public claimedTrades;
    mapping(uint256 => ClaimRecord) public claimRecords;
    uint256 public claimCount;
    mapping(address => uint256[]) public userClaims;

    // 事件
    event ClaimSuccessful(
        uint256 indexed claimId,
        address indexed claimant,
        uint256 buyTradeId,
        uint256 sellTradeId,
        uint256 lossAmount,
        uint256 deductibleAmount,
        uint256 payoutAmount
    );
    event ClaimFailed(address indexed claimant, uint256 buyTradeId, uint256 sellTradeId, string reason);

    constructor(
        address _insurToken,
        address _insurancePool,
        address _policyManager,
        address _dexRouter
    ) Ownable(msg.sender) {
        require(_insurToken != address(0), "zero token");
        require(_insurancePool != address(0), "zero pool");
        require(_policyManager != address(0), "zero policy");
        require(_dexRouter != address(0), "zero router");
        insurToken = IInsurToken(_insurToken);
        insurancePool = IInsurancePool(_insurancePool);
        policyManager = IPolicyManager(_policyManager);
        dexRouter = IDEXRouter(_dexRouter);
    }

    // ============ 核心理赔函数 ============

    function verifyAndPayout(uint256 buyTradeId, uint256 sellTradeId) external returns (uint256 claimId) {
        // ===== 第 1 步：交易对去重 =====
        bytes32 tradeKey = keccak256(abi.encodePacked(buyTradeId, sellTradeId));
        require(!claimedTrades[tradeKey], "trade pair already claimed");

        // ===== 第 2 步：获取交易记录 =====
        IDEXRouter.TradeRecord memory buyTrade = dexRouter.getTradeRecord(buyTradeId);
        IDEXRouter.TradeRecord memory sellTrade = dexRouter.getTradeRecord(sellTradeId);

        // ===== 第 3 步：交易者一致性 =====
        require(buyTrade.trader == msg.sender, "buy trade not yours");
        require(sellTrade.trader == msg.sender, "sell trade not yours");

        // ===== 第 4 步：交易类型 =====
        require(buyTrade.isBuy, "buy trade is not buy");
        require(!sellTrade.isBuy, "sell trade is not sell");

        // ===== 第 5 步：代币对一致性 =====
        require(buyTrade.tokenOut == sellTrade.tokenIn, "token mismatch");

        // ===== 第 6 步：时间顺序 =====
        require(sellTrade.timestamp > buyTrade.timestamp, "sell before buy");

        // ===== 第 7 步：交易有效期（30 天）=====
        require(block.timestamp - buyTrade.timestamp <= MAX_TRADE_AGE, "buy trade expired");
        require(block.timestamp - sellTrade.timestamp <= MAX_TRADE_AGE, "sell trade expired");

        // ===== 第 8 步：保单有效性（买入时 + 当前）=====
        require(policyManager.wasPolicyActiveAt(msg.sender, buyTrade.blockNumber), "policy not active at buy time");
        require(policyManager.isPolicyActive(msg.sender), "policy not active now");

        // ===== 第 9 步：【风控】等待期检查 =====
        // 买入交易必须发生在持仓激活等待期之后
        // 简化实现：检查买入交易时间距当前时间 >= waitingPeriod
        // 更精确的实现需要记录用户首次达标持仓的时间戳，这里用交易时间近似
        uint256 waitingPeriod = policyManager.waitingPeriod();
        require(block.timestamp - buyTrade.timestamp >= waitingPeriod, "within waiting period");

        // ===== 第 10 步：【风控】月度限额检查 =====
        (bool canClaim, uint256 remainingClaims, uint256 remainingPayout) = policyManager.canClaimThisMonth(msg.sender);
        require(canClaim, "monthly limit exceeded");
        require(remainingClaims > 0, "monthly claim count exceeded");
        require(remainingPayout > 0, "monthly payout amount exceeded");

        // ===== 第 11 步：亏损计算（整数安全）=====
        uint256 costBasis = buyTrade.amountIn;
        uint256 proceeds = sellTrade.amountOut;
        require(proceeds < costBasis, "not a losing trade");

        uint256 lossAmount = costBasis - proceeds;
        require(lossAmount >= MIN_LOSS_THRESHOLD, "loss below threshold");

        // ===== 第 12 步：【风控】免赔额计算 =====
        // 赔付基数 = 亏损 - 免赔额（亏损的 X%）
        uint256 deductibleBps = policyManager.deductibleBps();
        uint256 deductibleAmount = (lossAmount * deductibleBps) / 10000;
        uint256 insurableLoss = lossAmount - deductibleAmount;

        // ===== 第 13 步：赔付计算与多重上限 =====
        uint256 payoutBps = policyManager.getPayoutBps(msg.sender);
        uint256 maxPayout = policyManager.getMaxPayout(msg.sender);

        uint256 payoutAmount = (insurableLoss * payoutBps) / 10000;

        // 保单等级上限
        if (payoutAmount > maxPayout) payoutAmount = maxPayout;
        // 保险池绝对上限（5 BNB）
        if (payoutAmount > insurancePool.MAX_SINGLE_PAYOUT()) payoutAmount = insurancePool.MAX_SINGLE_PAYOUT();
        // 月度剩余额度上限
        if (payoutAmount > remainingPayout) payoutAmount = remainingPayout;
        // 保险池余额检查
        require(insurancePool.getPoolBalance() >= payoutAmount, "pool insufficient");
        require(payoutAmount > 0, "zero payout after limits");

        // ===== 执行赔付 =====
        claimedTrades[tradeKey] = true;
        insurancePool.payout(msg.sender, payoutAmount, buyTradeId);

        // 记录月度统计
        policyManager.recordClaim(msg.sender, payoutAmount);

        // 记录理赔
        claimCount++;
        claimId = claimCount;
        claimRecords[claimId] = ClaimRecord({
            claimant: msg.sender,
            buyTradeId: buyTradeId,
            sellTradeId: sellTradeId,
            lossAmount: lossAmount,
            deductibleAmount: deductibleAmount,
            payoutAmount: payoutAmount,
            timestamp: block.timestamp,
            exists: true
        });
        userClaims[msg.sender].push(claimId);

        emit ClaimSuccessful(claimId, msg.sender, buyTradeId, sellTradeId, lossAmount, deductibleAmount, payoutAmount);
        return claimId;
    }

    // ============ 查询函数 ============

    function getClaimRecord(uint256 claimId) external view returns (ClaimRecord memory) {
        require(claimRecords[claimId].exists, "claim not found");
        return claimRecords[claimId];
    }

    function getUserClaimCount(address user) external view returns (uint256) {
        return userClaims[user].length;
    }

    /// @notice 预览理赔金额（含风控计算）
    function previewClaim(uint256 buyTradeId, uint256 sellTradeId) external view returns (
        uint256 lossAmount,
        uint256 deductibleAmount,
        uint256 payoutAmount,
        bool isValid,
        string memory failReason
    ) {
        bytes32 tradeKey = keccak256(abi.encodePacked(buyTradeId, sellTradeId));
        if (claimedTrades[tradeKey]) return (0, 0, 0, false, "trade pair already claimed");

        try dexRouter.getTradeRecord(buyTradeId) returns (IDEXRouter.TradeRecord memory buyTrade) {
            try dexRouter.getTradeRecord(sellTradeId) returns (IDEXRouter.TradeRecord memory sellTrade) {
                if (buyTrade.trader != msg.sender) return (0, 0, 0, false, "buy trade not yours");
                if (sellTrade.trader != msg.sender) return (0, 0, 0, false, "sell trade not yours");
                if (!buyTrade.isBuy) return (0, 0, 0, false, "buy trade is not buy");
                if (sellTrade.isBuy) return (0, 0, 0, false, "sell trade is not sell");
                if (buyTrade.tokenOut != sellTrade.tokenIn) return (0, 0, 0, false, "token mismatch");
                if (sellTrade.timestamp <= buyTrade.timestamp) return (0, 0, 0, false, "sell before buy");
                if (block.timestamp - buyTrade.timestamp > MAX_TRADE_AGE) return (0, 0, 0, false, "buy trade expired");
                if (block.timestamp - sellTrade.timestamp > MAX_TRADE_AGE) return (0, 0, 0, false, "sell trade expired");

                // 等待期
                uint256 wp = policyManager.waitingPeriod();
                if (block.timestamp - buyTrade.timestamp < wp) return (0, 0, 0, false, "within waiting period");

                // 月度限额
                (bool canClaim, , uint256 remainingPayout) = policyManager.canClaimThisMonth(msg.sender);
                if (!canClaim) return (0, 0, 0, false, "monthly limit exceeded");

                // 亏损
                uint256 costBasis = buyTrade.amountIn;
                uint256 proceeds = sellTrade.amountOut;
                if (proceeds >= costBasis) return (0, 0, 0, false, "not a losing trade");
                lossAmount = costBasis - proceeds;
                if (lossAmount < MIN_LOSS_THRESHOLD) return (0, 0, 0, false, "loss below threshold");

                // 免赔额
                uint256 dedBps = policyManager.deductibleBps();
                deductibleAmount = (lossAmount * dedBps) / 10000;
                uint256 insurableLoss = lossAmount - deductibleAmount;

                // 赔付
                uint256 pBps = policyManager.getPayoutBps(msg.sender);
                uint256 maxP = policyManager.getMaxPayout(msg.sender);
                payoutAmount = (insurableLoss * pBps) / 10000;
                if (payoutAmount > maxP) payoutAmount = maxP;
                if (payoutAmount > insurancePool.MAX_SINGLE_PAYOUT()) payoutAmount = insurancePool.MAX_SINGLE_PAYOUT();
                if (payoutAmount > remainingPayout) payoutAmount = remainingPayout;

                uint256 poolBal = insurancePool.getPoolBalance();
                if (poolBal < payoutAmount) return (lossAmount, deductibleAmount, payoutAmount, false, "pool insufficient");
                if (payoutAmount == 0) return (lossAmount, deductibleAmount, 0, false, "zero payout after limits");

                return (lossAmount, deductibleAmount, payoutAmount, true, "");
            } catch { return (0, 0, 0, false, "sell trade not found"); }
        } catch { return (0, 0, 0, false, "buy trade not found"); }
    }

    function getMinLossThreshold() external pure returns (uint256) { return MIN_LOSS_THRESHOLD; }
    function getMaxTradeAge() external pure returns (uint256) { return MAX_TRADE_AGE; }
}
