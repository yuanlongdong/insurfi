"use client";

import { useState } from "react";
import { BookOpen, FileText, Code, Github, ExternalLink, Copy, Check, ChevronRight } from "lucide-react";

const contractAddresses = [
  { name: "InsurToken", symbol: "INSUR", address: "待部署", desc: "INSUR 代币合约，带持仓快照" },
  { name: "PolicyManager", symbol: "—", address: "待部署", desc: "保单管理器，持仓分级" },
  { name: "DEXRouter", symbol: "—", address: "待部署", desc: "PancakeSwap 代理，交易记录" },
  { name: "InsurancePool", symbol: "—", address: "待部署", desc: "保险资金池，BNB 赔付" },
  { name: "LossVerifier", symbol: "—", address: "待部署", desc: "亏损校验器，理赔执行" },
];

const docSections = [
  {
    title: "快速开始",
    items: [
      { title: "项目介绍", desc: "了解 InsurFi 的定位和核心机制" },
      { title: "安装与配置", desc: "本地开发环境搭建" },
      { title: "合约部署", desc: "BSC 测试网/主网部署指南" },
    ],
  },
  {
    title: "核心概念",
    items: [
      { title: "持仓即参保", desc: "INSUR 持仓自动激活保单" },
      { title: "链上亏损校验", desc: "买卖交易配对计算亏损" },
      { title: "防骗保机制", desc: "持仓快照 + 去重 + 白名单" },
      { title: "保险池模型", desc: "资金池结构和偿付能力管理" },
    ],
  },
  {
    title: "开发者文档",
    items: [
      { title: "合约接口", desc: "5 个核心合约的完整 ABI" },
      { title: "前端集成", desc: "wagmi 调用合约示例" },
      { title: "子图索引", desc: "The Graph 子图配置（迭代）" },
      { title: "安全审计", desc: "审计报告和漏洞赏金" },
    ],
  },
];

export default function DocsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("快速开始");

  const copyAddress = (address: string) => {
    if (address === "待部署") return;
    navigator.clipboard.writeText(address);
    setCopied(address);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">文档中心</h1>
      <p className="mt-2 text-gray-500">InsurFi 协议文档、合约地址、开发者指南</p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="glass-card sticky top-24 p-4">
            {docSections.map((section) => (
              <div key={section.title} className="mb-4">
                <button
                  onClick={() => setActiveSection(section.title)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeSection === section.title ? "bg-primary-600/20 text-primary-400" : "text-gray-400 hover:text-white"}`}
                >
                  {section.title}
                  <ChevronRight className={`h-4 w-4 transition-transform ${activeSection === section.title ? "rotate-90" : ""}`} />
                </button>
                {activeSection === section.title && (
                  <div className="mt-1 ml-2 space-y-1 border-l border-dark-600 pl-3">
                    {section.items.map((item) => (
                      <a
                        key={item.title}
                        href={`#${item.title}`}
                        className="block rounded px-2 py-1.5 text-xs text-gray-500 hover:text-primary-400"
                      >
                        {item.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-8">
          {/* Whitepaper */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600/20">
                <FileText className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">白皮书</h2>
                <p className="text-sm text-gray-500">InsurFi 协议完整白皮书（v1.0）</p>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <a href="#" className="btn-primary flex items-center gap-2 text-sm">
                <BookOpen className="h-4 w-4" /> 在线阅读
              </a>
              <a href="#" className="btn-outline flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" /> 下载 PDF
              </a>
            </div>
          </div>

          {/* Contract Addresses */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold">合约地址</h2>
            <p className="mt-1 text-sm text-gray-500">BSC 主网合约地址（测试网部署后更新）</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-700 text-left text-gray-500">
                    <th className="pb-3 font-medium">合约</th>
                    <th className="pb-3 font-medium">地址</th>
                    <th className="pb-3 font-medium">说明</th>
                    <th className="pb-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {contractAddresses.map((c) => (
                    <tr key={c.name} className="border-b border-dark-700/50">
                      <td className="py-3">
                        <span className="font-medium text-white">{c.name}</span>
                        {c.symbol !== "—" && <span className="ml-2 text-xs text-gray-500">{c.symbol}</span>}
                      </td>
                      <td className="py-3">
                        <code className="rounded bg-dark-700 px-2 py-1 text-xs text-gray-300">{c.address}</code>
                      </td>
                      <td className="py-3 text-gray-400">{c.desc}</td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyAddress(c.address)}
                            disabled={c.address === "待部署"}
                            className="rounded p-1.5 text-gray-400 hover:bg-dark-700 hover:text-white disabled:opacity-30"
                          >
                            {copied === c.address ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                          </button>
                          <a
                            href={c.address !== "待部署" ? `https://bscscan.com/address/${c.address}` : "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded p-1.5 text-gray-400 hover:bg-dark-700 hover:text-white disabled:opacity-30"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Start */}
          <div className="glass-card p-6">
            <h2 id="快速开始" className="text-lg font-semibold">快速开始</h2>
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-white">1. 克隆仓库</h3>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-dark-900 p-4 text-xs text-gray-300">
{`git clone https://github.com/yuanlongdong/insurfi.git
cd insurfi`}
                </pre>
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">2. 安装依赖</h3>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-dark-900 p-4 text-xs text-gray-300">
{`# 合约依赖
cd contracts && npm install

# 前端依赖
cd ../frontend && npm install`}
                </pre>
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">3. 编译合约</h3>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-dark-900 p-4 text-xs text-gray-300">
{`cd contracts
npx hardhat compile`}
                </pre>
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">4. 运行测试</h3>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-dark-900 p-4 text-xs text-gray-300">
{`npx hardhat test`}
                </pre>
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">5. 启动前端</h3>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-dark-900 p-4 text-xs text-gray-300">
{`cd frontend
npm run dev
# 访问 http://localhost:3000`}
                </pre>
              </div>
            </div>
          </div>

          {/* Developer Resources */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold">开发者资源</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <a href="#" className="flex items-center gap-3 rounded-lg border border-dark-700 p-4 hover:border-primary-500">
                <Code className="h-8 w-8 text-primary-400" />
                <div>
                  <p className="font-medium text-white">合约 ABI</p>
                  <p className="text-xs text-gray-500">5 个核心合约完整接口</p>
                </div>
              </a>
              <a href="https://github.com/yuanlongdong/insurfi" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-dark-700 p-4 hover:border-primary-500">
                <Github className="h-8 w-8 text-primary-400" />
                <div>
                  <p className="font-medium text-white">GitHub 仓库</p>
                  <p className="text-xs text-gray-500">源代码和 issue 跟踪</p>
                </div>
              </a>
              <a href="#" className="flex items-center gap-3 rounded-lg border border-dark-700 p-4 hover:border-primary-500">
                <BookOpen className="h-8 w-8 text-primary-400" />
                <div>
                  <p className="font-medium text-white">部署指南</p>
                  <p className="text-xs text-gray-500">BSC 测试网/主网部署步骤</p>
                </div>
              </a>
              <a href="#" className="flex items-center gap-3 rounded-lg border border-dark-700 p-4 hover:border-primary-500">
                <FileText className="h-8 w-8 text-primary-400" />
                <div>
                  <p className="font-medium text-white">安全审计</p>
                  <p className="text-xs text-gray-500">审计报告和漏洞赏金计划</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
