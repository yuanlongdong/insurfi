# InsurFi 智能合约安全审计报告

> 审计版本: v1.0 (初始部署版本)
> 审计日期: 2026-08-28
> 审计范围: InsurToken, PolicyManager, DEXRouter, InsurancePool, LossVerifier
> 审计方法: 人工代码审查 + 已知漏洞模式匹配 + 经济模型分析

---

## 审计摘要

| 严重程度 | 数量 | 状态 |
|---------|------|------|
| 🔴 高危 (Critical) | 2 | 已修复 |
| 🟠 中危 (High) | 3 | 已修复 |
| 🟡 低危 (Medium) | 4 | 已修复 |
| ⚪ 建议 (Low/Info) | 5 | 已记录 |

**总体评价**: 合约架构合理，核心防骗保机制（持仓快照 + 交易去重）设计正确。发现 2 个高危问题需在主网上线前修复，主要集中在外部调用和资金安全方面。修复后可进入测试网部署阶段。

---

## 🔴 高危问题 (Critical)

### C-01: DEXRouter 外部调用未校验返回值，存在资金锁定风险

**合约**: DEXRouter.sol
**位置**: swapETHForTokens / swapTokensForETH / swapExactTokensForTokens
**严重程度**: 🔴 Critical

**问题描述**:
调用 PancakeSwap Router 的 `swapExactETHForTokens` 等函数时，未校验返回的 `amounts` 数组。如果 PancakeSwap 路由失败或返回空数组，用户的 BNB/代币可能被锁定在合约中。

此外，`swapTokensForETH` 中用户先 `transferFrom` 代币到合约，再调用 Router。如果 Router 调用失败（revert），代币已转入合约但未被消费，用户无法取回。

**攻击场景**:
1. 用户调用 swapTokensForETH，授权并转入 1000 代币
2. Router 调用因滑点或路径问题 revert
3. 代币已在合约中，但没有退款机制
4. 用户资金永久锁定

**修复方案**:
- 所有外部调用使用 try/catch 或 require 校验返回值
- Router 调用失败时自动退还用户代币
- 增加 `rescueTokens` 函数，允许 owner 救援误锁定的代币
- 校验 `amounts[amounts.length - 1] > 0`

---

### C-02: LossVerifier 赔付计算存在整数下溢风险，可能超额赔付

**合约**: LossVerifier.sol
**位置**: _calculateLoss / _calculatePayout
**严重程度**: 🔴 Critical

**问题描述**:
亏损计算中 `buyAmount - sellAmount` 和 `costBasis - proceeds` 未检查大小关系。如果卖出金额大于买入金额（盈利交易），在 Solidity 0.8+ 中会 revert，但在某些计算路径中使用了 unchecked 块可能导致下溢。

更严重的是，赔付比例计算 `lossAmount * payoutBps / 10000` 中，如果 `lossAmount` 被错误计算为巨大值（下溢导致），赔付金额可能远超保险池余额。

**攻击场景**:
1. 攻击者构造特殊交易对，使 buyAmount < sellAmount
2. 在 unchecked 计算块中，buyAmount - sellAmount 下溢为巨大值
3. 赔付金额 = 巨大值 * 50% = 远超保险池余额
4. 保险池被抽干

**修复方案**:
- 移除所有 unchecked 计算块
- 显式检查 `require(sellAmount <= buyAmount, "profit trade")`
- 赔付金额计算后增加 `require(payout <= poolBalance, "pool insufficient")`
- 增加单笔赔付绝对上限（如 5 BNB）

---

## 🟠 中危问题 (High)

### H-01: InsurancePool 缺少资金上限保护，大额注资后赔付比例失真

**合约**: InsurancePool.sol
**严重程度**: 🟠 High

**问题描述**:
保险池没有最大资金上限。任何人可以无限注资。当池余额巨大时，`getPoolBalance` 返回值可能在前端显示异常，且赔付计算中基于池余额的百分比限制可能失效。

更重要的是，大额注资者可以通过注资影响池余额，从而间接影响赔付上限计算（如果赔付上限与池余额挂钩）。

**修复方案**:
- 增加 `maxPoolSize` 状态变量，默认 500 BNB
- deposit 时检查 `require(address(this).balance + msg.value <= maxPoolSize, "pool full")`
- owner 可调整 maxPoolSize

---

### H-02: PolicyManager 保单分级可被闪电贷攻击绕过

**合约**: PolicyManager.sol + InsurToken.sol
**严重程度**: 🟠 High

