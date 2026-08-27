# InsurFi 白皮书

> BSC 链上面向合约交易者的交易亏损保险 DeFi 协议

**版本**：v1.0  
**日期**：2026 年 8 月  
**网络**：BNB Chain (BSC)

---

## 摘要

InsurFi 是 BSC 链上首个面向合约交易者的交易亏损保险 DeFi 协议。与传统保险产品不同，InsurFi 采用「持仓即参保」机制——用户持有一定数量的 `INSUR` 代币即可自动激活保险保单，无需额外支付保费。用户通过 InsurFi DEX 代理合约进行链上交易，产生亏损后提交买卖交易对，系统通过链上交易记录自动校验亏损真实性，校验通过后保险池以 BNB 直接赔付到用户钱包。

InsurFi 的核心创新在于：

1. **零摩擦参保**：持有代币即激活保单，无需购买保险产品、无需 KYC、无需人工审核
2. **链上自动校验**：亏损数据通过链上交易记录自动验证，透明可信，杜绝骗保
3. **即时赔付**：校验通过后 BNB 直接转账到用户钱包，无需等待提现周期
4. **防骗保机制**：持仓快照确保交易发生时保单已激活，防止「亏损后买入代币骗保」

InsurFi 的长期愿景是成为 DeFi 领域的模块化保险基础设施，对外输出保险模块供其他 DeFi 项目集成，最终成为 Web3 世界的保险中间件层。

---

## 1. 引言

### 1.1 背景

DeFi 交易市场在过去几年经历了爆发式增长。根据 DeFiLlama 数据，截至 2026 年，BSC 链上 DEX 日交易量持续维持在数十亿美元级别，数百万交易者在链上进行现货、杠杆及永续合约交易。

然而，链上交易者面临一个长期未被解决的痛点：**交易亏损没有任何风险对冲工具**。传统金融市场中，投资者可以通过期权、保险等金融产品对冲亏损风险，但在 DeFi 领域，这类产品几乎空白。

### 1.2 问题陈述

当前 DeFi 保险领域存在以下问题：

**现有保险项目不覆盖交易亏损**  
Nexus Mutual、InsurAce 等主流 DeFi 保险项目主要聚焦于智能合约风险、预言机故障风险，不覆盖用户的交易亏损。交易者在 DEX 上因价格波动产生的损失，没有任何保险产品可以提供保障。

**中心化交易所保险产品透明度低**  
部分中心化交易所推出了「交易保险」产品，但这些产品存在以下问题：保费高昂、赔付条件苛刻、资金池不透明、存在中心化风险。用户无法验证保险资金是否真实存在，也无法确认赔付规则是否被公平执行。

**链上保险的技术挑战**  
在 EVM 链上实现交易亏损保险面临技术难题：智能合约无法直接读取历史交易日志，无法验证用户的真实亏损金额。这导致传统的「用户提交交易哈希，合约校验亏损」方案在技术上不可行。

### 1.3 解决方案

InsurFi 通过以下创新设计解决上述问题：

**DEX 代理合约记录交易**  
用户通过 InsurFi 的 DEX 代理合约与 PancakeSwap 等 DEX 交互。代理合约在执行交易的同时，将每笔交易的详细信息（交易者、代币对、方向、金额、区块号）存储到合约存储中。这样，LossVerifier 合约可以直接从存储中读取交易数据，无需解析历史日志。

**持仓快照防骗保**  
InsurToken 合约记录每个地址在每个区块的持仓快照。理赔时，PolicyManager 校验用户在卖出交易发生区块的持仓是否达标，确保用户在交易发生时已经持有有效保单，杜绝「亏损后买入代币骗保」的攻击。

**买卖配对计算亏损**  
用户提交买入交易 ID 和卖出交易 ID，LossVerifier 从 DEXRouter 存储中读取两笔交易，计算 ETH 投入与 ETH 收回的差额即为亏损金额。这种设计简单、高效、完全链上可验证。

---

## 2. 系统架构

InsurFi 采用三层解耦架构：代币层 → 保险池层 → DApp 前端层。各层通过标准接口交互，支持独立升级和迭代。

