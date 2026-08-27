"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Coins, TrendingUp, Clock, CheckCircle, Loader2, AlertCircle, ArrowUpRight } from "lucide-react";
import Link from "next/link";

// 占位 - 质押合约部署后替换为真实地址和 ABI
const STAKING_CONTRACT = "" as `0x${string}` | undefined;

export default function StakePage() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"stake" | "unstake">("stake");

  // 占位数据 - 质押合约部署后替换为真实链上读取
  const mockData = {
    totalStaked: "12,500,000",
    apy: "18.5",
    userStaked: "0",
    pendingRewards: "0",
    stakingPeriod: "灵活存取",
  };

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <AlertCircle className="mx-auto h-16 w-16 text-gray-600" />
        <h2 className="mt-6 text-2xl font-bold">请先连接钱包</h2>
        <p className="mt-2 text-gray-500">连接钱包后查看质押状态和收益</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">质押挖矿</h1>
      <p className="mt-2 text-gray-500">质押 INSUR 代币，获得协议收益分红</p>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600/20">
              <Coins className="h-5 w-5 text-primary-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">总质押量</p>
              <p className="text-lg font-bold text-white">{mockData.totalStaked} INSUR</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">年化收益 (APY)</p>
              <p className="text-lg font-bold text-green-400">{mockData.apy}%</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/20">
              <Clock className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">质押周期</p>
              <p className="text-lg font-bold text-white">{mockData.stakingPeriod}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600/20">
              <CheckCircle className="h-5 w-5 text-primary-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">我的质押</p>
              <p className="text-lg font-bold text-white">{mockData.userStaked} INSUR</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Stake/Unstake Form */}
        <div className="glass-card p-6">
          <div className="flex gap-2 rounded-lg bg-dark-700/50 p-1">
            <button
              onClick={() => setActiveTab("stake")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${activeTab === "stake" ? "bg-primary-600 text-white" : "text-gray-400 hover:text-white"}`}
            >
              质押
            </button>
            <button
              onClick={() => setActiveTab("unstake")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${activeTab === "unstake" ? "bg-primary-600 text-white" : "text-gray-400 hover:text-white"}`}
            >
              解除质押
            </button>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">
                {activeTab === "stake" ? "质押数量" : "解除数量"}
              </label>
              <span className="text-xs text-gray-500">
                可用: {activeTab === "stake" ? "— INSUR" : `${mockData.userStaked} INSUR`}
              </span>
            </div>
            <div className="mt-2 flex gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="flex-1 rounded-lg border border-dark-600 bg-dark-800 px-4 py-3 text-white placeholder-gray-600 focus:border-primary-500 focus:outline-none"
              />
              <button
                onClick={() => setAmount(activeTab === "stake" ? "1000" : mockData.userStaked)}
                className="rounded-lg border border-dark-600 px-4 text-sm text-gray-400 hover:border-primary-500 hover:text-white"
              >
                最大
              </button>
            </div>

            <div className="mt-4 rounded-lg bg-dark-700/50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">预计年化收益</span>
                <span className="text-green-400">{amount ? `${(parseFloat(amount) * 0.185 / 365).toFixed(2)} INSUR/天` : "—"}</span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-gray-500">解锁时间</span>
                <span className="text-white">立即解锁（灵活存取）</span>
              </div>
            </div>

            <button
              disabled={!amount || parseFloat(amount) <= 0}
              className="btn-primary mt-6 flex w-full items-center justify-center gap-2"
            >
              {activeTab === "stake" ? "确认质押" : "确认解除质押"}
            </button>
          </div>
        </div>

        {/* Rewards & Info */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold">待领取收益</h3>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-primary-400">{mockData.pendingRewards}</p>
                <p className="mt-1 text-sm text-gray-500">INSUR</p>
              </div>
              <button className="btn-primary flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> 领取收益
              </button>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold">质押说明</h3>
            <ul className="mt-4 space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary-400">•</span>
                质押 INSUR 即可获得协议收益分红，收益来源包括保险池收益、交易税分红等
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary-400">•</span>
                灵活存取，无锁仓期，可随时质押和解除质押
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary-400">•</span>
                收益按区块计算，解除质押时自动结算并领取
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary-400">•</span>
                质押中的 INSUR 仍享有治理投票权
              </li>
            </ul>
            <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
              <p className="text-xs text-yellow-400">⚠️ 质押功能即将上线，当前为预览页面</p>
            </div>
          </div>
        </div>
      </div>

      {/* Staking History */}
      <div className="mt-8 glass-card p-6">
        <h3 className="text-lg font-semibold">质押记录</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-700 text-left text-gray-500">
                <th className="pb-3 font-medium">类型</th>
                <th className="pb-3 font-medium">数量</th>
                <th className="pb-3 font-medium">时间</th>
                <th className="pb-3 font-medium">交易哈希</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">暂无质押记录</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