**问题描述**:
`isPolicyActive` 检查当前持仓是否达到阈值。攻击者可以通过闪电贷在同一区块内借入大量 INSUR，激活高等级保单，然后在同一交易内执行理赔并归还闪电贷。

虽然 InsurToken 有持仓快照机制，但快照是在 transfer 时更新的。闪电贷在同一区块内完成借贷和归还，快照可能显示为高持仓状态。

**攻击场景**:
1. 攻击者闪电贷借入 100 万 INSUR
2. 持仓快照更新为 100 万 → 尊享版保单激活
3. 调用 LossVerifier 提交理赔（使用之前的亏损交易记录）
4. 获得尊享版赔付（2 BNB 上限）
5. 归还闪电贷，整个过程在同一区块完成

**修复方案**:
- 持仓快照增加时间锁：要求持仓持续 ≥ N 个区块（如 10 个区块 ≈ 30 秒）
- 在 InsurToken 中记录 `snapshotBlock`，PolicyManager 检查 `block.number - snapshotBlock >= MIN_HOLD_BLOCKS`
- 理赔时检查买入交易时的持仓快照，而非当前持仓

---

### H-03: DEXRouter 交易记录可被伪造，非授权地址也能记录交易

**合约**: DEXRouter.sol
**严重程度**: 🟠 High

**问题描述**:
`tradeRecords` 映射的 key 是 `tradeId`（递增计数器），记录了 trader、amountIn、amountOut 等信息。但 `_recordTrade` 是内部函数，只在 swap 函数中调用。

问题在于：交易记录中没有包含 `msg.sender` 的签名验证，理论上如果有其他合约调用 DEXRouter 的 swap 函数，交易记录的 trader 会是那个合约而非最终用户。

更关键的是，`getTradeRecord` 是公开的，任何人可以查询。但 `tradeRecords` 的写入没有权限控制——如果未来增加其他写入路径，可能被滥用。

**修复方案**:
- 交易记录中增加 `txHash` 字段，便于链上验证
- 增加 `onlyEOA` 修饰符，防止合约地址直接调用（可选）
- 明确文档说明：只有通过 DEXRouter 执行的交易才受保

---

## 🟡 低危问题 (Medium)

### M-01: InsurToken 持仓快照在 mint/burn 时未更新

**合约**: InsurToken.sol
**严重程度**: 🟡 Medium

**问题描述**:
`_update` 函数在 transfer 时更新快照，但 `_mint` 和 `_burn` 内部也调用 `_update`，所以理论上快照会更新。需要确认 `from = address(0)`（mint）和 `to = address(0)`（burn）时快照逻辑正确。

如果 mint 时 `from = address(0)`，`snapshotBalance[address(0)]` 会被更新，这是无意义的但不会造成安全问题。

**修复方案**:
- 在 `_update` 中增加 `if (from != address(0))` 和 `if (to != address(0))` 条件
- 避免对零地址进行快照操作

---

### M-02: LossVerifier 缺少交易时间窗口限制

**合约**: LossVerifier.sol
**严重程度**: 🟡 Medium

**问题描述**:
用户可以用很久以前的交易记录来申请理赔。没有限制买入和卖出交易的时间间隔，也没有限制交易记录的有效期。

攻击者可以积累大量历史交易记录，在保险池资金充足时集中理赔。

**修复方案**:
- 增加 `MAX_TRADE_AGE` 常量（如 30 天）
- 理赔时检查 `block.timestamp - buyTrade.timestamp <= MAX_TRADE_AGE`
- 增加买卖时间间隔合理性检查（如卖出必须在买入之后）

---

### M-03: 合约 owner 权限过大，存在中心化风险

**合约**: 所有合约
**严重程度**: 🟡 Medium

**问题描述**:
- InsurancePool: owner 可以紧急暂停、提取资金
- PolicyManager: owner 可以调整所有参数
- LossVerifier: owner 可以调整赔付比例和阈值
- DEXRouter: owner 可以更新 Router 地址

如果 owner 私钥泄露，攻击者可以：
- 暂停赔付
- 提取保险池所有资金
- 调整赔付比例为 100%
- 更换 Router 为恶意合约

**修复方案**:
- 核心操作（提取资金、更换 Router）改为多签（Timelock + MultiSig）
- 参数调整增加 Timelock 延迟（如 48 小时）
- 紧急暂停权保留，但增加事件通知和社区监督
- 长期目标：迁移到 DAO 治理

---

### M-04: 前端依赖的合约事件不完整

**合约**: 所有合约
**严重程度**: 🟡 Medium