```
┌─────────────────────────────────────────────────────┐
│                   DApp 前端层                         │
│   首页 / 保单看板 / 理赔申请 / 保险池 / 治理 / 文档    │
│   Next.js + wagmi + Tailwind CSS                     │
├─────────────────────────────────────────────────────┤
│                   保险池层                            │
│   ┌──────────┐ ┌──────────────┐ ┌───────────────┐  │
│   │Insurance │ │ LossVerifier │ │ PolicyManager │  │
│   │  Pool    │ │   亏损校验器  │ │  保单管理器    │  │
│   └──────────┘ └──────────────┘ └───────────────┘  │
│   ┌──────────┐                                        │
│   │ DEXRouter│  PancakeSwap 代理 + 交易记录           │
│   └──────────┘                                        │
├─────────────────────────────────────────────────────┤
│                   代币层                              │
│   InsurToken (BEP20 + 地址级持仓快照)                 │
└─────────────────────────────────────────────────────┘
```

### 2.1 代币层

代币层的核心是 `InsurToken` 合约，一个 BEP20 兼容的代币合约，带有地址级持仓快照功能。

**持仓快照机制**  
每次代币转账时，InsurToken 为交易双方记录当前区块号和余额。查询历史余额时，通过二分查找找到最接近目标区块的快照记录。这使得 PolicyManager 可以校验用户在任意历史区块的持仓状态。

**快照存储结构**  
```
mapping(address => uint256[]) private _snapshotBlocks;  // 每个地址的快照区块号列表
mapping(address => mapping(uint256 => uint256)) private _snapshotBalances;  // 区块号 => 余额
```

### 2.2 保险池层

保险池层包含 4 个核心合约：

**InsurancePool（保险资金池）**  
持有 BNB 保险资金，仅 LossVerifier 可触发赔付。支持存款、赔付、管理员提取、紧急暂停。所有赔付操作使用 ReentrancyGuard 防重入。

**LossVerifier（亏损校验器）**  
理赔核心合约。接收用户提交的买卖交易 ID 对，执行 10 步校验流程：
1. 检查理赔未重复处理
2. 从 DEXRouter 读取买卖交易数据
3. 校验两笔交易都属于调用者
4. 校验买入是 ETH→Token，卖出是 Token→ETH
5. 校验代币对匹配
6. 校验买入早于卖出
7. 计算亏损金额（ETH 投入 - ETH 收回）
8. 校验亏损达到最小理赔额
9. 校验卖出时保单有效（持仓快照）
10. 计算赔付金额并调用 InsurancePool 赔付

**PolicyManager（保单管理器）**  
管理用户保单状态。根据 INSUR 持仓量自动判定保单是否激活，并映射到对应的保额等级。支持三级保单：基础版（1000+ INSUR，0.1 BNB 保额）、进阶版（5000+ INSUR，0.5 BNB 保额）、尊享版（20000+ INSUR，2 BNB 保额）。

**DEXRouter（DEX 代理）**  
PancakeSwap 代理合约。用户通过此合约进行交易，每笔交易被记录到链上存储。支持 ETH→Token 和 Token→ETH 两种交易方向。交易记录包含唯一 tradeId，供 LossVerifier 读取。

### 2.3 DApp 前端层

前端采用 Next.js 14 App Router + TypeScript + wagmi v2 + Tailwind CSS 技术栈，提供 7 个核心页面：

| 页面 | 路径 | 功能 |
|------|------|------|
| 首页 | `/` | 项目介绍、实时数据、工作原理、核心优势 |
| 保单看板 | `/dashboard` | 保单状态、持仓、保额、理赔历史 |
| 理赔申请 | `/claim` | 三步理赔流程、交易校验、赔付确认 |
| 保险池 | `/pool` | 池余额、赔付统计、健康度、池参数 |
| 质押挖矿 | `/stake` | INSUR 质押、收益查看（迭代） |
| 治理 | `/governance` | 提案列表、投票（迭代） |
| 文档 | `/docs` | 白皮书、合约地址、开发者文档 |

---

## 3. 核心机制

### 3.1 持仓即参保机制

**参保条件**  
用户钱包中持有至少 1,000 INSUR 代币时，保单自动激活。无需手动购买保险、无需支付保费、无需 KYC。

**保单状态机**  
```
INACTIVE（未激活）→ 持仓 ≥ 1000 INSUR → ACTIVE（已激活）
ACTIVE → 持仓 < 1000 INSUR → INACTIVE
ACTIVE → 保险池暂停 → SUSPENDED（已暂停）
```

**持仓变动对保单的影响**  
保单状态基于当前持仓实时计算。用户买入 INSUR 达到阈值后保单立即激活；卖出 INSUR 低于阈值后保单立即失效。但已发生的理赔不受后续持仓变动影响——理赔校验的是交易发生时的持仓快照，而非当前持仓。

