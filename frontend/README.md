# InsurFi DApp 前端页面清单

## 技术栈

- **框架**：Next.js 14 (App Router) + TypeScript
- **Web3**：wagmi v2 + viem
- **样式**：Tailwind CSS + shadcn/ui
- **状态管理**：TanStack Query + Zustand
- **钱包**：MetaMask / WalletConnect / Binance Web3 Wallet
- **图表**：Recharts

## 目录结构

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router 页面
│   │   ├── layout.tsx          # 全局布局（导航栏 + 钱包连接）
│   │   ├── page.tsx            # 首页 / Landing
│   │   ├── dashboard/          # 保险看板
│   │   │   └── page.tsx
│   │   ├── claim/              # 理赔申请
│   │   │   └── page.tsx
│   │   ├── pool/               # 保险池
│   │   │   └── page.tsx
│   │   ├── stake/              # 质押挖矿（迭代）
│   │   │   └── page.tsx
│   │   ├── governance/         # 治理（迭代）
│   │   │   └── page.tsx
│   │   └── docs/               # 文档
│   │       └── page.tsx
│   ├── components/             # 通用组件
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── WalletButton.tsx
│   │   ├── ui/                 # shadcn/ui 基础组件
│   │   ├── insurance/
│   │   │   ├── PolicyCard.tsx
│   │   │   ├── ClaimForm.tsx
│   │   │   ├── PoolStats.tsx
│   │   │   └── ClaimHistory.tsx
│   │   └── common/
│   │       ├── TokenIcon.tsx
│   │       ├── CopyAddress.tsx
│   │       └── TxHashLink.tsx
│   ├── hooks/                  # 自定义 hooks
│   │   ├── useInsurance.ts
│   │   ├── usePolicy.ts
│   │   ├── useClaim.ts
│   │   ├── usePool.ts
│   │   └── useTokenBalance.ts
│   ├── utils/                  # 工具函数
│   │   ├── web3.ts             # wagmi 配置
│   │   ├── contracts.ts        # 合约地址 + ABI
│   │   ├── format.ts           # 金额格式化
│   │   └── constants.ts        # 常量定义
│   ├── stores/                 # Zustand 状态
│   │   └── walletStore.ts
│   └── types/                  # TypeScript 类型
│       ├── insurance.ts
│       └── policy.ts
├── public/
│   ├── images/
│   └── favicon.ico
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## 页面详细说明

### 1. 首页 / Landing (`/`)

**目的**：项目介绍、核心数据展示、引导用户参保

**模块**：
- **Hero 区**：项目标语 + 核心价值主张 + 「立即参保」CTA 按钮
- **核心机制说明**：三步图解（持仓 → 交易亏损 → 自动赔付）
- **实时数据面板**：
  - TVL（保险池 BNB 余额）
  - 累计赔付金额
  - 赔付次数
  - INSUR 价格 + 市值
- **工作原理**：架构图 + 流程说明
- **路线图**：Phase 1-4 时间线
- **FAQ**：常见问题
- **Footer**：合约地址、社交链接、审计状态

**交互**：
- 连接钱包后显示用户保单状态摘要
- 「立即参保」跳转到 Dashboard 或 PancakeSwap 购买 INSUR

---

### 2. 保险看板 Dashboard (`/dashboard`)

**目的**：用户保单状态、持仓信息、保额、理赔历史

**模块**：
- **保单状态卡片**：
  - 保单状态（未激活/已激活/已暂停）
  - 当前 INSUR 持仓量
  - 持仓等级（Tier）
  - 保额上限（BNB）
  - 累计已获赔付（BNB）
- **持仓进度条**：距下一等级持仓差额 + 升级后保额
- **快捷操作**：
  - 「购买 INSUR」（跳转 PancakeSwap）
  - 「申请理赔」（跳转 Claim 页）
- **理赔历史列表**：
  - 交易哈希（链接 BscScan）
  - 亏损金额
  - 赔付金额
  - 理赔时间
  - 状态（成功/处理中/失败）
- **持仓变化图表**：近 30 天 INSUR 持仓量走势

**交互**：
- 未连接钱包 → 提示连接
- 保单未激活 → 显示激活条件 + 购买引导
- 理赔历史支持分页 + 筛选

---

### 3. 理赔申请 Claim (`/claim`)

**目的**：用户提交交易哈希申请理赔

**模块**：
- **理赔申请表单**：
  - 交易哈希输入框（支持粘贴 + 从 BscScan 链接自动提取）
  - 「校验交易」按钮
- **交易预览（校验后显示）**：
  - DEX 名称
  - 交易对
  - 交易方向（买入/卖出）
  - 投入金额 / 收到金额
  - 亏损金额
  - 交易区块 / 时间
  - 交易时保单状态（有效/无效）
