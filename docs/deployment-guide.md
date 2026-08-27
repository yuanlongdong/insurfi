# InsurFi 部署指南

> BSC 测试网 / 主网完整部署流程

## 目录

1. [前置准备](#1-前置准备)
2. [环境配置](#2-环境配置)
3. [编译合约](#3-编译合约)
4. [测试网部署](#4-测试网部署)
5. [合约验证](#5-合约验证)
6. [初始化配置](#6-初始化配置)
7. [前端配置](#7-前端配置)
8. [主网部署注意事项](#8-主网部署注意事项)

---

## 1. 前置准备

### 1.1 必要工具

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git
- 一个 BSC 钱包（MetaMask / Binance Web3 Wallet）
- 测试网 BNB（从 [BSC 测试网水龙头](https://testnet.bnbchain.org/faucet-smart) 获取）

### 1.2 获取测试网 BNB

1. 访问 https://testnet.bnbchain.org/faucet-smart
2. 输入你的钱包地址
3. 点击 "Give me BNB" 获取 0.5 测试网 BNB
4. 等待几分钟到账

### 1.3 BscScan API Key（用于合约验证）

1. 访问 https://bscscan.com/register 注册账号
2. 登录后进入 https://bscscan.com/myapikey
3. 点击 "Add" 创建 API Key
4. 复制 API Key 备用

---

## 2. 环境配置

### 2.1 克隆仓库

```bash
git clone https://github.com/yuanlongdong/insurfi.git
cd insurfi/contracts
```

### 2.2 安装依赖

```bash
npm install
```

### 2.3 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入以下信息：

```env
# 你的钱包私钥（从 MetaMask 导出，不要带 0x 前缀以外的内容）
PRIVATE_KEY=0xyour_private_key_here

# BSC 测试网 RPC（默认即可，也可换成自己的节点）
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545

# BSC 主网 RPC
BSC_MAINNET_RPC=https://bsc-dataseed.binance.org

# BscScan API Key（用于合约验证）
BSCSCAN_API_KEY=your_bscscan_api_key

# PancakeSwap 测试网 Router 地址（默认即可）
PANCAKE_ROUTER=0xD99D1c33F9fC3444f8101754aBC46c52416550D
```

> ⚠️ **安全警告**：`.env` 文件包含私钥，绝对不要提交到 Git 仓库。`.gitignore` 已配置忽略 `.env`。

---

## 3. 编译合约

```bash
npx hardhat compile
```

成功后会显示：
```
Compiled 15 Solidity files successfully
```

如果遇到编译错误，检查：
- Solidity 版本是否为 0.8.20
- OpenZeppelin 合约版本是否为 ^5.0.0
- `@openzeppelin/contracts` 是否已安装

---

## 4. 测试网部署

### 4.1 运行部署脚本

```bash
npx hardhat run scripts/deploy.js --network bsctestnet
```

部署脚本会按以下顺序部署 5 个合约：

1. **InsurToken** — 铸造 1 亿 INSUR 到部署者地址
2. **PolicyManager** — 设置最小持仓阈值 1000 INSUR，默认三级保单
3. **DEXRouter** — 连接 PancakeSwap 测试网 Router
4. **InsurancePool** — 空资金池，后续注资
5. **LossVerifier** — 连接以上 4 个合约

部署完成后自动执行：
- InsurancePool.setLossVerifier(LossVerifier 地址) — 授权赔付

### 4.2 部署输出示例

```
Deploying with: 0xYourWalletAddress
Balance: 0.5 BNB

[1/5] Deploying InsurToken...
  InsurToken: 0xAbc123...

[2/5] Deploying PolicyManager...
  PolicyManager: 0xDef456...

[3/5] Deploying DEXRouter...
  DEXRouter: 0xGhi789...

[4/5] Deploying InsurancePool...
  InsurancePool: 0xJkl012...

[5/5] Deploying LossVerifier...
  LossVerifier: 0xMno345...

=== Wiring up contracts ===
  InsurancePool.lossVerifier = 0xMno345...

============================================================
DEPLOYMENT COMPLETE
============================================================
Network: bsctestnet
InsurToken:    0xAbc123...
PolicyManager: 0xDef456...
DEXRouter:     0xGhi789...
InsurancePool: 0xJkl012...
LossVerifier:  0xMno345...
============================================================
```

> 📝 **重要**：保存好这些合约地址，后续验证和前端配置都需要。

### 4.3 向保险池注资（测试）

部署后保险池为空，需要注入测试 BNB 才能测试赔付：

```bash
npx hardhat console --network bsctestnet
```

在控制台中执行：

```javascript
const pool = await ethers.getContractAt("InsurancePool", "0xYourInsurancePoolAddress");
await pool.deposit({ value: ethers.parseEther("0.1") }); // 注入 0.1 BNB
console.log("Pool balance:", await pool.getPoolBalance());
```

---

## 5. 合约验证

### 5.1 验证所有合约

```bash
# 验证 InsurToken
npx hardhat verify --network bsctestnet 0xInsurTokenAddress "InsurFi" "INSUR" 100000000000000000000000000

# 验证 PolicyManager
npx hardhat verify --network bsctestnet 0xPolicyManagerAddress 0xInsurTokenAddress 1000000000000000000000

# 验证 DEXRouter
npx hardhat verify --network bsctestnet 0xDEXRouterAddress 0xD99D1c33F9fC3444f8101754aBC46c52416550D

# 验证 InsurancePool
npx hardhat verify --network bsctestnet 0xInsurancePoolAddress

# 验证 LossVerifier
npx hardhat verify --network bsctestnet 0xLossVerifierAddress 0xInsurTokenAddress 0xInsurancePoolAddress 0xPolicyManagerAddress 0xDEXRouterAddress
```

> 📝 构造函数参数需要与部署时一致。100000000000000000000000000 = 1 亿 INSUR（18 位精度）。1000000000000000000000 = 1000 INSUR。

### 5.2 验证成功

每个合约验证成功后会显示：
```
Successfully verified contract InsurToken on BscScan.
https://testnet.bscscan.com/address/0x...#code
```

验证后可以在 BscScan 上查看合约源代码和直接调用合约函数。

---

## 6. 初始化配置

### 6.1 分发测试代币

将 INSUR 代币分发给测试用户：

```javascript
const token = await ethers.getContractAt("InsurToken", "0xInsurTokenAddress");
await token.transfer("0xUserAddress", ethers.parseEther("5000")); // 发送 5000 INSUR
```

### 6.2 测试完整理赔流程

1. **用户持有 INSUR**（≥ 1000）→ 保单自动激活
2. **通过 DEXRouter 买入代币**：
   ```javascript
   const router = await ethers.getContractAt("DEXRouter", "0xDEXRouterAddress");
   const wbnb = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd"; // 测试网 WBNB
   const token = "0xTestTokenAddress";
   await router.swapETHForTokens(0, [wbnb, token], Math.floor(Date.now()/1000)+3600, { value: ethers.parseEther("0.1") });
   ```
3. **通过 DEXRouter 卖出代币**（部分卖出，制造亏损）
4. **调用 LossVerifier.verifyAndPayout(buyTradeId, sellTradeId)**
5. **检查钱包是否收到 BNB 赔付**

---

## 7. 前端配置

### 7.1 配置环境变量

```bash
cd ../frontend
cp .env.example .env.local
```

编辑 `.env.local`：

```env
# 测试网 RPC
NEXT_PUBLIC_BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545
NEXT_PUBLIC_CHAIN_ID=97

# 部署的合约地址
NEXT_PUBLIC_INSUR_ADDRESS=0xInsurTokenAddress
NEXT_PUBLIC_POOL_ADDRESS=0xInsurancePoolAddress
NEXT_PUBLIC_VERIFIER_ADDRESS=0xLossVerifierAddress
NEXT_PUBLIC_POLICY_ADDRESS=0xPolicyManagerAddress
NEXT_PUBLIC_DEX_ROUTER_ADDRESS=0xDEXRouterAddress

# PancakeSwap 测试网
NEXT_PUBLIC_PANCAKE_ROUTER=0xD99D1c33F9fC3444f8101754aBC46c52416550D
NEXT_PUBLIC_WBNB=0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd
```

### 7.2 启动前端

```bash
npm install
npm run dev
```

访问 http://localhost:3000，连接 MetaMask（切换到 BSC 测试网），即可测试所有功能。

---

## 8. 主网部署注意事项

### 8.1 部署前检查清单

- [ ] 合约经过完整测试（`npx hardhat test` 全部通过）
- [ ] 第三方安全审计完成，所有高危问题已修复
- [ ] 多签钱包已配置（核心操作需多签确认）
- [ ] 保险池初始资金已准备（建议 ≥ 100 BNB）
- [ ] 流动性资金已准备（PancakeSwap 初始流动性）
- [ ] 代币分配方案已确认，团队/顾问/私募代币已转入对应地址
- [ ] BscScan API Key 已配置
- [ ] 主网 RPC 节点稳定（建议使用第三方节点服务如 QuickNode、Ankr）

### 8.2 主网 PancakeSwap 地址

```
PancakeSwap Router: 0x10ED43C718714eb63d5aA57B78B54704E256024
WBNB: 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c
```

### 8.3 主网部署命令

```bash
# 部署
npx hardhat run scripts/deploy.js --network bscmainnet

# 验证（构造函数参数同测试网，只是网络不同）
npx hardhat verify --network bscmainnet 0xContractAddress [constructor args...]
```

### 8.4 安全建议

1. **不要用部署者钱包持有大量资金**，部署完成后将管理权转移到多签钱包
2. **保险池资金分批注入**，不要一次性注入全部资金
3. **设置合理的赔付上限**，初期建议降低赔付比例和保额上限
4. **监控链上活动**，设置异常交易告警
5. **保留紧急暂停权限**，发现异常立即暂停赔付

---

## 常见问题

**Q: 部署时提示 insufficient funds**  
A: 钱包里没有足够的 BNB 支付 gas 费。测试网从水龙头获取，主网需要购买 BNB。

**Q: 合约验证失败**  
A: 检查构造函数参数是否与部署时完全一致，包括数值精度。确保 BscScan API Key 正确。

**Q: 前端调用合约报错**  
A: 检查 `.env.local` 中的合约地址是否正确，钱包网络是否切换到对应网络（测试网 97 / 主网 56）。

**Q: 理赔交易 revert**  
A: 检查：1) 买卖交易是否都通过 DEXRouter 执行；2) 卖出时是否持有足够 INSUR；3) 保险池是否有足够 BNB；4) 该交易对是否已理赔过。

---

## 技术支持

- GitHub Issues: https://github.com/yuanlongdong/insurfi/issues
- 项目文档: `/docs` 目录
- 合约代码: `/contracts` 目录
- 前端代码: `/frontend` 目录
