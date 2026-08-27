// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IInsurToken - INSUR 代币接口
/// @notice INSUR 代币合约接口，包含持仓快照查询
interface IInsurToken {
    /// @notice 持仓快照结构体
    struct Snapshot {
        uint256 balance;
        uint256 blockNumber;
    }

    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);

    /// @notice 获取地址的持仓快照
    function getSnapshot(address account) external view returns (uint256 balance, uint256 blockNumber);

    /// @notice 检查地址是否持有至少 amount 且持仓持续足够区块数（防闪电贷）
    function hasHeldFor(address account, uint256 amount) external view returns (bool);

    /// @notice 检查地址在指定区块时是否持有至少 amount
    function hadHeldAtBlock(address account, uint256 amount, uint256 blockNum) external view returns (bool);

    /// @notice 获取最小持仓持续区块数
    function getMinHoldBlocks() external pure returns (uint256);
}
