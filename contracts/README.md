# InsurFi 合约模块清单

## 合约架构总览

```
contracts/
├── core/                    # 核心合约
│   ├── InsurToken.sol       # INSUR 代币合约
│   ├── InsurancePool.sol    # 保险资金池合约
│   ├── LossVerifier.sol     # 亏损校验器合约
│   ├── PolicyManager.sol    # 保单管理器合约
│   └── DEXAdapter.sol       # DEX 适配器合约
├── interfaces/              # 接口定义
│   ├── IInsurToken.sol
│   ├── IInsurancePool.sol
│   ├── ILossVerifier.sol
│   ├── IPolicyManager.sol
│   └── IDEXAdapter.sol
├── governance/              # 治理合约（迭代）
│   ├── Governor.sol
│   └── TimelockController.sol
├── mocks/                   # 测试用 Mock
│   ├── MockBEP20.sol
│   ├── MockDEX.sol
│   └── MockOracle.sol
└── utils/                   # 工具库
    ├── SafeBEP20.sol
    ├── ReentrancyGuard.sol
    └── AccessControl.sol
```

## 核心合约详细说明

### 1. InsurToken.sol — INSUR 代币合约

**职责**：INSUR BEP20 代币，带持仓快照功能

**状态变量**：
- `string public name = "InsurFi"`
- `string public symbol = "INSUR"`
- `uint8 public decimals = 18`
- `uint256 public totalSupply`
- `mapping(address => uint256) private _balances`
- `mapping(uint256 => mapping(address => uint256)) public snapshotBalances` // 区块号 => 用户 => 余额
- `mapping(address => uint256[]) public userSnapshotBlocks` // 用户快照区块号列表

**核心函数**：
- `balanceOf(address account) → uint256` — 查询当前余额
- `balanceOfAt(address account, uint256 blockNumber) → uint256` — 查询指定区块余额（快照）
- `transfer(address to, uint256 amount) → bool` — 转账（触发快照）
- `transferFrom(address from, address to, uint256 amount) → bool` — 授权转账
- `approve(address spender, uint256 amount) → bool` — 授权
- `_snapshot(address account)` — internal，记录当前区块持仓快照
- `mint(address to, uint256 amount)` — onlyOwner，铸造（初始分发用）

**关键设计**：
- 每次转账自动为交易双方记录当前区块快照
- 快照采用稀疏存储，仅在持仓变动时记录
- 查询历史余额时二分查找最近的快照记录

**依赖**：无外部依赖，纯 BEP20 + 快照

---

### 2. InsurancePool.sol — 保险资金池合约

**职责**：管理 BNB 保险资金，执行赔付支出

**状态变量**：
- `uint256 public totalDeposited` — 累计存入
- `uint256 public totalPaidOut` — 累计赔付
- `uint256 public payoutCount` — 赔付次数
- `mapping(address => uint256) public userTotalPayout` — 用户累计赔付额
- `mapping(bytes32 => bool) public processedTxHashes` — 已理赔交易哈希
- `address public lossVerifier` — 亏损校验器地址
- `address public policyManager` — 保单管理器地址
- `bool public paused` — 紧急暂停标志

**核心函数**：
- `deposit() external payable` — 存入 BNB（任何人可存）
- `payout(address user, uint256 amount, bytes32 txHash) external` — onlyLossVerifier，执行赔付
- `withdraw(uint256 amount) external` — onlyOwner，管理员提取资金
- `setLossVerifier(address _verifier) external` — onlyOwner
- `setPolicyManager(address _manager) external` — onlyOwner
- `togglePause() external` — onlyOwner，紧急暂停
- `getPoolBalance() → uint256` — 池当前 BNB 余额
- `isTxProcessed(bytes32 txHash) → bool` — 查询交易是否已理赔

**关键设计**：
- 赔付函数仅 LossVerifier 可调用，确保校验前置
- 赔付前检查池余额充足性
- 采用 ReentrancyGuard 防重入
- 赔付事件 `PayoutExecuted(user, amount, txHash, timestamp)`

**依赖**：ILossVerifier, IPolicyManager

---

### 3. LossVerifier.sol — 亏损校验器合约

**职责**：验证交易亏损真实性，计算赔付金额，触发赔付

**状态变量**：
- `address public insurToken` — INSUR 代币地址
- `address public insurancePool` — 保险池地址
- `address public policyManager` — 保单管理器地址
- `address public dexAdapter` — DEX 适配器地址
- `uint256 public payoutRatio` — 赔付比例（基点，如 5000 = 50%）
- `uint256 public minLossAmount` — 最小理赔亏损额（wei）
- `mapping(bytes32 => bool) public verifiedTx` — 已校验交易

**核心函数**：
- `verifyAndPayout(bytes32 txHash) external` — 用户提交交易哈希，校验并赔付
- `calculateLoss(bytes32 txHash) → (uint256 lossAmount, bool isValid)` — 计算交易亏损
- `setPayoutRatio(uint256 _ratio) external` — onlyOwner
- `setMinLossAmount(uint256 _amount) external` — onlyOwner
- `setDEXAdapter(address _adapter) external` — onlyOwner

**校验流程（internal）**：
1. `_checkTxNotProcessed(txHash)` — 检查未重复理赔
2. `_parseTradeData(txHash)` — 通过 DEXAdapter 解析交易数据
3. `_validateTradeSource(txHash)` — 校验交易来自白名单 DEX
4. `_calculateLossAmount(tradeData)` — 计算实际亏损金额
5. `_checkMinLoss(lossAmount)` — 检查达到最小理赔额
6. `_verifyPolicy(msg.sender, tradeData.blockNumber)` — 校验交易发生时保单有效
7. `_calculatePayoutAmount(lossAmount, user)` — 计算赔付金额
8. `_executePayout(msg.sender, payoutAmount, txHash)` — 调用保险池赔付

