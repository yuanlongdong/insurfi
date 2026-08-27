// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IInsurToken.sol";
import "./interfaces/IPolicyManager.sol";
import "./interfaces/IDEXRouter.sol";
import "./interfaces/IInsurancePool.sol";

/// @title LossVerifier - 亏损校验与理赔执行合约
/// @notice 校验用户交易亏损，计算赔付金额，调用保险池执行赔付
/// @dev 核心防骗保合约：10 步校验 + 整数安全 + 时间窗口 + 单笔上限
contract LossVerifier is Ownable {
    /// @notice 理赔记录结构体
    struct ClaimRecord {
        address claimant;       // 理赔申请人
        uint256 buyTradeId;     // 买入交易 ID
        uint256 sellTradeId;    // 卖出交易 ID
        uint256 lossAmount;     // 亏损金额（BNB 计价）
        uint256 payoutAmount;   // 实际赔付金额
        uint256 timestamp;      // 理赔时间
        bool exists;            // 记录是否存在
    }

    // ============ 合约引用 ============
    IInsurToken public immutable insurToken;
    IInsurancePool public immutable insurancePool;
    IPolicyManager public immutable policyManager;
    IDEXRouter public immutable dexRouter;

    // ============ 常量 ============

    /// @notice 最小亏损门槛（低于此金额不赔）
    uint256 public constant MIN_LOSS_THRESHOLD = 0.001 ether;

    /// @notice 交易记录最大有效期（30 天）
    uint256 public constant MAX_TRADE_AGE = 30 days;

    /// @notice 已理赔交易对映射（防止重复理赔）
    /// @dev key = keccak256(buyTradeId, sellTradeId)
    mapping(bytes32 => bool) public claimedTrades;

    /// @notice 理赔记录映射（claimId => ClaimRecord）
    mapping(uint256 => ClaimRecord) public claimRecords;

    /// @notice 理赔计数器
    uint256 public claimCount;

    /// @notice 用户理赔记录列表
    mapping(address => uint256[]) public userClaims;

    // ============ 事件 ============

    /// @notice 理赔成功事件
    /// @param claimId 理赔 ID
    /// @param claimant 申请人
    /// @param buyTradeId 买入交易 ID
    /// @param sellTradeId 卖出交易 ID
    /// @param lossAmount 亏损金额
    /// @param payoutAmount 赔付金额
    event ClaimSuccessful(
        uint256 indexed claimId,
        address indexed claimant,
        uint256 buyTradeId,
        uint256 sellTradeId,
        uint256 lossAmount,
        uint256 payoutAmount
    );

    /// @notice 理赔失败事件
    /// @param claimant 申请人
    /// @param buyTradeId 买入交易 ID
    /// @param sellTradeId 卖出交易 ID
    /// @param reason 失败原因
    event ClaimFailed(
        address indexed claimant,
        uint256 buyTradeId,
        uint256 sellTradeId,
        string reason
    );

    // ============ 构造函数 ============

    /// @notice 构造函数
    /// @param _insurToken INSUR 代币地址
    /// @param _insurancePool 保险池地址
    /// @param _policyManager 保单管理器地址
    /// @param _dexRouter DEX 路由地址
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

    /// @notice 校验亏损并执行赔付
    /// @param buyTradeId 买入交易 ID
    /// @param sellTradeId 卖出交易 ID
    /// @return claimId 理赔记录 ID
    function verifyAndPayout(uint256 buyTradeId, uint256 sellTradeId) external returns (uint256 claimId) {
        // ===== 第 1 步：交易对去重校验 =====
        bytes32 tradeKey = keccak256(abi.encodePacked(buyTradeId, sellTradeId));
        require(!claimedTrades[tradeKey], "trade pair already claimed");

        // ===== 第 2 步：获取交易记录 =====
        IDEXRouter.TradeRecord memory buyTrade = dexRouter.getTradeRecord(buyTradeId);
        IDEXRouter.TradeRecord memory sellTrade = dexRouter.getTradeRecord(sellTradeId);

        // ===== 第 3 步：交易者一致性校验 =====
        require(buyTrade.trader == msg.sender, "buy trade not yours");
        require(sellTrade.trader == msg.sender, "sell trade not yours");

        // ===== 第 4 步：交易类型校验 =====
        require(buyTrade.isBuy, "buy trade is not buy");
        require(!sellTrade.isBuy, "sell trade is not sell");

        // ===== 第 5 步：代币对一致性校验 =====
        require(buyTrade.tokenOut == sellTrade.tokenIn, "token mismatch");

        // ===== 第 6 步：时间顺序校验（卖出必须在买入之后）=====
        require(sellTrade.timestamp > buyTrade.timestamp, "sell before buy");

        // ===== 第 7 步：交易有效期校验（30 天内）=====
        require(block.timestamp - buyTrade.timestamp <= MAX_TRADE_AGE, "buy trade expired");
        require(block.timestamp - sellTrade.timestamp <= MAX_TRADE_AGE, "sell trade expired");

        // ===== 第 8 步：保单有效性校验（买入时持仓达标且持续足够时间）=====
        require(
            policyManager.wasPolicyActiveAt(msg.sender, buyTrade.blockNumber),
            "policy not active at buy time"
        );
        // 同时检查当前保单状态
        require(policyManager.isPolicyActive(msg.sender), "policy not active now");

        // ===== 第 9 步：亏损计算（整数安全，无 unchecked）=====
        // 计算买入成本（BNB 计价）= buyTrade.amountIn（BNB 数量）
        uint256 costBasis = buyTrade.amountIn;

        // 计算卖出收入（BNB 计价）= sellTrade.amountOut（BNB 数量）
        uint256 proceeds = sellTrade.amountOut;

        // 安全检查：必须是亏损交易（proceeds < costBasis）
        require(proceeds < costBasis, "not a losing trade");

        // 亏损金额 = 成本 - 收入（Solidity 0.8+ 自动检查下溢，但显式检查更安全）
        uint256 lossAmount = costBasis - proceeds;

        // 最小亏损门槛
        require(lossAmount >= MIN_LOSS_THRESHOLD, "loss below threshold");

        // ===== 第 10 步：赔付计算与上限检查 =====
        uint256 payoutBps = policyManager.getPayoutBps(msg.sender);
        uint256 maxPayout = policyManager.getMaxPayout(msg.sender);

        // 赔付金额 = 亏损 * 赔付比例
        uint256 payoutAmount = (lossAmount * payoutBps) / 10000;

        // 保单等级上限
        if (payoutAmount > maxPayout) {
            payoutAmount = maxPayout;
        }

        // 保险池单笔绝对上限（5 BNB）
        if (payoutAmount > insurancePool.MAX_SINGLE_PAYOUT()) {
            payoutAmount = insurancePool.MAX_SINGLE_PAYOUT();
        }

        // 保险池余额检查
        require(insurancePool.getPoolBalance() >= payoutAmount, "pool insufficient");

        // ===== 执行赔付 =====
        // 标记交易对为已理赔（先标记，防重入）
        claimedTrades[tradeKey] = true;

        // 调用保险池执行赔付
        insurancePool.payout(msg.sender, payoutAmount, buyTradeId);

        // 记录理赔
        claimCount++;
        claimId = claimCount;
        claimRecords[claimId] = ClaimRecord({
            claimant: msg.sender,
            buyTradeId: buyTradeId,
            sellTradeId: sellTradeId,
            lossAmount: lossAmount,
            payoutAmount: payoutAmount,
            timestamp: block.timestamp,
            exists: true
        });
        userClaims[msg.sender].push(claimId);

        emit ClaimSuccessful(claimId, msg.sender, buyTradeId, sellTradeId, lossAmount, payoutAmount);

        return claimId;
    }

    // ============ 查询函数 ============

    /// @notice 获取理赔记录
    /// @param claimId 理赔 ID
    /// @return ClaimRecord 理赔记录
    function getClaimRecord(uint256 claimId) external view returns (ClaimRecord memory) {
        require(claimRecords[claimId].exists, "claim not found");
        return claimRecords[claimId];
    }

    /// @notice 获取用户理赔数量
    /// @param user 用户地址
    /// @return uint256 理赔数量
    function getUserClaimCount(address user) external view returns (uint256) {
        return userClaims[user].length;
    }

    /// @notice 预览理赔金额（不执行赔付）
    /// @param buyTradeId 买入交易 ID
    /// @param sellTradeId 卖出交易 ID
    /// @return lossAmount 预估亏损
    /// @return payoutAmount 预估赔付
    /// @return isValid 是否有效理赔
    /// @return failReason 失败原因（如果无效）
    function previewClaim(
        uint256 buyTradeId,
        uint256 sellTradeId
    ) external view returns (
        uint256 lossAmount,
        uint256 payoutAmount,
        bool isValid,
        string memory failReason
    ) {
        // 去重检查
        bytes32 tradeKey = keccak256(abi.encodePacked(buyTradeId, sellTradeId));
        if (claimedTrades[tradeKey]) {
            return (0, 0, false, "trade pair already claimed");
        }

        // 获取交易记录
        try dexRouter.getTradeRecord(buyTradeId) returns (IDEXRouter.TradeRecord memory buyTrade) {
            try dexRouter.getTradeRecord(sellTradeId) returns (IDEXRouter.TradeRecord memory sellTrade) {
                // 基础校验
                if (buyTrade.trader != msg.sender) return (0, 0, false, "buy trade not yours");
                if (sellTrade.trader != msg.sender) return (0, 0, false, "sell trade not yours");
                if (!buyTrade.isBuy) return (0, 0, false, "buy trade is not buy");
                if (sellTrade.isBuy) return (0, 0, false, "sell trade is not sell");
                if (buyTrade.tokenOut != sellTrade.tokenIn) return (0, 0, false, "token mismatch");
                if (sellTrade.timestamp <= buyTrade.timestamp) return (0, 0, false, "sell before buy");

                // 有效期检查
                if (block.timestamp - buyTrade.timestamp > MAX_TRADE_AGE) return (0, 0, false, "buy trade expired");
                if (block.timestamp - sellTrade.timestamp > MAX_TRADE_AGE) return (0, 0, false, "sell trade expired");

                // 亏损计算
                uint256 costBasis = buyTrade.amountIn;
                uint256 proceeds = sellTrade.amountOut;
                if (proceeds >= costBasis) return (0, 0, false, "not a losing trade");

                lossAmount = costBasis - proceeds;
                if (lossAmount < MIN_LOSS_THRESHOLD) return (0, 0, false, "loss below threshold");

                // 赔付计算
                uint256 payoutBps = policyManager.getPayoutBps(msg.sender);
                uint256 maxPayout = policyManager.getMaxPayout(msg.sender);
                payoutAmount = (lossAmount * payoutBps) / 10000;
                if (payoutAmount > maxPayout) payoutAmount = maxPayout;

                uint256 poolBalance = insurancePool.getPoolBalance();
                if (poolBalance < payoutAmount) return (lossAmount, payoutAmount, false, "pool insufficient");

                return (lossAmount, payoutAmount, true, "");
            } catch {
                return (0, 0, false, "sell trade not found");
            }
        } catch {
            return (0, 0, false, "buy trade not found");
        }
    }

    /// @notice 获取常量
    function getMinLossThreshold() external pure returns (uint256) { return MIN_LOSS_THRESHOLD; }
    function getMaxTradeAge() external pure returns (uint256) { return MAX_TRADE_AGE; }
}
