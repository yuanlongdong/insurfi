// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IInsurToken} from "../interfaces/IInsurToken.sol";

/**
 * @title InsurToken
 * @notice INSUR governance and policy-activation token with per-address balance snapshots
 * @dev BEP20-compatible token. Snapshots record balance at each block where balance changes,
 *      enabling policy validity checks at historical blocks (anti-arbitrage).
 */
contract InsurToken is IInsurToken {
    string private _name;
    string private _symbol;
    uint8 private constant _decimals = 18;
    uint256 private _totalSupply;
    address public owner;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // Snapshot storage: per-address list of blocks where balance changed
    mapping(address => uint256[]) private _snapshotBlocks;
    mapping(address => mapping(uint256 => uint256)) private _snapshotBalances;

    modifier onlyOwner() {
        require(msg.sender == owner, "InsurToken: not owner");
        _;
    }

    constructor(string memory name_, string memory symbol_, uint256 initialSupply) {
        _name = name_;
        _symbol = symbol_;
        owner = msg.sender;
        _mint(msg.sender, initialSupply);
    }

    function name() external view override returns (string memory) { return _name; }
    function symbol() external view override returns (string memory) { return _symbol; }
    function decimals() external pure override returns (uint8) { return _decimals; }
    function totalSupply() external view override returns (uint256) { return _totalSupply; }
    function balanceOf(address account) public view override returns (uint256) { return _balances[account]; }

    /**
     * @notice Returns the balance of `account` at `blockNumber` using snapshot history.
     * @dev Binary searches the per-address snapshot list for the latest snapshot <= blockNumber.
     *      If no snapshot exists at or before the block, returns 0.
     */
    function balanceOfAt(address account, uint256 blockNumber) external view override returns (uint256) {
        if (blockNumber >= block.number) return _balances[account];
        uint256[] storage blocks = _snapshotBlocks[account];
        uint256 len = blocks.length;
        if (len == 0) return 0;
        if (blocks[0] > blockNumber) return 0;
        if (blocks[len - 1] <= blockNumber) return _snapshotBalances[account][blocks[len - 1]];

        uint256 low = 0;
        uint256 high = len;
        while (low < high) {
            uint256 mid = low + (high - low) / 2;
            if (blocks[mid] <= blockNumber) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        return _snapshotBalances[account][blocks[high - 1]];
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function allowance(address ownerAddr, address spender) external view override returns (uint256) {
        return _allowances[ownerAddr][spender];
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        _spendAllowance(from, msg.sender, amount);
        _transfer(from, to, amount);
        return true;
    }

    function mint(address to, uint256 amount) external override onlyOwner {
        _mint(to, amount);
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "InsurToken: transfer from zero");
        require(to != address(0), "InsurToken: transfer to zero");
        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "InsurToken: insufficient balance");
        unchecked { _balances[from] = fromBalance - amount; }
        _balances[to] += amount;
        _recordSnapshot(from);
        _recordSnapshot(to);
        emit Transfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal {
        require(to != address(0), "InsurToken: mint to zero");
        _totalSupply += amount;
        _balances[to] += amount;
        _recordSnapshot(to);
        emit Transfer(address(0), to, amount);
    }

    function _approve(address ownerAddr, address spender, uint256 amount) internal {
        require(ownerAddr != address(0), "InsurToken: approve from zero");
        require(spender != address(0), "InsurToken: approve to zero");
        _allowances[ownerAddr][spender] = amount;
        emit Approval(ownerAddr, spender, amount);
    }

    function _spendAllowance(address ownerAddr, address spender, uint256 amount) internal {
        uint256 currentAllowance = _allowances[ownerAddr][spender];
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "InsurToken: insufficient allowance");
            unchecked { _allowances[ownerAddr][spender] = currentAllowance - amount; }
        }
    }

    /**
     * @dev Records a balance snapshot for `account` at the current block.
     *      If a snapshot already exists at this block, updates it in place.
     */
    function _recordSnapshot(address account) internal {
        uint256 currentBlock = block.number;
        uint256[] storage blocks = _snapshotBlocks[account];
        uint256 len = blocks.length;
        if (len > 0 && blocks[len - 1] == currentBlock) {
            _snapshotBalances[account][currentBlock] = _balances[account];
        } else {
            blocks.push(currentBlock);
            _snapshotBalances[account][currentBlock] = _balances[account];
        }
    }
}
