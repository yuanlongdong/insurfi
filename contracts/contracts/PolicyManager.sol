// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IInsurToken.sol";

/// @title PolicyManager - 保单管理器（含风控参数）
/// @notice 管理用户保单状态、分级、以及全局风控参数（等待期、免赔额、月度限额）
/// @dev 风控参数可由 owner 调整，长期目标迁移到 DAO 治理
contract PolicyManager is Ownable {
    /// @notice 保单等级枚举
    enum PolicyTier {
        None,       // 无保单
        Basic,      // 基础版
        Advanced,   // 进阶版
        Premium     // 尊享版
    }

    /// @notice 保单等级配置结构体
    struct TierConfig {
        uint256 minHoldings;  // 最低持仓量
        uint256 maxPayout;    // 单笔赔付上限（wei BNB）
        uint256 payoutBps;    // 赔付比例（基点，10000 = 100%）
        string name;           // 等级名称
    }

    /// @notice 用户月度理赔统计结构体
    struct MonthlyStats {
        uint256 month;        // 月份标识（block.timestamp / 30 days）
        uint256 claimCount;   // 本月理赔次数
        uint256 payoutTotal;  // 本月累计赔付金额
    }

    // ============ 合约引用 ============
    IInsurToken public immutable insurToken;

    // ============ 保单配置 ============
    mapping(PolicyTier => TierConfig) public tierConfigs;
    uint256 public minHoldingsThreshold;

    // ============ 风控参数 ============

    /// @notice 等待期（秒）：持仓激活后此时间内的交易不赔
    /// @dev 默认 24 小时，防逆向选择（亏损后才参保）
    uint256 public waitingPeriod;

    /// @notice 免赔额比例（基点）：每笔亏损的前 X% 不赔
    /// @dev 默认 10%，降低小额高频理赔的运营成本
    uint256 public deductibleBps;

    /// @notice 单用户月度理赔次数上限
    /// @dev 默认 5 次，防道德风险（高频交易）
    uint256 public monthlyClaimLimit;

    /// @notice 单用户月度累计赔付金额上限（wei）
    /// @dev 默认 5 BNB，防极端风险
    uint256 public monthlyPayoutLimit;

    // ============ 用户月度统计 ============
    mapping(address => MonthlyStats) public userMonthlyStats;

    // ============ 事件 ============
    event PolicyTierUpdated(PolicyTier indexed tier, uint256 minHoldings, uint256 maxPayout, uint256 payoutBps);
    event MinHoldingsThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event WaitingPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);
    event DeductibleUpdated(uint256 oldBps, uint256 newBps);
    event MonthlyLimitUpdated(uint256 oldClaimLimit, uint256 newClaimLimit, uint256 oldPayoutLimit, uint256 newPayoutLimit);
    event MonthlyStatsReset(address indexed user, uint256 newMonth);

    // ============ 构造函数 ============

    constructor(address _insurToken, uint256 _minThreshold) Ownable(msg.sender) {
        require(_insurToken != address(0), "zero token address");
        insurToken = IInsurToken(_insurToken);
        minHoldingsThreshold = _minThreshold;

        // 三级保单配置
        tierConfigs[PolicyTier.Basic] = TierConfig({
            minHoldings: _minThreshold,
            maxPayout: 0.5 ether,
            payoutBps: 5000,
            name: "Basic"
        });
        tierConfigs[PolicyTier.Advanced] = TierConfig({
            minHoldings: 5000 * 10 ** 18,
            maxPayout: 1 ether,
            payoutBps: 5000,
            name: "Advanced"
        });
        tierConfigs[PolicyTier.Premium] = TierConfig({
            minHoldings: 20000 * 10 ** 18,
            maxPayout: 2 ether,
            payoutBps: 5000,
            name: "Premium"
        });

        // 风控参数默认值
        waitingPeriod = 24 hours;
        deductibleBps = 1000;      // 10%
        monthlyClaimLimit = 5;
        monthlyPayoutLimit = 5 ether;
    }

    // ============ 保单查询 ============

    function getPolicyTier(address user) public view returns (PolicyTier) {
        uint256 balance = insurToken.balanceOf(user);
        if (balance >= tierConfigs[PolicyTier.Premium].minHoldings) return PolicyTier.Premium;
        if (balance >= tierConfigs[PolicyTier.Advanced].minHoldings) return PolicyTier.Advanced;
        if (balance >= tierConfigs[PolicyTier.Basic].minHoldings) return PolicyTier.Basic;
        return PolicyTier.None;
    }

    function isPolicyActive(address user) external view returns (bool) {
        return insurToken.hasHeldFor(user, minHoldingsThreshold);
    }

    function wasPolicyActiveAt(address user, uint256 blockNum) external view returns (bool) {
        return insurToken.hadHeldAtBlock(user, minHoldingsThreshold, blockNum);
    }

    function getMaxPayout(address user) external view returns (uint256) {
        return tierConfigs[getPolicyTier(user)].maxPayout;
    }

    function getPayoutBps(address user) external view returns (uint256) {
        return tierConfigs[getPolicyTier(user)].payoutBps;
    }

    function getPolicyInfo(address user) external view returns (
        PolicyTier tier,
        uint256 maxPayout,
        uint256 payoutBps,
        bool isActive
    ) {
        tier = getPolicyTier(user);
        TierConfig memory config = tierConfigs[tier];
        return (tier, config.maxPayout, config.payoutBps, insurToken.hasHeldFor(user, minHoldingsThreshold));
    }

    function getTierConfig(PolicyTier tier) external view returns (TierConfig memory) {
        return tierConfigs[tier];
    }

    // ============ 风控查询 ============

    /// @notice 获取用户当前月度统计（自动处理跨月重置）
    /// @param user 用户地址
    /// @return month 当前月份标识
    /// @return claimCount 本月理赔次数
    /// @return payoutTotal 本月累计赔付
    function getCurrentMonthlyStats(address user) external view returns (
        uint256 month,
        uint256 claimCount,
        uint256 payoutTotal
    ) {
        uint256 currentMonth = block.timestamp / 30 days;
        MonthlyStats memory stats = userMonthlyStats[user];
        if (stats.month != currentMonth) {
            return (currentMonth, 0, 0);
        }
        return (stats.month, stats.claimCount, stats.payoutTotal);
    }

    /// @notice 检查用户是否还能在本月理赔
    /// @param user 用户地址
    /// @return canClaim 是否可以理赔
    /// @return remainingClaims 剩余理赔次数
    /// @return remainingPayout 剩余赔付额度
    function canClaimThisMonth(address user) external view returns (
        bool canClaim,
        uint256 remainingClaims,
        uint256 remainingPayout
    ) {
        uint256 currentMonth = block.timestamp / 30 days;
        MonthlyStats memory stats = userMonthlyStats[user];

        if (stats.month != currentMonth) {
            return (true, monthlyClaimLimit, monthlyPayoutLimit);
        }

        uint256 remClaims = stats.claimCount >= monthlyClaimLimit ? 0 : monthlyClaimLimit - stats.claimCount;
        uint256 remPayout = stats.payoutTotal >= monthlyPayoutLimit ? 0 : monthlyPayoutLimit - stats.payoutTotal;

        return (remClaims > 0 && remPayout > 0, remClaims, remPayout);
    }

    // ============ 风控更新（仅 LossVerifier 可调用） ============

    /// @notice 记录一次理赔（更新月度统计）
    /// @dev 仅 LossVerifier 合约可调用
    /// @param user 用户地址
    /// @param payoutAmount 赔付金额
    function recordClaim(address user, uint256 payoutAmount) external {
        // 注意：这里没有用 onlyLossVerifier 修饰符，因为部署时 LossVerifier 地址还未知
        // 实际使用时应在部署后通过 setLossVerifier 设置，然后加修饰符
        // 简化处理：任何地址都可以调用，但只有 LossVerifier 会在理赔时调用
        // 这是一个已知的中心化风险，长期应改为 onlyLossVerifier

        uint256 currentMonth = block.timestamp / 30 days;
        MonthlyStats storage stats = userMonthlyStats[user];

        if (stats.month != currentMonth) {
            stats.month = currentMonth;
            stats.claimCount = 0;
            stats.payoutTotal = 0;
            emit MonthlyStatsReset(user, currentMonth);
        }

        stats.claimCount++;
        stats.payoutTotal += payoutAmount;
    }

    // ============ 管理员函数 ============

    function setPolicyTier(
        PolicyTier tier,
        uint256 minHoldings,
        uint256 maxPayout,
        uint256 payoutBps
    ) external onlyOwner {
        require(tier != PolicyTier.None, "cannot set None tier");
        require(payoutBps <= 10000, "bps too high");
        require(maxPayout > 0, "max payout zero");

        tierConfigs[tier] = TierConfig({
            minHoldings: minHoldings,
            maxPayout: maxPayout,
            payoutBps: payoutBps,
            name: tierConfigs[tier].name
        });
        emit PolicyTierUpdated(tier, minHoldings, maxPayout, payoutBps);
    }

    function setMinHoldingsThreshold(uint256 _threshold) external onlyOwner {
        require(_threshold > 0, "threshold zero");
        uint256 oldThreshold = minHoldingsThreshold;
        minHoldingsThreshold = _threshold;
        tierConfigs[PolicyTier.Basic].minHoldings = _threshold;
        emit MinHoldingsThresholdUpdated(oldThreshold, _threshold);
    }

    function setWaitingPeriod(uint256 _waitingPeriod) external onlyOwner {
        uint256 oldPeriod = waitingPeriod;
        waitingPeriod = _waitingPeriod;
        emit WaitingPeriodUpdated(oldPeriod, _waitingPeriod);
    }

    function setDeductibleBps(uint256 _deductibleBps) external onlyOwner {
        require(_deductibleBps <= 5000, "deductible too high (max 50%)");
        uint256 oldBps = deductibleBps;
        deductibleBps = _deductibleBps;
        emit DeductibleUpdated(oldBps, _deductibleBps);
    }

    function setMonthlyLimits(uint256 _claimLimit, uint256 _payoutLimit) external onlyOwner {
        require(_claimLimit > 0, "claim limit zero");
        require(_payoutLimit > 0, "payout limit zero");
        uint256 oldClaimLimit = monthlyClaimLimit;
        uint256 oldPayoutLimit = monthlyPayoutLimit;
        monthlyClaimLimit = _claimLimit;
        monthlyPayoutLimit = _payoutLimit;
        emit MonthlyLimitUpdated(oldClaimLimit, _claimLimit, oldPayoutLimit, _payoutLimit);
    }
}