### 3.2 链上亏损校验机制

**交易数据来源**  
用户必须通过 InsurFi DEXRouter 代理合约进行交易。DEXRouter 在执行交易的同时，将交易详情存储到链上：
```solidity
struct Trade {
    uint256 id;           // 唯一交易 ID
    address trader;       // 交易者地址
    address tokenIn;      // 投入代币
    address tokenOut;     // 收到代币
    uint256 amountIn;     // 投入金额
    uint256 amountOut;    // 收到金额
    uint256 blockNumber;  // 交易区块号
    uint256 timestamp;    // 交易时间戳
    bool isBuy;           // true=ETH→Token, false=Token→ETH
}
```

**亏损金额计算**  
用户提交买入交易 ID（buyTradeId）和卖出交易 ID（sellTradeId）。LossVerifier 读取两笔交易：
- 买入交易：`amountIn` = ETH 投入金额
- 卖出交易：`amountOut` = ETH 收回金额
- 亏损金额 = `buyTrade.amountIn - sellTrade.amountOut`（仅当结果为正时）

**校验流程**  
1. 交易所有权校验：两笔交易都必须属于调用者
2. 交易方向校验：买入必须是 ETH→Token，卖出必须是 Token→ETH
3. 代币对校验：买入的 tokenOut 必须等于卖出的 tokenIn
4. 时序校验：买入区块号必须小于卖出区块号
5. 亏损校验：ETH 投入必须大于 ETH 收回
6. 最小亏损校验：亏损金额必须 ≥ 0.001 BNB

### 3.3 赔付机制

**赔付金额计算公式**  
```
赔付金额 = min(实际亏损 × 赔付比例, 保单保额上限)
```

**参数说明**  
- 实际亏损：买入 ETH 投入 - 卖出 ETH 收回
- 赔付比例：默认 50%（5000 基点），可通过治理调整
- 保单保额上限：根据用户 INSUR 持仓等级确定（0.1 / 0.5 / 2 BNB）

**赔付执行流程**  
1. LossVerifier 校验通过后，标记 claimId 为已处理
2. 调用 InsurancePool.payout(user, payoutAmount, claimId)
3. InsurancePool 校验调用者是 LossVerifier、池余额充足、理赔未重复
4. 执行 BNB 转账到用户钱包
5. 记录赔付事件，更新累计赔付统计

**赔付资金来源**  
- 项目方初始注资
- INSUR 交易税分红（迭代功能）
- 流动性提供者存款（迭代功能）

### 3.4 防骗保机制

InsurFi 设计了四重防骗保机制：

**第一重：持仓快照防事后参保**  
理赔时校验用户在**卖出交易发生区块**的 INSUR 持仓快照，而非当前持仓。这意味着用户必须在交易发生前就已经持有足够的 INSUR。交易亏损后再买入 INSUR 无法获得理赔——因为卖出区块的持仓快照显示持仓不足。

**第二重：交易哈希去重防重复理赔**  
每对买卖交易生成唯一的 claimId = keccak256(user, buyTradeId, sellTradeId)。理赔后 claimId 被标记为已处理，同一对交易无法重复理赔。

**第三重：DEX 白名单防伪造交易**  
只有通过 InsurFi DEXRouter 代理的交易才会被记录到链上存储。用户无法伪造交易记录，因为所有交易数据都来自合约存储，而非用户提交。

**第四重：赔付上限防恶意套利**  
- 单笔赔付上限：受保单保额上限限制（最高 2 BNB）
- 亏损门槛：低于 0.001 BNB 的亏损不予理赔
- 赔付比例：默认只赔付亏损的 50%，降低套利动机

---

## 4. 代币经济学

### 4.1 INSUR 代币基本信息

| 属性 | 值 |
|------|-----|
| 代币名称 | InsurFi |
| 代币符号 | INSUR |
| 标准 | BEP20 (BSC) |
| 精度 | 18 |
| 初始总量 | 100,000,000 (1 亿) |
| 网络 | BNB Chain |

### 4.2 代币分配方案