**问题描述**:
部分关键操作没有触发事件，前端无法实时监听状态变化：
- InsurancePool.deposit 没有 Deposit 事件
- PolicyManager.setPolicyTier 没有 PolicyTierUpdated 事件
- DEXRouter 交易记录没有 TradeExecuted 事件

**修复方案**:
- 为所有状态变更操作增加事件
- 事件包含足够的参数供前端索引

---

## ⚪ 建议 (Low/Info)

### L-01: 增加 NatSpec 文档注释
所有 public/external 函数应增加 @notice、@dev、@param、@return 注释，便于开发者理解和审计工具分析。

### L-02: 使用自定义错误替代 require 字符串
Solidity 0.8.4+ 支持自定义错误（error），比 require 字符串更省 gas。建议定义 `InsufficientBalance()`、`Unauthorized()` 等自定义错误。

### L-03: 增加合约版本号
每个合约增加 `string public constant VERSION = "1.0.0"`，便于升级管理。

### L-04: Gas 优化
- LossVerifier 的多次 SLOAD 可以缓存到内存
- 映射访问可以使用 immutable 变量优化
- 字符串常量改为 bytes32

### L-05: 增加 EIP-712 签名支持（迭代）
未来支持元交易（gasless）时，需要 EIP-712 结构化数据签名。

---

## 经济模型审计

### 偿付能力分析

**当前模型**:
- 赔付比例: 50%
- 单笔上限: 基础版 0.5 BNB / 进阶版 1 BNB / 尊享版 2 BNB
- 保险池资金: 用户注资 + 协议收益

**风险点**:
1. **逆向选择**: 只有亏损交易者才会参保，盈利交易者不参保。长期来看保险池必然亏损。
2. **道德风险**: 参保用户可能进行高风险交易，因为亏损有保险兜底。
3. **资金池耗尽**: 如果短时间内大量理赔，保险池可能耗尽。

**建议**:
- 引入动态赔付比例：根据池余额和理赔率自动调整
- 引入等待期：参保后 N 小时内的交易不赔
- 引入免赔额：每笔交易亏损的前 X% 不赔
- 引入共保：赔付比例随持仓量增加，但最高不超过 70%
- 保险池资金投入 DeFi 收益协议（如 Venus），用收益补贴赔付

### 代币经济学审计

**当前模型**:
- 总供应量: 1 亿
- 交易税: 2%（迭代功能，当前未实现）
- 用途: 持仓参保 + 治理投票 + 质押收益

**风险点**:
1. **代币价值支撑不足**: INSUR 的价值主要来自"持仓才能参保"的效用，但如果保险产品不好用，代币没有价值支撑。
2. **通胀压力**: 如果质押收益来自新增代币铸造，会导致通胀。
3. **流动性风险**: 初始流动性不足时，代币价格可能剧烈波动。

**建议**:
- 明确代币分配方案（团队、社区、流动性、生态基金）
- 质押收益来自保险池收益分成，而非新增铸造
- 初始锁定流动性 ≥ 6 个月
- 团队代币线性解锁 ≥ 2 年

---

## 修复验证清单

- [x] C-01: DEXRouter 外部调用返回值校验 + 退款机制 + rescueTokens
- [x] C-02: LossVerifier 整数安全检查 + 单笔赔付上限
- [x] H-01: InsurancePool 资金上限保护
- [x] H-02: PolicyManager 持仓时间锁（MIN_HOLD_BLOCKS）
- [x] H-03: DEXRouter 交易记录增加 txHash
- [x] M-01: InsurToken 快照排除零地址
- [x] M-02: LossVerifier 交易时间窗口限制
- [x] M-03: 文档记录中心化风险及缓解方案
- [x] M-04: 补全所有合约事件
- [ ] L-01~L-05: 低优先级优化，迭代版本处理

---

## 审计结论

**当前状态**: 修复后可进入测试网部署阶段

**主网上线前必须完成**:
1. 本报告所有 🔴🟠 问题修复（已完成）
2. 第三方专业安全审计（如 CertiK、SlowMist、PeckShield）
3. 测试网完整运行 ≥ 2 周，监控异常交易
4. 保险池初始资金 ≥ 100 BNB
5. 多签钱包配置完成
6. 紧急响应预案制定完成

**审计人**: InsurFi 核心开发团队（内部审计）
**下次审计**: 合约重大升级后或主网上线前

---

*本报告为内部审计结果，不构成投资建议。主网上线前必须进行第三方专业审计。*
