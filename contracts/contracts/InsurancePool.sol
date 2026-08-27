// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title InsurancePool - 保险资金池合约
/// @notice 管理 BNB 保险资金，接收注资，执行赔付
/// @dev 只有 LossVerifier 合约可以调用 payout 函数
contract InsurancePool is Ownable, ReentrancyGuard, Pausable {
    /// @notice LossVerifier 合约地址（唯一可调用 payout 的地址）
    address public lossVerifier;

    /// @notice 保险池最大资金量（防止超额注资）
    uint256 public maxPoolSize;

    /// @notice 单笔赔付绝对上限（安全兜底）
    uint256 public constant MAX_SINGLE_PAYOUT = 5 ether;

    /// @notice 累计赔付总额
    uint256 public totalPayouts;

    /// @notice 累计注资总额
    uint256 public totalDeposits;

    // ============ 事件 ============

    /// @notice 注资事件
    /// @param from 注资者
    /// @param amount 注资金额
    /// @param newBalance 注资后池余额
    event Deposit(address indexed from, uint256 amount, uint256 newBalance);

    /// @notice 赔付事件
    /// @param to 赔付接收者
    /// @param amount 赔付金额
    /// @param tradeId 关联交易 ID
    /// @param newBalance 赔付后池余额
    event Payout(address indexed to, uint256 amount, uint256 indexed tradeId, uint256 newBalance);

    /// @notice LossVerifier 地址更新事件
    /// @param oldVerifier 旧地址
    /// @param newVerifier 新地址
    event LossVerifierUpdated(address oldVerifier, address newVerifier);

    /// @notice 最大资金量更新事件
    /// @param oldMax 旧最大值
    /// @param newMax 新最大值
    event MaxPoolSizeUpdated(uint256 oldMax, uint256 newMax);

    // ============ 修饰符 ============

    /// @notice 仅 LossVerifier 可调用
    modifier onlyLossVerifier() {
        require(msg.sender == lossVerifier, "not loss verifier");
        _;
    }

    // ============ 构造函数 ============

    /// @notice 构造函数
    /// @dev 默认最大资金量 500 BNB
    constructor() Ownable(msg.sender) {
        maxPoolSize = 500 ether;
    }

    // ============ 注资函数 ============

    /// @notice 向保险池注资（任何人可调用）
    /// @dev 注资后池余额不能超过 maxPoolSize
    function deposit() external payable whenNotPaused {
        require(msg.value > 0, "zero deposit");
        require(address(this).balance <= maxPoolSize, "pool full");
        require(address(this).balance + msg.value <= maxPoolSize, "exceeds max pool size");

        totalDeposits += msg.value;

        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    // ============ 赔付函数 ============

    /// @notice 执行赔付（仅 LossVerifier 可调用）
    /// @param to 赔付接收者
    /// @param amount 赔付金额
    /// @param tradeId 关联交易 ID
    function payout(address to, uint256 amount, uint256 tradeId) external onlyLossVerifier whenNotPaused nonReentrant {
        require(to != address(0), "zero address");
        require(amount > 0, "zero payout");
        require(amount <= MAX_SINGLE_PAYOUT, "exceeds max single payout");
        require(address(this).balance >= amount, "insufficient pool balance");

        totalPayouts += amount;

        // CEI 模式：先更新状态，再转账
        (bool success, ) = payable(to).call{value: amount}("");
        require(success, "payout transfer failed");

        emit Payout(to, amount, tradeId, address(this).balance);
    }

    // ============ 查询函数 ============

    /// @notice 获取保险池余额
    /// @return uint256 池余额（wei）
    function getPoolBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice 获取资金利用率（已赔付 / 总注资）
    /// @return uint256 利用率（基点，10000 = 100%）
    function getUtilizationRate() external view returns (uint256) {
        if (totalDeposits == 0) return 0;
        return (totalPayouts * 10000) / totalDeposits;
    }

    // ============ 管理员函数 ============

    /// @notice 设置 LossVerifier 地址
    /// @param _lossVerifier LossVerifier 合约地址
    function setLossVerifier(address _lossVerifier) external onlyOwner {
        require(_lossVerifier != address(0), "zero address");
        address oldVerifier = lossVerifier;
        lossVerifier = _lossVerifier;
        emit LossVerifierUpdated(oldVerifier, _lossVerifier);
    }

    /// @notice 设置最大资金量
    /// @param _maxPoolSize 新的最大资金量
    function setMaxPoolSize(uint256 _maxPoolSize) external onlyOwner {
        require(_maxPoolSize > 0, "zero max size");
        uint256 oldMax = maxPoolSize;
        maxPoolSize = _maxPoolSize;
        emit MaxPoolSizeUpdated(oldMax, _maxPoolSize);
    }

    /// @notice 紧急暂停（仅 owner）
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice 取消暂停（仅 owner）
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice 紧急提取资金（仅 owner，暂停状态下可调用）
    /// @dev 用于极端情况下的资金保护，提取后需多签确认
    /// @param to 接收地址
    /// @param amount 提取金额
    function emergencyWithdraw(address to, uint256 amount) external onlyOwner whenPaused {
        require(to != address(0), "zero address");
        require(amount > 0 && amount <= address(this).balance, "invalid amount");
        (bool success, ) = payable(to).call{value: amount}("");
        require(success, "withdraw failed");
    }

    /// @notice 接收 BNB
    receive() external payable {}
}
