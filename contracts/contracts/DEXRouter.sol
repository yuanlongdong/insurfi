// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IPancakeRouter.sol";

/// @title DEXRouter - DEX 交易代理合约
/// @notice 代理用户在 PancakeSwap 上的交易，记录链上交易数据用于亏损校验
/// @dev 所有受保交易必须通过本合约执行，直接调用 PancakeSwap 的交易不受保
contract DEXRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice 交易记录结构体
    struct TradeRecord {
        address trader;        // 交易者地址
        address tokenIn;       // 输入代币地址（address(0) 表示 BNB）
        address tokenOut;      // 输出代币地址（address(0) 表示 BNB）
        uint256 amountIn;      // 输入金额
        uint256 amountOut;     // 输出金额
        uint256 timestamp;     // 交易时间戳
        uint256 blockNumber;   // 交易区块号
        bytes32 txHash;        // 交易哈希（用于链上验证）
        bool isBuy;            // 是否为买入交易（BNB -> 代币）
        bool exists;           // 记录是否存在
    }

    /// @notice PancakeSwap Router 合约引用
    IPancakeRouter public immutable pancakeRouter;

    /// @notice WBNB 地址
    address public immutable WBNB;

    /// @notice 交易记录映射（tradeId => TradeRecord）
    mapping(uint256 => TradeRecord) public tradeRecords;

    /// @notice 交易记录计数器
    uint256 public tradeCount;

    /// @notice 用户的交易 ID 列表（user => tradeId[]）
    mapping(address => uint256[]) public userTrades;

    // ============ 事件 ============

    /// @notice 交易执行事件
    /// @param tradeId 交易 ID
    /// @param trader 交易者
    /// @param tokenIn 输入代币
    /// @param tokenOut 输出代币
    /// @param amountIn 输入金额
    /// @param amountOut 输出金额
    /// @param isBuy 是否买入
    event TradeExecuted(
        uint256 indexed tradeId,
        address indexed trader,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        bool isBuy
    );

    /// @notice 误锁定代币救援事件
    /// @param token 代币地址
    /// @param to 接收地址
    /// @param amount 救援数量
    event TokensRescued(address indexed token, address indexed to, uint256 amount);

    /// @notice Router 地址更新事件
    /// @param oldRouter 旧 Router 地址
    /// @param newRouter 新 Router 地址
    event RouterUpdated(address oldRouter, address newRouter);

    // ============ 构造函数 ============

    /// @notice 构造函数
    /// @param _pancakeRouter PancakeSwap Router 地址
    constructor(address _pancakeRouter) Ownable(msg.sender) {
        require(_pancakeRouter != address(0), "zero router");
        pancakeRouter = IPancakeRouter(_pancakeRouter);
        WBNB = IPancakeRouter(_pancakeRouter).WETH();
    }

    // ============ 交易函数 ============

    /// @notice 用 BNB 买入代币（受保交易入口）
    /// @param amountOutMin 最小输出金额（滑点保护）
    /// @param path 交易路径 [WBNB, tokenOut]
    /// @param deadline 交易截止时间
    /// @return tradeId 交易记录 ID
    function swapETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        uint256 deadline
    ) external payable nonReentrant returns (uint256 tradeId) {
        require(msg.value > 0, "zero BNB");
        require(path.length >= 2, "invalid path");
        require(path[0] == WBNB, "path must start with WBNB");
        require(deadline >= block.timestamp, "expired");

        // 调用 PancakeSwap，校验返回值
        uint256[] memory amounts = pancakeRouter.swapExactETHForTokens{
            value: msg.value
        }(amountOutMin, path, address(this), deadline);

        // 安全校验：返回值非空且输出金额 > 0
        require(amounts.length >= 2, "invalid amounts");
        require(amounts[amounts.length - 1] > 0, "zero output");

        uint256 amountOut = amounts[amounts.length - 1];
        address tokenOut = path[path.length - 1];

        // 将买入的代币发送给用户
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // 记录交易
        tradeId = _recordTrade(
            msg.sender,
            address(0), // BNB
            tokenOut,
            msg.value,
            amountOut,
            true // isBuy
        );

        return tradeId;
    }

    /// @notice 卖出代币换 BNB（受保交易入口）
    /// @param tokenIn 卖出的代币地址
    /// @param amountIn 卖出数量
    /// @param amountOutMin 最小 BNB 输出（滑点保护）
    /// @param deadline 交易截止时间
    /// @return tradeId 交易记录 ID
    function swapTokensForETH(
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline
    ) external nonReentrant returns (uint256 tradeId) {
        require(tokenIn != address(0), "zero token");
        require(amountIn > 0, "zero amount");
        require(deadline >= block.timestamp, "expired");

        // 先将用户代币转入本合约
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // 授权 PancakeRouter
        IERC20(tokenIn).safeApprove(address(pancakeRouter), amountIn);

        // 构建路径 [tokenIn, WBNB]
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = WBNB;

        // 调用 PancakeSwap，使用 try/catch 处理失败
        uint256 amountOut;
        try pancakeRouter.swapExactTokensForETH(
            amountIn,
            amountOutMin,
            path,
            address(this),
            deadline
        ) returns (uint256[] memory amounts) {
            require(amounts.length >= 2, "invalid amounts");
            amountOut = amounts[amounts.length - 1];
            require(amountOut > 0, "zero output");
        } catch {
            // Router 调用失败，退还用户代币
            IERC20(tokenIn).safeApprove(address(pancakeRouter), 0);
            IERC20(tokenIn).safeTransfer(msg.sender, amountIn);
            revert("swap failed, tokens refunded");
        }

        // 将 BNB 发送给用户
        (bool success, ) = payable(msg.sender).call{value: amountOut}("");
        require(success, "BNB transfer failed");

        // 记录交易
        tradeId = _recordTrade(
            msg.sender,
            tokenIn,
            address(0), // BNB
            amountIn,
            amountOut,
            false // isSell
        );

        return tradeId;
    }

    /// @notice 用代币买入代币（代币对交易，受保交易入口）
    /// @param tokenIn 输入代币
    /// @param amountIn 输入数量
    /// @param amountOutMin 最小输出
    /// @param path 交易路径
    /// @param deadline 截止时间
    /// @return tradeId 交易记录 ID
    function swapExactTokensForTokens(
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        uint256 deadline
    ) external nonReentrant returns (uint256 tradeId) {
        require(tokenIn != address(0), "zero token");
        require(amountIn > 0, "zero amount");
        require(path.length >= 2, "invalid path");
        require(path[0] == tokenIn, "path mismatch");
        require(deadline >= block.timestamp, "expired");

        // 转入用户代币
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).safeApprove(address(pancakeRouter), amountIn);

        // 调用 PancakeSwap，try/catch 处理失败
        uint256 amountOut;
        try pancakeRouter.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            address(this),
            deadline
        ) returns (uint256[] memory amounts) {
            require(amounts.length >= 2, "invalid amounts");
            amountOut = amounts[amounts.length - 1];
            require(amountOut > 0, "zero output");
        } catch {
            // 失败退还
            IERC20(tokenIn).safeApprove(address(pancakeRouter), 0);
            IERC20(tokenIn).safeTransfer(msg.sender, amountIn);
            revert("swap failed, tokens refunded");
        }

        // 发送输出代币给用户
        address tokenOut = path[path.length - 1];
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // 记录交易
        tradeId = _recordTrade(
            msg.sender,
            tokenIn,
            tokenOut,
            amountIn,
            amountOut,
            false // 代币对交易不标记为 buy（简化处理）
        );

        return tradeId;
    }

    // ============ 内部函数 ============

    /// @notice 记录交易
    /// @param trader 交易者
    /// @param tokenIn 输入代币
    /// @param tokenOut 输出代币
    /// @param amountIn 输入金额
    /// @param amountOut 输出金额
    /// @param isBuy 是否买入
    /// @return tradeId 交易 ID
    function _recordTrade(
        address trader,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        bool isBuy
    ) internal returns (uint256) {
        tradeCount++;
        uint256 tradeId = tradeCount;

        tradeRecords[tradeId] = TradeRecord({
            trader: trader,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            amountOut: amountOut,
            timestamp: block.timestamp,
            blockNumber: block.number,
            txHash: blockhash(block.number), // 记录区块哈希（简化，实际可记录 tx.hash）
            isBuy: isBuy,
            exists: true
        });

        userTrades[trader].push(tradeId);

        emit TradeExecuted(tradeId, trader, tokenIn, tokenOut, amountIn, amountOut, isBuy);

        return tradeId;
    }

    // ============ 查询函数 ============

    /// @notice 获取交易记录
    /// @param tradeId 交易 ID
    /// @return TradeRecord 交易记录
    function getTradeRecord(uint256 tradeId) external view returns (TradeRecord memory) {
        require(tradeRecords[tradeId].exists, "trade not found");
        return tradeRecords[tradeId];
    }

    /// @notice 获取用户的交易数量
    /// @param user 用户地址
    /// @return uint256 交易数量
    function getUserTradeCount(address user) external view returns (uint256) {
        return userTrades[user].length;
    }

    /// @notice 获取用户的指定交易 ID
    /// @param user 用户地址
    /// @param index 索引
    /// @return uint256 交易 ID
    function getUserTradeId(address user, uint256 index) external view returns (uint256) {
        require(index < userTrades[user].length, "index out of bounds");
        return userTrades[user][index];
    }

    // ============ 管理员函数 ============

    /// @notice 救援误锁定在合约中的代币
    /// @dev 仅 owner 可调用，用于救援用户误发送的代币
    /// @param token 代币地址（address(0) 表示 BNB）
    /// @param to 接收地址
    /// @param amount 救援数量
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "zero address");
        require(amount > 0, "zero amount");

        if (token == address(0)) {
            (bool success, ) = payable(to).call{value: amount}("");
            require(success, "BNB transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }

        emit TokensRescued(token, to, amount);
    }

    /// @notice 接收 BNB（PancakeSwap 转账时需要）
    receive() external payable {}
}