| 分配类别 | 比例 | 数量 | 解锁计划 |
|---------|------|------|---------|
| 团队 & 顾问 | 15% | 15,000,000 | 6 个月悬崖 + 24 个月线性解锁 |
| 生态 & 社区激励 | 30% | 30,000,000 | 48 个月线性释放，用于流动性挖矿、交易奖励、社区活动 |
| 流动性 | 15% | 15,000,000 | TGE 时 50% 注入 PancakeSwap 流动性，剩余 12 个月线性注入 |
| 私募 & 公募 | 20% | 20,000,000 | 私募 3 个月悬崖 + 12 个月解锁；公募 TGE 释放 30%，剩余 6 个月解锁 |
| 储备金 | 10% | 10,000,000 | 多签托管，用于应急、战略合作、未来融资 |
| 保险池注资 | 10% | 10,000,000 | TGE 时兑换为 BNB 注入保险池，或作为保险池背书 |

### 4.3 代币用途

**参保凭证**  
持有 INSUR 是激活保险保单的唯一条件。持仓量决定保单等级和保额上限。这是 INSUR 最核心的价值捕获机制——保险需求驱动代币需求。

**治理权益**  
INSUR 持有者拥有协议治理投票权，可投票决定：
- 赔付比例调整
- 保额上限调整
- 最小持仓阈值调整
- DEX 白名单管理
- 保险池参数调整
- 新增保险产品类型

**质押收益（迭代）**  
用户可将 INSUR 质押到质押池，获得协议收益分红。质押资金同时作为保险池的额外背书，提升协议偿付能力。

**手续费折扣（迭代）**  
持有 INSUR 的用户在 DEXRouter 交易时可享受手续费折扣，降低交易成本。

### 4.4 价值捕获机制

**交易税分红注入保险池**  
INSUR 代币转账征收 2% 交易税，其中 1% 注入保险池作为赔付资金，1% 回购销毁。这形成了「代币交易活跃 → 保险池资金增加 → 保险能力增强 → 代币需求增加」的正向循环。

**保险池收益分配**  
保险池闲置资金可投入低风险收益策略（如 Venus 借贷、Beefy 机枪池），收益的 50% 分配给 INSUR 质押者，30% 注入保险池，20% 用于团队运营。

**代币销毁机制**  
- 交易税的 1% 用于回购销毁
- 保险池超额收益的 20% 用于回购销毁
- 未使用的生态激励代币在周期结束后销毁

### 4.5 供需模型分析

**需求驱动因素**  
1. 保险需求：交易者为获得亏损保障而持有 INSUR
2. 治理需求：持有者参与协议决策
3. 质押收益：质押 INSUR 获得被动收益
4. 投机需求：代币价值增长预期
5. 手续费折扣：持有 INSUR 降低交易成本

**供给控制机制**  
1. 初始总量固定 1 亿，无增发机制
2. 交易税回购销毁持续减少流通量
3. 质押锁定减少市场流通量
4. 团队/私募/生态代币有解锁悬崖，避免短期抛压

**长期价值支撑**  
INSUR 的长期价值由协议的保险业务规模支撑。保险池 TVL 越大、赔付次数越多，说明协议使用量越高，代币需求越旺盛。同时，交易税和保险池收益形成持续的销毁和分红压力，支撑代币价值。

---

## 5. 保险池模型

### 5.1 资金池结构

InsurancePool 合约是 InsurFi 协议的资金核心，持有所有 BNB 保险资金。资金池采用「多方注资、统一管理、透明赔付」的模式。

**资金来源构成**  

| 来源 | 阶段 | 说明 |
|------|------|------|
| 项目方初始注资 | MVP | TGE 时注入，作为初始赔付资金 |
| INSUR 交易税分红 | 迭代 | 代币转账税的 1% 自动注入 |
| LP 存款 | 迭代 | 用户可存入 BNB 获得收益凭证 |
| 保险池收益 | 迭代 | 闲置资金低风险收益再投入 |
| 战略合作注资 | 远景 | 合作伙伴资金注入 |

**资金管理策略**  
- 赔付准备金：池余额的 60% 保持流动性，随时可用于赔付
- 收益配置：池余额的 40% 可投入低风险收益策略（Venus、Beefy 等）
- 动态调整：根据赔付率和池余额动态调整收益配置比例

### 5.2 定价模型

InsurFi 的保险定价采用「持仓分级 + 比例赔付」模式，而非传统保险的精算定价。这种设计简单透明，易于链上执行。

**赔付比例**  
默认赔付比例为 50%（即赔付实际亏损的一半）。赔付比例可通过治理投票调整，范围 10%-80%。

**保额与持仓映射曲线**  