- **赔付预估**：
  - 亏损金额
  - 赔付比例
  - 预计赔付金额（BNB）
  - 保额上限检查
- **「确认理赔」按钮**：
  - 连接钱包 → 调用合约 verifyAndPayout
  - 交易确认中状态
  - 成功后显示赔付到账 + 交易哈希
- **理赔指南**：
  - 支持的 DEX 列表
  - 理赔条件说明
  - 常见失败原因

**交互**：
- 输入 txHash 后自动校验格式
- 实时显示校验进度（解析交易 → 校验 DEX → 计算亏损 → 校验保单 → 计算赔付）
- 校验失败显示具体原因 + 修复建议
- 理赔成功后自动刷新 Dashboard 理赔历史

---

### 4. 保险池 Pool (`/pool`)

**目的**：保险池资金状况、赔付统计、资金注入

**模块**：
- **池资金概览**：
  - 当前池余额（BNB）
  - 累计存入
  - 累计赔付
  - 赔付率（累计赔付 / 累计存入）
  - 偿付能力比率（池余额 / 潜在赔付额）
- **资金变化图表**：
  - 池余额历史走势（近 30 天）
  - 每日赔付金额柱状图
- **最近赔付记录**：
  - 用户地址（脱敏）
  - 赔付金额
  - 交易哈希
  - 时间
- **资金注入区**：
  - 「存入 BNB」按钮（支持 LP 存款，迭代）
  - 存入金额输入
  - 交易确认
- **池参数**：
  - 赔付比例
  - 最小理赔额
  - 支持的 DEX 数量

**交互**：
- 池余额实时刷新（每区块）
- 偿付能力比率低于阈值时显示警告
- 任何人可存入 BNB（无权限限制）

---

### 5. 质押挖矿 Stake (`/stake`) — 迭代功能

**目的**：INSUR 质押、收益查看、领取

**模块**：
- 质押池信息（APY、总质押量、剩余奖励）
- 用户质押余额 + 待领取收益
- 质押/取消质押操作
- 收益领取
- 质押历史记录

---

### 6. 治理 Governance (`/governance`) — 迭代功能

**目的**：提案列表、投票、参数查看

**模块**：
- 活跃提案列表（标题、状态、投票进度、截止时间）
- 提案详情（描述、投票选项、投票结果）
- 投票操作（连接钱包 → 选择选项 → 确认）
- 用户投票权（INSUR 持仓量）
- 历史提案记录
- 可治理参数列表及当前值

---

### 7. 文档 Docs (`/docs`)

**目的**：项目文档、白皮书、合约地址

**模块**：
- 文档侧边栏导航
- 白皮书在线阅读 / PDF 下载
- 合约地址列表（带 BscScan 链接）
- 开发者文档（合约接口、前端集成指南）
- 审计报告

## 通用组件

| 组件 | 用途 |
|------|------|
| Navbar | 顶部导航栏，含 Logo、菜单、钱包连接按钮 |
| WalletButton | 钱包连接/断开/切换网络/显示地址和余额 |
| Footer | 页脚，合约地址、社交链接 |
| PolicyCard | 保单状态展示卡片 |
| ClaimForm | 理赔申请表单 |
| PoolStats | 保险池数据统计展示 |
| ClaimHistory | 理赔历史列表 |
| TokenIcon | 代币图标（INSUR / BNB） |
| CopyAddress | 地址复制组件 |
| TxHashLink | 交易哈希链接（BscScan） |

## 自定义 Hooks

| Hook | 功能 |
|------|------|
| useInsurance | 保险相关合约调用封装 |
| usePolicy | 用户保单状态查询 |
| useClaim | 理赔提交与状态查询 |
| usePool | 保险池数据查询 |
| useTokenBalance | 代币余额查询（INSUR / BNB） |

## 合约配置

`src/utils/contracts.ts` 中维护：
- BSC Mainnet / Testnet 合约地址
- 各合约 ABI（从 artifacts 导入）
- DEX 合约地址（PancakeSwap Router / Factory）
- INSUR 代币合约地址

## 环境变量

```
NEXT_PUBLIC_BSC_RPC_URL=          # BSC RPC 节点
NEXT_PUBLIC_CHAIN_ID=56            # 主网 56 / 测试网 97
NEXT_PUBLIC_INSUR_ADDRESS=         # INSUR 代币合约地址
NEXT_PUBLIC_POOL_ADDRESS=          # 保险池合约地址
NEXT_PUBLIC_VERIFIER_ADDRESS=      # 亏损校验器地址
NEXT_PUBLIC_POLICY_ADDRESS=        # 保单管理器地址
NEXT_PUBLIC_DEX_ADAPTER_ADDRESS=   # DEX 适配器地址
```
