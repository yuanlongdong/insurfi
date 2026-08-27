// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title InsurToken - INSUR 代币合约（带持仓快照）
/// @notice BEP20 标准代币，记录每个地址的持仓快照和持仓区块，用于防闪电贷骗保
/// @dev 快照在每次 transfer 时更新，记录余额和区块号
contract InsurToken is ERC20, Ownable {
    /// @notice 持仓快照结构体
    struct Snapshot {
        uint256 balance;    // 快照时的余额
        uint256 blockNumber; // 快照时的区块号
    }

    /// @notice 每个地址的最新持仓快照
    mapping(address => Snapshot) private _snapshots;

    /// @notice 最小持仓持续区块数（防闪电贷）
    /// @dev 10 个区块 ≈ 30 秒（BSC 出块时间约 3 秒）
    uint256 public constant MIN_HOLD_BLOCKS = 10;

    /// @notice 代币总供应量：1 亿
    uint256 public constant INITIAL_SUPPLY = 100_000_000 * 10 ** 18;

    // ============ 事件 ============

    /// @notice 持仓快照更新事件
    /// @param account 地址
    /// @param balance 快照余额
    /// @param blockNumber 快照区块号
    event SnapshotUpdated(address indexed account, uint256 balance, uint256 blockNumber);

    // ============ 构造函数 ============

    /// @notice 构造函数，铸造初始供应量
    /// @param initialOwner 初始 owner 地址
    constructor(address initialOwner) ERC20("InsurFi", "INSUR") Ownable(initialOwner) {
        _mint(initialOwner, INITIAL_SUPPLY);
    }

    // ============ 内部函数 ============

    /// @notice 重写 ERC20 的 _update 函数，在转账时更新持仓快照
    /// @param from 发送地址
    /// @param to 接收地址
    /// @param value 转账金额
    /// @dev 排除零地址（mint/burn 时的零地址不需要快照）
    function _update(address from, address to, uint256 value) internal override {
        super._update(from, to, value);

        // 更新发送方快照（排除零地址）
        if (from != address(0)) {
            _snapshots[from] = Snapshot({
                balance: balanceOf(from),
                blockNumber: block.number
            });
            emit SnapshotUpdated(from, balanceOf(from), block.number);
        }

        // 更新接收方快照（排除零地址）
        if (to != address(0)) {
            _snapshots[to] = Snapshot({
                balance: balanceOf(to),
                blockNumber: block.number
            });
            emit SnapshotUpdated(to, balanceOf(to), block.number);
        }
    }

    // ============ 外部查询函数 ============

    /// @notice 获取地址的最新持仓快照
    /// @param account 地址
    /// @return balance 快照余额
    /// @return blockNumber 快照区块号
    function getSnapshot(address account) external view returns (uint256 balance, uint256 blockNumber) {
        Snapshot memory snap = _snapshots[account];
        return (snap.balance, snap.blockNumber);
    }

    /// @notice 检查地址是否持有至少 amount 数量的代币，且持仓持续了足够区块数
    /// @dev 用于防闪电贷攻击：要求持仓持续 ≥ MIN_HOLD_BLOCKS 个区块
    /// @param account 地址
    /// @param amount 最低持仓数量
    /// @return bool 是否满足持仓要求
    function hasHeldFor(address account, uint256 amount) external view returns (bool) {
        Snapshot memory snap = _snapshots[account];

        // 检查当前余额是否达标
        if (balanceOf(account) < amount) {
            return false;
        }

        // 检查快照余额是否达标（防止刚转入的情况）
        if (snap.balance < amount) {
            return false;
        }

        // 检查持仓持续区块数
        if (block.number - snap.blockNumber < MIN_HOLD_BLOCKS) {
            return false;
        }

        return true;
    }

    /// @notice 检查地址在指定区块时是否持有至少 amount 数量的代币
    /// @dev 用于理赔时验证交易发生时的持仓状态（而非当前持仓）
    /// @param account 地址
    /// @param amount 最低持仓数量
    /// @param blockNum 指定区块号
    /// @return bool 是否满足持仓要求
    function hadHeldAtBlock(address account, uint256 amount, uint256 blockNum) external view returns (bool) {
        Snapshot memory snap = _snapshots[account];

        // 如果快照在指定区块之后，说明在指定区块时的持仓可能不同
        // 简化处理：只要快照余额达标且快照区块 <= 指定区块，即认为达标
        // 注意：这是简化实现，精确的历史持仓查询需要更复杂的快照机制
        if (snap.blockNumber > blockNum) {
            // 快照在交易之后，无法确定交易时的持仓
            // 保守处理：检查当前余额
            return balanceOf(account) >= amount;
        }

        return snap.balance >= amount;
    }

    /// @notice 获取最小持仓持续区块数
    /// @return uint256 最小区块数
    function getMinHoldBlocks() external pure returns (uint256) {
        return MIN_HOLD_BLOCKS;
    }
}