| 保单等级 | INSUR 持仓门槛 | 单笔赔付上限 | 目标用户 |
|---------|---------------|-------------|---------|
| 基础版 | ≥ 1,000 INSUR | 0.1 BNB | 小额交易者 |
| 进阶版 | ≥ 5,000 INSUR | 0.5 BNB | 中额交易者 |
| 尊享版 | ≥ 20,000 INSUR | 2 BNB | 大额交易者 |

**风险定价参数**  
- 最小亏损门槛：0.001 BNB（低于此金额不予理赔，降低 gas 成本和小额套利）
- 赔付比例：50%（用户自担一半亏损，降低道德风险）
- 单笔上限：受保单等级限制（控制单笔赔付风险）

### 5.3 偿付能力管理

**偿付能力比率**  
```
偿付能力比率 = 池余额 / 潜在赔付总额
```
潜在赔付总额 = 所有活跃保单的保额上限之和。当偿付能力比率低于 100% 时，触发预警机制。

**资金池预警机制**  

| 预警等级 | 偿付能力比率 | 触发动作 |
|---------|-------------|---------|
| 绿色 | ≥ 150% | 正常运营 |
| 黄色 | 100%-150% | 暂停新增 LP 收益分配，增加注资激励 |
| 橙色 | 50%-100% | 降低赔付比例至 30%，启动紧急注资 |
| 红色 | < 50% | 紧急暂停赔付，启动治理投票决定后续方案 |

**极端情况应对**  
- 黑天鹅事件导致大规模赔付：启动紧急暂停，由治理投票决定是否动用储备金或启动 INSUR 回购注入
- 池余额耗尽：暂停新理赔，已确认理赔按比例分配，后续注资后补足
- 智能合约漏洞：紧急暂停所有操作，启动漏洞赏金和修复流程

### 5.4 资金收益策略（迭代）

保险池闲置资金可投入以下低风险收益策略：

1. **Venus 借贷**：将 BNB 存入 Venus 借贷市场，获得存款利息。风险极低，流动性高。
2. **Beefy 机枪池**：将 BNB 投入 Beefy 的低风险机枪池，自动复投收益。风险较低。
3. **PancakeSwap 稳定币流动性**：将部分资金转换为稳定币，提供 PancakeSwap 稳定币对流动性，获得交易手续费收益。

收益分配比例：
- 50% 分配给 INSUR 质押者
- 30% 注入保险池（增强偿付能力）
- 20% 用于团队运营和开发

---

## 6. 治理机制

### 6.1 治理架构

InsurFi 采用「代币投票 + Timelock + 多签」的三层治理架构，确保治理过程透明、安全、可追溯。

**治理代币与投票权**  
- INSUR 是唯一治理代币
- 投票权 = 持仓量（1 INSUR = 1 票）
- 质押中的 INSUR 同样享有投票权
- 不支持委托投票（MVP 阶段），后续迭代支持

**提案类型**  

| 提案类型 | 说明 | 执行延迟 |
|---------|------|---------|
| 参数调整 | 赔付比例、保额上限、最小持仓阈值等 | 24 小时 |
| 合约升级 | 核心合约逻辑升级 | 48 小时 |
| 资金管理 | 保险池资金配置、收益策略调整 | 24 小时 |
| 紧急提案 | 紧急暂停、漏洞修复 | 6 小时（需多签加速） |

**投票规则**  
- 提案门槛：提交提案需持有至少 50,000 INSUR（或等值质押）
- 投票周期：72 小时
- 通过条件：赞成票 > 反对票，且赞成票 ≥ 总供应量的 5%
- 投票方式：链上投票，不可更改

### 6.2 可治理参数

以下参数可通过治理投票调整：

| 参数 | 当前值 | 可调范围 | 所在合约 |
|------|--------|---------|---------|
| 赔付比例 | 50% | 10%-80% | LossVerifier |
| 最小亏损门槛 | 0.001 BNB | 0.0001-0.1 BNB | LossVerifier |
| 最小持仓阈值 | 1,000 INSUR | 100-50,000 INSUR | PolicyManager |
| 保单分级配置 | 三级 | 可增减等级 | PolicyManager |
| DEX 白名单 | PancakeSwap | 可增删 | DEXRouter |
| 紧急暂停 | 关闭 | 开关 | InsurancePool |
| 交易税率 | 2% | 0%-5% | InsurToken（迭代） |

### 6.3 治理执行

**Timelock 机制**  
所有治理提案通过后，需经过 Timelock 延迟才能执行。延迟期内，任何人都可以审查提案内容，发现问题可发起紧急暂停。

