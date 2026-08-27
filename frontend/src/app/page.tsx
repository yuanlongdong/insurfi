"use client";

import Link from "next/link";
import { Shield, TrendingDown, Wallet, ArrowRight, Zap, Lock, Coins } from "lucide-react";
import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESSES, INSURANCE_POOL_ABI } from "@/lib/contracts";
import { formatBNB } from "@/lib/utils";

export default function HomePage() {
  const { data: poolBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.insurancePool as `0x${string}` || undefined,
    abi: INSURANCE_POOL_ABI,
    functionName: "getPoolBalance",
  });

  const { data: totalPaidOut } = useReadContract({
    address: CONTRACT_ADDRESSES.insurancePool as `0x${string}` || undefined,
    abi: INSURANCE_POOL_ABI,
    functionName: "totalPaidOut",
  });

  const { data: payoutCount } = useReadContract({
    address: CONTRACT_ADDRESSES.insurancePool as `0x${string}` || undefined,
    abi: INSURANCE_POOL_ABI,
    functionName: "payoutCount",
  });

  const stats = [
    { label: "保险池余额", value: poolBalance ? `${formatBNB(poolBalance)} BNB` : "—", icon: Coins },
    { label: "累计赔付", value: totalPaidOut ? `${formatBNB(totalPaidOut)} BNB` : "—", icon: TrendingDown },
    { label: "赔付次数", value: payoutCount ? payoutCount.toString() : "—", icon: Zap },
  ];

  const steps = [
    { icon: Coins, title: "持有 INSUR", desc: "持有一定数量 INSUR 代币，自动激活保险保单，无需额外付费" },
    { icon: TrendingDown, title: "交易亏损", desc: "通过 InsurFi DEX 代理进行链上交易，产生亏损后系统自动记录" },
    { icon: Wallet, title: "BNB 赔付", desc: "提交买卖交易对，链上校验通过后保险池 BNB 直接赔付到钱包" },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-900/20 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 text-center md:py-28">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600/20 border border-primary-500/30">
            <Shield className="h-8 w-8 text-primary-400" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            <span className="gradient-text">InsurFi</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400 md:text-xl">
            BSC 链上面向合约交易者的<span className="text-primary-400 font-semibold">交易亏损保险</span> DeFi 协议
            <br />持有 INSUR 即参保，亏损自动校验，BNB 即时赔付
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/dashboard" className="btn-primary flex items-center gap-2">
              立即参保 <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/claim" className="btn-outline flex items-center gap-2">
              申请理赔
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-dark-700 bg-dark-800/30">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-10 md:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-card flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600/20">
                <stat.icon className="h-6 w-6 text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold">工作原理</h2>
          <p className="mt-3 text-gray-500">三步完成参保到赔付的全流程</p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.title} className="relative glass-card p-8">
              <div className="absolute -top-4 left-8 flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
                {i + 1}
              </div>
              <step.icon className="h-10 w-10 text-primary-400" />
              <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-gray-400">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-dark-700 bg-dark-800/30">
        <div className="mx-auto max-w-7xl px-4 py-20">
          <div className="text-center">
            <h2 className="text-3xl font-bold">核心优势</h2>
            <p className="mt-3 text-gray-500">为什么选择 InsurFi</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Zap, title: "持仓即参保", desc: "持有 INSUR 自动激活保单，无需额外购买保险产品，零摩擦参保体验" },
              { icon: Lock, title: "链上自动校验", desc: "亏损数据通过链上交易记录自动校验，无需人工审核，透明可信" },
              { icon: Wallet, title: "BNB 即时赔付", desc: "校验通过后保险池 BNB 直接转账到用户钱包，无需等待提现" },
              { icon: Shield, title: "防骗保机制", desc: "持仓快照机制确保交易发生时保单已激活，防止亏损后买入骗保" },
              { icon: Coins, title: "保单分级", desc: "不同 INSUR 持仓量对应不同保障上限，持仓越多保额越高" },
              { icon: TrendingDown, title: "多 DEX 支持", desc: "支持 PancakeSwap 等主流 DEX，覆盖 BSC 链上主要交易场景" },
            ].map((feature) => (
              <div key={feature.title} className="glass-card p-6">
                <feature.icon className="h-8 w-8 text-primary-400" />
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="glass-card relative overflow-hidden p-12 text-center">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-900/30 to-transparent" />
          <div className="relative">
            <h2 className="text-3xl font-bold">准备好保护你的交易了吗？</h2>
            <p className="mx-auto mt-3 max-w-xl text-gray-400">持有 INSUR 代币即可自动参保，让每一笔交易都有保障</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/dashboard" className="btn-primary flex items-center gap-2">查看我的保单 <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/pool" className="btn-outline">了解保险池</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