**关键设计**：
- 交易数据解析委托给 DEXAdapter，支持多 DEX 扩展
- 持仓快照校验通过 InsurToken 的 balanceOfAt 接口
- 赔付金额 = min(实际亏损 × 赔付比例, 用户保单保额上限)
- 校验失败 revert 并给出具体错误原因

**依赖**：IInsurToken, IInsurancePool, IPolicyManager, IDEXAdapter

---

### 4. PolicyManager.sol — 保单管理器合约

**职责**：管理用户保单状态，计算保额上限

**状态变量**：
- `address public insurToken` — INSUR 代币地址
- `uint256 public minHoldingThreshold` — 最小持仓阈值（激活保单）
- `uint256[] public holdingTiers` — 持仓分级区间
- `uint256[] public coverageTiers` — 对应保额上限
- `mapping(address => uint8) public userPolicyTier` — 用户保单等级
- `mapping(address => bool) public policyActive` — 保单是否激活

**核心函数**：
- `getPolicyStatus(address user) → (bool isActive, uint8 tier, uint256 coverageLimit)` — 查询保单状态
- `isPolicyActiveAt(address user, uint256 blockNumber) → bool` — 查询指定区块时保单是否有效
- `getCoverageLimit(address user) → uint256` — 查询用户保额上限
- `updatePolicyStatus(address user) external` — 更新用户保单状态（持仓变动后调用）
- `setMinHoldingThreshold(uint256 _threshold) external` — onlyOwner
- `setTiers(uint256[] _holdings, uint256[] _coverages) external` — onlyOwner

**保额计算逻辑**：
```
用户持仓量 → 匹配 holdingTiers 区间 → 取对应 coverageTiers 值
例：
  持仓 < 1000 INSUR → 不激活
  1000 ≤ 持仓 < 5000 → 保额 0.1 BNB
  5000 ≤ 持仓 < 20000 → 保额 0.5 BNB
  持仓 ≥ 20000 → 保额 2 BNB
```

**关键设计**：
- 保单状态基于当前持仓实时计算，无需手动激活
- 历史保单有效性通过持仓快照 + 阈值判断
- 分级参数可通过治理调整

**依赖**：IInsurToken

---

### 5. DEXAdapter.sol — DEX 适配器合约

**职责**：统一解析不同 DEX 的交易数据

**状态变量**：
- `mapping(address => bool) public supportedDEX` — 支持的 DEX 合约地址白名单
- `address[] public dexList` — DEX 地址列表

**核心函数**：
- `parseTrade(bytes32 txHash) → (TradeInfo memory)` — 解析交易信息
- `isSupportedDEX(address dex) → bool` — 查询是否支持的 DEX
- `addSupportedDEX(address dex) external` — onlyOwner
- `removeSupportedDEX(address dex) external` — onlyOwner
- `getSupportedDEXs() → address[]` — 获取所有支持的 DEX

**TradeInfo 结构体**：
```solidity
struct TradeInfo {
    address trader;        // 交易者地址
    address dex;           // DEX 合约地址
    address tokenIn;       // 买入代币
    address tokenOut;      // 卖出代币
    uint256 amountIn;      // 投入金额
    uint256 amountOut;     // 收到金额
    uint256 blockNumber;   // 交易区块号
    uint256 timestamp;     // 交易时间戳
    bool isBuy;            // 是否买入（BNB → token）
}
```

**关键设计**：
- 初期硬编码 PancakeSwap V2 Pair 的 Swap 事件解析
- 通过 txReceipt 的 logs 解析交易事件
- 支持多 DEX 扩展，新增 DEX 只需添加地址 + 对应解析逻辑
- 仅解析白名单 DEX 的交易，防伪造

**依赖**：无外部合约依赖，纯数据解析

---

## 接口合约（interfaces/）

| 接口文件 | 定义内容 |
|---------|---------|
| IInsurToken.sol | balanceOf, balanceOfAt, totalSupply, transfer |
| IInsurancePool.sol | deposit, payout, getPoolBalance, isTxProcessed |
| ILossVerifier.sol | verifyAndPayout, calculateLoss |
| IPolicyManager.sol | getPolicyStatus, isPolicyActiveAt, getCoverageLimit |
| IDEXAdapter.sol | parseTrade, isSupportedDEX, getSupportedDEXs |

## 部署顺序

1. **InsurToken.sol** — 部署并铸造初始总量
2. **PolicyManager.sol** — 部署，设置 INSUR 代币地址和分级参数
3. **DEXAdapter.sol** — 部署，添加 PancakeSwap 等 DEX 白名单
4. **InsurancePool.sol** — 部署，设置 LossVerifier 和 PolicyManager 地址（先占位后更新）
5. **LossVerifier.sol** — 部署，设置各依赖合约地址
6. **回连配置** — 更新 InsurancePool 的 LossVerifier 地址为实际部署地址
7. **初始注资** — 向 InsurancePool 存入测试 BNB

## 安全依赖

- 所有合约继承 OpenZeppelin 的 AccessControl / ReentrancyGuard
- 核心参数变更需 onlyOwner
- 迭代阶段引入 Timelock + 多签治理