**多签确认**  
- 核心合约升级：需 3/5 多签确认
- 资金管理操作：需 2/5 多签确认
- 紧急操作：需 4/5 多签确认，可跳过 Timelock

**紧急权限与暂停**  
- 多签钱包拥有紧急暂停权限，可在异常情况下立即暂停赔付
- 暂停后需治理投票决定恢复或进一步操作
- 暂停期间不允许新理赔，但已确认理赔仍可执行

---

## 7. 安全与审计

### 7.1 安全设计原则

InsurFi 合约开发遵循以下安全设计原则：

**最小权限原则**  
每个合约只拥有完成其功能所需的最小权限。例如，InsurancePool 仅 LossVerifier 可调用赔付，LossVerifier 无法直接操作池资金，只能调用赔付接口。

**防御纵深设计**  
关键操作设置多重防护：
- 赔付操作：onlyVerifier + whenNotPaused + nonReentrant + 余额检查 + 去重检查
- 管理员操作：onlyOwner + 多签（迭代）+ Timelock（迭代）
- 资金提取：onlyOwner + nonReentrant + 余额检查

**可组合性安全**  
- 所有外部调用使用 low-level call，避免外部合约 revert 导致本合约卡住
- 外部调用后严格检查返回值
- 不依赖外部合约的返回值做关键状态变更

### 7.2 核心安全机制

**访问控制**  
- Ownable：合约所有者权限管理
- AccessControl：多角色权限管理（迭代）
- 多签钱包：核心操作需多签确认（迭代）

**防重入保护**  
- InsurancePool 的 payout 和 withdraw 函数使用 ReentrancyGuard
- 遵循 Checks-Effects-Interactions 模式：先检查条件，再更新状态，最后执行外部调用

**整数安全**  
- 使用 Solidity 0.8.x 内置整数溢出检查
- 关键计算使用 unchecked 块优化 gas（仅在确认安全的情况下）
- 金额计算统一使用 wei 单位，避免精度问题

**紧急暂停**  
- Circuit Breaker 机制，异常时可暂停所有赔付操作
- 暂停后仅允许管理员提取资金，不允许新理赔
- 暂停事件链上可查，透明公开

### 7.3 审计计划

**内部审计流程**  
1. 开发完成后，团队内部进行代码审查（至少 2 名开发者独立审查）
2. 编写完整的测试用例，覆盖正常流程、边界条件、攻击场景
3. 运行 Slither、Mythril 等静态分析工具，修复所有高危和中危问题
4. 在 BSC 测试网部署，进行集成测试和压力测试

**第三方审计**  
- 主网上线前，委托至少 1 家知名审计公司进行全面审计
- 审计范围：所有核心合约（InsurToken、InsurancePool、LossVerifier、PolicyManager、DEXRouter）
- 审计报告公开发布，所有问题必须修复或明确标注风险接受
- 重大升级后进行增量审计

**漏洞赏金计划**  
- 主网上线后启动漏洞赏金计划
- 赏金范围：$1,000 - $50,000（根据漏洞严重程度）
- 通过 Immunefi 平台发布
- 高危漏洞 24 小时内响应

### 7.4 风险提示

使用 InsurFi 协议存在以下风险：

**智能合约风险**  
尽管经过审计和测试，智能合约仍可能存在未被发现的漏洞。用户应自行评估风险，不要投入无法承受损失的资金。

**市场风险**  
INSUR 代币价格可能波动，持仓量变化可能导致保单等级变化或失效。保险池资金的收益策略也存在市场风险。

**监管风险**  
加密货币和 DeFi 协议在不同司法管辖区面临不同的监管环境。监管政策变化可能影响协议的运营和使用。

**操作风险**  
用户需自行保管私钥，私钥丢失或被盗可能导致资产损失。通过 DEXRouter 交易时需注意滑点设置和 deadline 参数。

---

## 8. 路线图

### Phase 1 — MVP（当前阶段）

**目标**：完成核心协议开发，在 BSC 测试网上线验证

**交付物**：
- ✅ 5 个核心智能合约（InsurToken、InsurancePool、LossVerifier、PolicyManager、DEXRouter）
- ✅ 完整的接口定义和 Mock 合约
- ✅ 部署脚本和测试用例
- ✅ DApp 前端脚手架（Next.js + wagmi + Tailwind）
- ✅ 4 个核心页面（首页、保单看板、理赔申请、保险池）
- ✅ 项目文档（架构设计、白皮书、合约模块清单）
- 🔄 BSC 测试网部署和验证
- 🔄 第三方安全审计

