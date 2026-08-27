"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import {
  Shield,
  TrendingDown,
  Zap,
  Lock,
  ChevronRight,
  Coins,
  BarChart3,
  Layers,
  CheckCircle2,
  ArrowRight,
  Github,
  Twitter,
  FileText,
  Sparkles,
  Timer,
  Percent,
  Calendar,
} from "lucide-react";

export default function HomePage() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen">
      {/* ===== Hero Section ===== */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary-600/20 blur-[120px]" />
          <div className="absolute top-20 right-0 h-[300px] w-[300px] rounded-full bg-cyan-500/10 blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-4 py-1.5 text-sm text-primary-300">
            <Sparkles className="h-4 w-4" />
            BSC 链上首个交易亏损保险协议
          </div>

          <h1 className="mt-8 text-5xl font-bold leading-tight tracking-tight sm:text-6xl md:text-7xl">
            交易亏损，
            <span className="bg-gradient-to-r from-primary-400 to-cyan-400 bg-clip-text text-transparent">
              链上自动赔
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400 sm:text-xl">
            持有 INSUR 代币即自动激活保单，在 DEX 交易亏损后一键理赔，BNB 秒到账。
            不是保本盘，不是 meme，是工具型 DeFi 保险协议。
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={isConnected ? "/dashboard" : "/claim"}
              className="btn-primary flex items-center gap-2 px-8 py-3.5 text-lg"
            >
              {isConnected ? "进入仪表盘" : "开始理赔"}
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/docs"
              className="btn-outline flex items-center gap-2 px-8 py-3.5 text-lg"
            >
              <FileText className="h-5 w-5" />
              阅读文档
            </Link>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { label: "赔付比例", value: "50%" },
              { label: "理赔速度", value: "< 5s" },
              { label: "安全审计", value: "9 项修复" },
              { label: "风控机制", value: "3 重防护" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Core Features ===== */}
      <section className="border-t border-dark-700/50 bg-dark-900/50 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">为什么选择 InsurFi</h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-400">
              传统 DeFi 保险只保智能合约漏洞，我们保你的交易亏损
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Zap,
                title: "链上自动校验",
                desc: "买卖交易记录上链，亏损金额自动计算，无需人工审核，1个区块内完成赔付。",
                color: "text-yellow-400",
                bg: "bg-yellow-500/10",
              },
              {
                icon: Coins,
                title: "持仓即参保",
                desc: "持有 ≥1000 INSUR 自动激活保单，无需额外支付保费，无需手动购买。",
                color: "text-primary-400",
                bg: "bg-primary-500/10",
              },
              {
                icon: TrendingDown,
                title: "BNB 秒级赔付",
                desc: "赔付以 BNB 直接到账，价值稳定，可立即使用。不是项目代币，没有抛压。",
                color: "text-green-400",
                bg: "bg-green-500/10",
              },
              {
                icon: Shield,
                title: "三重风控防护",
                desc: "24小时等待期 + 10%免赔额 + 月度限额，防止逆向选择和道德风险。",
                color: "text-cyan-400",
                bg: "bg-cyan-500/10",
              },
              {
                icon: Lock,
                title: "防骗保机制",
                desc: "持仓快照 + 交易对去重 + 买卖时间校验 + 闪电贷防护，多重机制确保安全。",
                color: "text-purple-400",
                bg: "bg-purple-500/10",
              },
              {
                icon: Layers,
                title: "三级保单分级",
                desc: "基础版/进阶版/尊享版，持仓量决定赔付上限，最高单笔赔付 2 BNB。",
                color: "text-orange-400",
                bg: "bg-orange-500/10",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="glass-card group p-6 transition-all hover:border-primary-500/30"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${feature.bg}`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== How It Works ===== */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">三步完成理赔</h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-400">
              从持仓参保到 BNB 到账，全程链上自动，无需人工干预
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                icon: Coins,
                title: "持仓激活保单",
                desc: "买入并持有 ≥1000 INSUR 代币，等待 24 小时后保单自动激活。持仓量决定保单等级和赔付上限。",
              },
              {
                step: "02",
                icon: BarChart3,
                title: "通过 DEXRouter 交易",
                desc: "在 InsurFi DApp 内通过 DEXRouter 进行代币买卖，每笔交易自动上链记录，作为理赔依据。",
              },
              {
                step: "03",
                icon: TrendingDown,
                title: "亏损一键理赔",
                desc: "卖出亏损后，在理赔页面选择买卖交易对，点击理赔。链上自动校验，BNB 秒到钱包。",
              },
            ].map((item, index) => (
              <div key={item.step} className="relative">
                {/* Connector line */}
                {index < 2 && (
                  <div className="absolute top-12 left-full hidden h-px w-full bg-gradient-to-r from-primary-500/50 to-transparent md:block" />
                )}
                <div className="glass-card h-full p-8">
                  <div className="flex items-center justify-between">
                    <span className="text-5xl font-bold text-dark-600">{item.step}</span>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/10">
                      <item.icon className="h-6 w-6 text-primary-400" />
                    </div>
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Policy Tiers ===== */}
      <section className="border-t border-dark-700/50 bg-dark-900/50 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">保单分级</h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-400">
              持仓量决定保单等级，持有越多，赔付上限越高
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                name: "基础版",
                holdings: "1,000 INSUR",
                maxPayout: "0.5 BNB",
                ratio: "50%",
                features: ["交易亏损赔付", "链上自动校验", "BNB 秒级到账", "三重风控保护"],
                popular: false,
                cta: "买入 1000 INSUR",
              },
              {
                name: "进阶版",
                holdings: "5,000 INSUR",
                maxPayout: "1 BNB",
                ratio: "50%",
                features: ["基础版全部功能", "赔付上限翻倍", "优先客服支持", "治理投票权"],
                popular: true,
                cta: "买入 5000 INSUR",
              },
              {
                name: "尊享版",
                holdings: "20,000 INSUR",
                maxPayout: "2 BNB",
                ratio: "50%",
                features: ["进阶版全部功能", "最高赔付上限", "API 接入权限", "专属客户经理"],
                popular: false,
                cta: "买入 20000 INSUR",
              },
            ].map((tier) => (
              <div
                key={tier.name}
                className={`relative glass-card p-8 ${tier.popular ? "border-primary-500/50 ring-1 ring-primary-500/30" : ""}`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-4 py-1 text-xs font-semibold text-white">
                    最受欢迎
                  </div>
                )}
                <h3 className="text-xl font-semibold text-white">{tier.name}</h3>
                <p className="mt-2 text-sm text-gray-500">最低持仓</p>
                <p className="text-2xl font-bold text-primary-400">{tier.holdings}</p>

                <div className="mt-6 space-y-3 border-t border-dark-700 pt-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">赔付比例</span>
                    <span className="text-sm font-medium text-white">{tier.ratio}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">单笔上限</span>
                    <span className="text-sm font-medium text-white">{tier.maxPayout}</span>
                  </div>
                </div>

                <ul className="mt-6 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-400" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  className={`mt-8 w-full rounded-lg py-3 text-sm font-semibold transition-colors ${
                    tier.popular
                      ? "bg-primary-600 text-white hover:bg-primary-700"
                      : "border border-dark-600 text-white hover:border-primary-500"
                  }`}
                >
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Security Highlights ===== */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-1.5 text-sm text-green-400">
                <Shield className="h-4 w-4" />
                安全优先
              </div>
              <h2 className="mt-6 text-3xl font-bold sm:text-4xl">经过全面安全审计</h2>
              <p className="mt-4 text-gray-400">
                5 个核心合约经过逐行安全审计，发现并修复 9 个安全问题，包括 2 个高危漏洞。
                主网上线前将进行第三方专业审计。
              </p>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  { icon: Timer, label: "持仓时间锁", desc: "10区块防闪电贷" },
                  { icon: Percent, label: "免赔额机制", desc: "前10%亏损不赔" },
                  { icon: Calendar, label: "月度限额", desc: "5次/5 BNB上限" },
                  { icon: Lock, label: "交易对去重", desc: "防止重复理赔" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-dark-700">
                      <item.icon className="h-5 w-5 text-primary-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/docs"
                className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-primary-400 hover:text-primary-300"
              >
                查看完整安全审计报告
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Security card visual */}
            <div className="glass-card p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
                  <Shield className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">安全审计报告</p>
                  <p className="text-xs text-gray-500">v1.0 · 2026-08-28</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {[
                  { label: "高危问题", count: 2, status: "已修复", color: "text-red-400" },
                  { label: "中危问题", count: 3, status: "已修复", color: "text-orange-400" },
                  { label: "低危问题", count: 4, status: "已修复", color: "text-yellow-400" },
                  { label: "优化建议", count: 5, status: "记录中", color: "text-blue-400" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-lg bg-dark-800/50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl font-bold ${item.color}`}>{item.count}</span>
                      <span className="text-sm text-gray-300">{item.label}</span>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <CheckCircle2 className="h-3 w-3" />
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-lg border border-primary-500/20 bg-primary-500/5 p-4">
                <p className="text-xs text-gray-400">
                  主网上线前必须完成：第三方专业审计（CertiK/SlowMist/PeckShield）、测试网运行 ≥2 周、多签钱包配置、紧急响应预案。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Roadmap ===== */}
      <section className="border-t border-dark-700/50 bg-dark-900/50 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">发展路线图</h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-400">
              从 BSC 交易亏损保险到模块化保险中间件
            </p>
          </div>

          <div className="mt-16 space-y-8">
            {[
              {
                phase: "阶段 1",
                title: "测试网验证",
                time: "2026 Q3",
                status: "进行中",
                items: ["BSC 测试网部署", "100 名测试用户", "风控参数调优", "第三方安全审计"],
                color: "border-primary-500",
              },
              {
                phase: "阶段 2",
                title: "主网软启动",
                time: "2026 Q4",
                status: "待开始",
                items: ["主网上线（保守参数）", "保险池 ≤100 BNB", "1000 名种子用户", "首批赔付记录"],
                color: "border-dark-600",
              },
              {
                phase: "阶段 3",
                title: "增长期",
                time: "2027 Q1-Q2",
                status: "待开始",
                items: ["放宽风控参数", "接入更多 DEX", "流动性挖矿", "用户 5000-10000"],
                color: "border-dark-600",
              },
              {
                phase: "阶段 4",
                title: "生态扩展",
                time: "2027 Q3+",
                status: "待开始",
                items: ["保险模块对外输出", "跨链扩展", "机构级方案", "被收购/独立发展"],
                color: "border-dark-600",
              },
            ].map((phase) => (
              <div key={phase.phase} className={`glass-card border-l-4 ${phase.color} p-6`}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="rounded-full bg-dark-700 px-3 py-1 text-xs font-medium text-gray-400">
                      {phase.phase}
                    </span>
                    <h3 className="text-lg font-semibold text-white">{phase.title}</h3>
                    <span className="text-sm text-gray-500">{phase.time}</span>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      phase.status === "进行中"
                        ? "bg-primary-500/20 text-primary-400"
                        : "bg-dark-700 text-gray-500"
                    }`}
                  >
                    {phase.status}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {phase.items.map((item) => (
                    <span
                      key={item}
                      className="rounded-md bg-dark-800 px-3 py-1.5 text-xs text-gray-400"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA Section ===== */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-4">
          <div className="glass-card relative overflow-hidden p-12 text-center">
            <div className="pointer-events-none absolute -top-20 left-1/2 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-primary-600/20 blur-[80px]" />
            <div className="relative">
              <h2 className="text-3xl font-bold sm:text-4xl">准备好保护你的交易了吗？</h2>
              <p className="mx-auto mt-4 max-w-xl text-gray-400">
                持有 INSUR，交易亏损不再裸奔。加入 BSC 链上首个交易亏损保险协议。
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/dashboard" className="btn-primary flex items-center gap-2 px-8 py-3.5 text-lg">
                  立即开始
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link href="/docs" className="btn-outline flex items-center gap-2 px-8 py-3.5 text-lg">
                  <Github className="h-5 w-5" />
                  查看源码
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-dark-700/50 bg-dark-900 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">InsurFi</span>
              </div>
              <p className="mt-4 text-sm text-gray-500">
                BSC 链上交易亏损保险协议
              </p>
              <div className="mt-4 flex gap-3">
                <a href="#" className="text-gray-500 hover:text-white">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="https://github.com/yuanlongdong/insurfi" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white">
                  <Github className="h-5 w-5" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white">产品</h4>
              <ul className="mt-4 space-y-2">
                <li><Link href="/dashboard" className="text-sm text-gray-500 hover:text-white">仪表盘</Link></li>
                <li><Link href="/claim" className="text-sm text-gray-500 hover:text-white">理赔</Link></li>
                <li><Link href="/pool" className="text-sm text-gray-500 hover:text-white">保险池</Link></li>
                <li><Link href="/stake" className="text-sm text-gray-500 hover:text-white">质押</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white">资源</h4>
              <ul className="mt-4 space-y-2">
                <li><Link href="/docs" className="text-sm text-gray-500 hover:text-white">文档</Link></li>
                <li><Link href="/governance" className="text-sm text-gray-500 hover:text-white">治理</Link></li>
                <li><a href="#" className="text-sm text-gray-500 hover:text-white">白皮书</a></li>
                <li><a href="#" className="text-sm text-gray-500 hover:text-white">审计报告</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white">合约地址</h4>
              <ul className="mt-4 space-y-2">
                <li className="text-xs text-gray-500">INSUR: 待部署</li>
                <li className="text-xs text-gray-500">Pool: 待部署</li>
                <li className="text-xs text-gray-500">Verifier: 待部署</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-dark-700/50 pt-8 text-center">
            <p className="text-xs text-gray-600">
              © 2026 InsurFi. 本协议不构成金融建议，使用前请了解风险。
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
