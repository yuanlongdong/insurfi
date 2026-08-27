// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IInsurToken.sol";

/// @title PolicyManager - 保单管理器
/// @notice 管理用户保单状态，基于 INSUR 持仓量自动分级
/// @dev 三级保单：基础版(1000 INSUR) / 进阶版(5000 INSUR) / 尊享版(20000 INSUR)
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
        uint256 maxPayout;    // 单笔赔付上限（单位：wei BNB）
        uint256 payoutBps;    // 赔付比例（基点，10000 = 100%）
        string name;           // 等级名称
    }

    /// @notice INSUR 代币合约引用
    IInsurToken public immutable insurToken;

    /// @notice 保单等级配置映射
    mapping(PolicyTier => TierConfig) public tierConfigs;

    /// @notice 最小持仓阈值（基础版）
    uint256 public minHoldingsThreshold;

    // ============ 事件 ============

    /// @notice 保单等级配置更新事件
    /// @param tier 保单等级
    /// @param minHoldings 最低持仓量
    /// @param maxPayout 单笔赔付上限
    /// @param payoutBps 赔付比例
    event PolicyTierUpdated(PolicyTier indexed tier, uint256 minHoldings, uint256 maxPayout, uint256 payoutBps);

    /// @notice 最小持仓阈值更新事件
    /// @param oldThreshold 旧阈值
    /// @param newThreshold 新阈值
    event MinHoldingsThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    // ============ 构造函数 ============

    /// @notice 构造函数
    /// @param _insurToken INSUR 代币合约地址
    /// @param _minThreshold 最小持仓阈值
    constructor(address _insurToken, uint256 _minThreshold) Ownable(msg.sender) {
        require(_insurToken != address(0), "zero token address");
        insurToken = IInsurToken(_insurToken);
        minHoldingsThreshold = _minThreshold;

        // 初始化三级保单配置
        // 基础版：1000 INSUR，赔付上限 0.5 BNB，赔付比例 50%
        tierConfigs[PolicyTier.Basic] = TierConfig({
            minHoldings: _minThreshold,
            maxPayout: 0.5 ether,
            payoutBps: 5000,
            name: "Basic"
        });

        // 进阶版：5000 INSUR，赔付上限 1 BNB，赔付比例 50%
        tierConfigs[PolicyTier.Advanced] = TierConfig({
            minHoldings: 5000 * 10 ** 18,
            maxPayout: 1 ether,
            payoutBps: 5000,
            name: "Advanced"
        });

        // 尊享版：20000 INSUR，赔付上限 2 BNB，赔付比例 50%
        tierConfigs[PolicyTier.Premium] = TierConfig({
            minHoldings: 20000 * 10 ** 18,
            maxPayout: 2 ether,
            payoutBps: 5000,
            name: "Premium"
        });
    }

    // ============ 外部查询函数 ============

    /// @notice 获取用户当前的保单等级
    /// @param user 用户地址
    /// @return PolicyTier 保单等级
    function getPolicyTier(address user) public view returns (PolicyTier) {
        uint256 balance = insurToken.balanceOf(user);

        if (balance >= tierConfigs[PolicyTier.Premium].minHoldings) {
            return PolicyTier.Premium;
        } else if (balance >= tierConfigs[PolicyTier.Advanced].minHoldings) {
            return PolicyTier.Advanced;
        } else if (balance >= tierConfigs[PolicyTier.Basic].minHoldings) {
            return PolicyTier.Basic;
        }

        return PolicyTier.None;
    }

    /// @notice 检查用户保单是否激活（持仓 ≥ 最小阈值且持仓时间足够）
    /// @dev 使用 hasHeldFor 检查持仓持续时间，防闪电贷攻击
    /// @param user 用户地址
    /// @return bool 是否激活
    function isPolicyActive(address user) external view returns (bool) {
        return insurToken.hasHeldFor(user, minHoldingsThreshold);
    }

    /// @notice 检查用户在指定区块时保单是否激活
    /// @dev 用于理赔时验证交易发生时的保单状态
    /// @param user 用户地址
    /// @param blockNum 指定区块号
    /// @return bool 是否激活
    function wasPolicyActiveAt(address user, uint256 blockNum) external view returns (bool) {
        return insurToken.hadHeldAtBlock(user, minHoldingsThreshold, blockNum);
    }

    /// @notice 获取用户保单的赔付上限
    /// @param user 用户地址
    /// @return uint256 赔付上限（wei）
    function getMaxPayout(address user) external view returns (uint256) {
        PolicyTier tier = getPolicyTier(user);
        return tierConfigs[tier].maxPayout;
    }

    /// @notice 获取用户保单的赔付比例
    /// @param user 用户地址
    /// @return uint256 赔付比例（基点）
    function getPayoutBps(address user) external view returns (uint256) {
        PolicyTier tier = getPolicyTier(user);
        return tierConfigs[tier].payoutBps;
    }

    /// @notice 获取用户保单的完整配置
    /// @param user 用户地址
    /// @return tier 保单等级
    /// @return maxPayout 赔付上限
    /// @return payoutBps 赔付比例
    /// @return isActive 是否激活
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

    /// @notice 获取指定等级的配置
    /// @param tier 保单等级
    /// @return TierConfig 等级配置
    function getTierConfig(PolicyTier tier) external view returns (TierConfig memory) {
        return tierConfigs[tier];
    }

    // ============ 管理员函数 ============

    /// @notice 更新保单等级配置
    /// @param tier 保单等级
    /// @param minHoldings 最低持仓量
    /// @param maxPayout 单笔赔付上限
    /// @param payoutBps 赔付比例（基点）
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

    /// @notice 更新最小持仓阈值
    /// @param _threshold 新的最小持仓阈值
    function setMinHoldingsThreshold(uint256 _threshold) external onlyOwner {
        require(_threshold > 0, "threshold zero");
        uint256 oldThreshold = minHoldingsThreshold;
        minHoldingsThreshold = _threshold;

        // 同步更新基础版配置
        tierConfigs[PolicyTier.Basic].minHoldings = _threshold;

        emit MinHoldingsThresholdUpdated(oldThreshold, _threshold);
    }
}