**时间线**：2026 年 Q3

### Phase 2 — 迭代

**目标**：主网上线，完善生态，提升用户体验

**交付物**：
- INSUR 代币 TGE（代币生成事件）
- PancakeSwap 流动性池创建
- 多 DEX 接入（Biswap、MDEX 等）
- 保单分级系统完善（支持更多等级和动态调整）
- INSUR 质押挖矿模块上线
- 保险池 LP 存款功能（用户可存入 BNB 获得收益）
- 交易税分红机制上线
- 完整的 7 个页面（新增质押、治理、文档）
- 移动端适配优化
- 主网上线和营销推广

**时间线**：2026 年 Q4

### Phase 3 — 扩展

**目标**：多链部署，扩展交易类型，完善治理

**交付物**：
- 多链支持（Polygon、Arbitrum、Base、Avalanche 等）
- 跨链保险模块（统一保单，多链赔付）
- 交易类型扩展（现货、杠杆、永续合约、期权）
- 治理模块完整上线（提案、投票、Timelock、多签）
- 保险模块 SDK 发布（供其他项目集成）
- 保险池收益策略上线（Venus、Beefy 等）
- 高级数据分析面板（用户交易分析、赔付统计、风险指标）
- 机构级 API 服务

**时间线**：2027 年 Q1-Q2

### Phase 4 — 远景

**目标**：成为 DeFi 保险基础设施，模块化输出

**交付物**：
- 模块化保险中间件（可插拔保险模块，任何 DeFi 项目可一键集成）
- 对外输出保险模块（DEX、借贷、衍生品项目可集成 InsurFi 保险）
- 保险产品市场（用户可选择不同类型的保险产品）
- 生态基金（投资和孵化基于 InsurFi 的保险项目）
- 战略合作（与主流 DeFi 协议、钱包、交易所合作）
- DAO 完全自治（团队退出日常管理，社区完全治理）
- 探索被主流 DeFi 协议或 CeFi 平台收购的可能性

**时间线**：2027 年 Q3 及以后

---

## 9. 团队

InsurFi 团队由区块链开发者、DeFi 研究员、金融产品专家组成，拥有丰富的链上协议开发和安全审计经验。团队成员曾参与多个知名 DeFi 项目的开发和审计。

**核心团队**  
- **核心开发者**：Solidity 智能合约开发，5 年+ 区块链开发经验，曾参与多个 DeFi 协议开发
- **前端工程师**：Next.js + Web3 前端开发，4 年+ 全栈开发经验
- **DeFi 研究员**：代币经济学设计、保险产品设计、DeFi 协议分析
- **安全顾问**：智能合约安全审计，曾审计多个知名 DeFi 项目

**顾问团队**  
- 知名 DeFi 项目创始人
- 区块链安全公司创始人
- 传统金融保险产品专家

**合作伙伴**  
- PancakeSwap（DEX 集成）
- 审计公司（安全审计）
- 流动性提供商（初始流动性）

*团队详细信息将在主网上线前公布。*

---

## 10. 结论

InsurFi 致力于解决 DeFi 交易者长期面临的「交易亏损无保障」痛点。通过「持仓即参保」的创新机制、链上自动校验的透明流程、以及四重防骗保的安全设计，InsurFi 为链上交易者提供了一种零摩擦、透明可信、即时赔付的交易亏损保险解决方案。

InsurFi 的核心价值在于：

1. **用户价值**：为交易者提供亏损保障，降低交易风险，提升交易信心
2. **协议价值**：保险需求驱动代币需求，交易税和池收益形成价值捕获闭环
3. **生态价值**：模块化保险中间件可输出给其他 DeFi 项目，提升整个 DeFi 生态的安全性
4. **收购价值**：作为 DeFi 保险基础设施，具备被主流 DeFi 协议或 CeFi 平台收购的潜力

我们相信，随着 DeFi 市场的持续发展和交易者风险意识的提升，交易亏损保险将成为 DeFi 领域的刚需产品。InsurFi 有机会成为这个赛道的先行者和领导者，最终成为 Web3 世界的保险基础设施层。

---

## 附录

### A. 合约接口定义

#### A.1 IInsurToken
```solidity
function balanceOf(address account) external view returns (uint256);
function balanceOfAt(address account, uint256 blockNumber) external view returns (uint256);
function transfer(address to, uint256 amount) external returns (bool);
function approve(address spender, uint256 amount) external returns (bool);
function transferFrom(address from, address to, uint256 amount) external returns (bool);
function mint(address to, uint256 amount) external;
```

