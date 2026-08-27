// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IInsurToken.sol";

/// @title MockInsurToken - 测试用 INSUR 代币 Mock
/// @notice 模拟 InsurToken 合约，用于本地测试
contract MockInsurToken is IInsurToken {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    mapping(address => Snapshot) private _snapshots;
    uint256 private _totalSupply;
    string public name = "Mock InsurFi";
    string public symbol = "MINSUR";
    uint8 public decimals = 18;

    uint256 public constant MIN_HOLD_BLOCKS = 10;

    constructor(uint256 initialSupply) {
        _totalSupply = initialSupply;
        _balances[msg.sender] = initialSupply;
    }

    function totalSupply() external view override returns (uint256) { return _totalSupply; }
    function balanceOf(address account) external view override returns (uint256) { return _balances[account]; }

    function transfer(address to, uint256 amount) external override returns (bool) {
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        _snapshots[msg.sender] = Snapshot(_balances[msg.sender], block.number);
        _snapshots[to] = Snapshot(_balances[to], block.number);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        _allowances[from][msg.sender] -= amount;
        _balances[from] -= amount;
        _balances[to] += amount;
        _snapshots[from] = Snapshot(_balances[from], block.number);
        _snapshots[to] = Snapshot(_balances[to], block.number);
        return true;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        _allowances[msg.sender][spender] = amount;
        return true;
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function getSnapshot(address account) external view override returns (uint256, uint256) {
        return (_snapshots[account].balance, _snapshots[account].blockNumber);
    }

    function hasHeldFor(address account, uint256 amount) external view override returns (bool) {
        if (_balances[account] < amount) return false;
        if (_snapshots[account].balance < amount) return false;
        if (block.number - _snapshots[account].blockNumber < MIN_HOLD_BLOCKS) return false;
        return true;
    }

    function hadHeldAtBlock(address account, uint256 amount, uint256 blockNum) external view override returns (bool) {
        if (_snapshots[account].blockNumber > blockNum) {
            return _balances[account] >= amount;
        }
        return _snapshots[account].balance >= amount;
    }

    function getMinHoldBlocks() external pure override returns (uint256) { return MIN_HOLD_BLOCKS; }

    // 测试辅助函数：设置快照
    function setSnapshot(address account, uint256 balance, uint256 blockNum) external {
        _snapshots[account] = Snapshot(balance, blockNum);
    }

    // 测试辅助函数：铸造代币
    function mint(address to, uint256 amount) external {
        _totalSupply += amount;
        _balances[to] += amount;
        _snapshots[to] = Snapshot(_balances[to], block.number);
    }
}