#### A.2 IInsurancePool
```solidity
function deposit() external payable;
function payout(address user, uint256 amount, bytes32 claimId) external;
function withdraw(uint256 amount) external;
function getPoolBalance() external view returns (uint256);
function isClaimProcessed(bytes32 claimId) external view returns (bool);
function togglePause() external;
```

#### A.3 ILossVerifier
```solidity
function verifyAndPayout(uint256 buyTradeId, uint256 sellTradeId) external;
function calculateLoss(uint256 buyTradeId, uint256 sellTradeId) external view returns (uint256 lossAmount, bool isValid);
function setPayoutRatio(uint256 ratio) external;
function setMinLossAmount(uint256 amount) external;
```

#### A.4 IPolicyManager
```solidity
function getPolicyStatus(address user) external view returns (bool isActive, uint8 tier, uint256 coverageLimit);
function isPolicyActiveAt(address user, uint256 blockNumber) external view returns (bool);
function getCoverageLimit(address user) external view returns (uint256);
function setMinHoldingThreshold(uint256 threshold) external;
function setTiers(uint256[] calldata holdings, uint256[] calldata coverages) external;
```

#### A.5 IDEXRouter
```solidity
function swapETHForTokens(uint256 amountOutMin, address[] calldata path, uint256 deadline) external payable returns (uint256 tradeId);
function swapTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] calldata path, uint256 deadline) external returns (uint256 tradeId);
function getTrade(uint256 tradeId) external view returns (Trade memory);
function getUserTrades(address user) external view returns (uint256[] memory);
```

### B. 数学公式推导

**亏损金额计算**  
```
亏损 = buyTrade.amountIn - sellTrade.amountOut
条件：buyTrade.amountIn > sellTrade.amountOut（否则无亏损）
```

**赔付金额计算**  
```
赔付 = min(亏损 × 赔付比例, 保额上限)
其中：赔付比例 = payoutRatio / 10000（基点转百分比）
      保额上限 = coverageTiers[tier - 1]
```

**持仓快照二分查找**  
```
输入：目标区块号 blockNumber，用户快照区块数组 blocks[0..n-1]
输出：最接近且 ≤ blockNumber 的快照区块对应的余额

算法：
  low = 0, high = n
  while low < high:
      mid = (low + high) / 2
      if blocks[mid] <= blockNumber:
          low = mid + 1
      else:
          high = mid
  return balances[blocks[high - 1]]
```

**claimId 生成**  
```
claimId = keccak256(abi.encodePacked(userAddress, buyTradeId, sellTradeId))
```

### C. 术语表

| 术语 | 说明 |
|------|------|
| INSUR | InsurFi 协议的原生代币，BEP20 标准 |
| 保单 | 用户持有 INSUR 后自动激活的保险保障资格 |
| 保额上限 | 单笔理赔的最高赔付金额，由 INSUR 持仓等级决定 |
| 赔付比例 | 实际亏损中可获得赔付的比例，默认 50% |
| 持仓快照 | InsurToken 记录的用户在特定区块的持仓余额 |
| DEXRouter | InsurFi 的 DEX 代理合约，记录用户交易 |
| tradeId | DEXRouter 为每笔交易分配的唯一编号 |
| claimId | 每对买卖交易理赔的唯一标识，由 keccak256 生成 |
| TVL | Total Value Locked，总锁仓价值 |
| TGE | Token Generation Event，代币生成事件 |
| Timelock | 时间锁，治理提案通过后需延迟执行的机制 |
| ReentrancyGuard | 防重入保护，防止恶意合约重入攻击 |
| BEP20 | BNB Chain 上的代币标准，兼容 ERC20 |

### D. 参考资料

- BNB Chain 官方文档：https://docs.bnbchain.org/
- PancakeSwap 文档：https://docs.pancakeswap.finance/
- OpenZeppelin 合约库：https://docs.openzeppelin.com/contracts/
- Solidity 官方文档：https://docs.soliditylang.org/
- wagmi 文档：https://wagmi.sh/
- Next.js 文档：https://nextjs.org/docs

---

**免责声明**：本白皮书仅供参考，不构成任何投资建议。加密货币投资存在风险，用户应自行评估并承担投资风险。InsurFi 协议处于开发阶段，功能和参数可能调整，最终以主网上线版本为准。
