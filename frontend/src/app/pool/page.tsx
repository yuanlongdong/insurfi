"use client";

import { useReadContract } from "wagmi";
import { Coins, TrendingDown, Zap, Activity, AlertTriangle, Wallet } from "lucide-react";
import { CONTRACT_ADDRESSES, INSURANCE_POOL_ABI, LOSS_VERIFIER_ABI } from "@/lib/contracts";
import { formatBNB } from "@/lib/utils";

export default function PoolPage() {
  const { data: poolBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.insurancePool as `0x${string}` || undefined,
    abi: INSURANCE_POOL_ABI,
    functionName: "getPoolBalance",
  });

  const { data: totalDeposited } = useReadContract({
    address: CONTRACT_ADDRESSES.insurancePool as `0x${string}` || undefined,
    abi: INSURANCE_POOL_ABI,
    functionName: "totalDeposited",
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

  const { data: isPaused } = useReadContract({
    address: CONTRACT_ADDRESSES.insurancePool as `0x${string}` || undefined,
    abi: INSURANCE_POOL_ABI,
    functionName: "paused",
  });

  const { data: payoutRatio } = useReadContract({
    address: CONTRACT_ADDRESSES.lossVerifier as `0x${string}` || undefined,
    abi: LOSS_VERIFIER_ABI,
    functionName: "payoutRatio",
  });

  const { data: minLossAmount } = useReadContract({
    address: CONTRACT_ADDRESSES.lossVerifier as `0x${string}` || undefined,
    abi: LOSS_VERIFIER_ABI,
    functionName: "minLossAmount",
  });

  const stats = [
    { label: "池余额", value: poolBalance ? `${formatBNB(poolBalance)} BNB` : "—", icon: Coins, color: "text-primary-400" },
    { label: "累计存入", value: totalDeposited ? `${formatBNB(totalDeposited)} BNB` : "—", icon: Wallet, color: "text-green-400" },
    { label: "累计赔付", value: totalPaidOut ? `${formatBNB(totalPaidOut)} BNB` : "—", icon: TrendingDown, color: "text-red-400" },
    { label: "赔付次数", value: payoutCount ? payoutCount.toString() : "—", icon: Zap, color: "text-yellow-400" },
  ];

  const payoutRate = totalDeposited && totalPaidOut ? (Number(totalPaidOut) / Number(totalDeposited) * 100).toFixed(1) : "0";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">保险池</h1>
          <p className="mt-2 text-gray-500">查看保险资金池状况、赔付统计和池参数</p>
        </div>
        {isPaused && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <span className="text-sm font-medium text-red-400">保险池已暂停</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-dark-700/50">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-lg font-bold text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pool Health */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold">池健康度</h3>
          <div className="mt-6 space-y-4">
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">赔付率 (累计赔付/累计存入)</span>
                <span className="font-medium text-white">{payoutRate}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-dark-700">
                <div className="h-2 rounded-full bg-primary-500" style={{ width: `${Math.min(Number(payoutRate), 100)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">资金利用率</span>
                <span className="font-medium text-white">{totalDeposited && poolBalance ? ((1 - Number(poolBalance) / Number(totalDeposited)) * 100).toFixed(1) : "0"}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-dark-700">
                <div className="h-2 rounded-full bg-green-500" style={{ width: `${totalDeposited && poolBalance ? Math.min((1 - Number(poolBalance) / Number(totalDeposited)) * 100, 100) : 0}%` }} />
              </div>
            </div>
          </div>
          <div className="mt-6 rounded-lg bg-dark-700/50 p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary-400" />
              <span className="text-sm font-medium">偿付能力</span>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              当前池余额 {poolBalance ? formatBNB(poolBalance) : "—"} BNB，
              可支持最多 {poolBalance ? formatBNB(poolBalance) : "—"} BNB 的赔付需求。
              池余额低于预警线时将触发资金补充机制。
            </p>
          </div>
        </div>

        {/* Pool Parameters */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold">池参数</h3>
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-dark-700/50 p-4">
              <div>
                <p className="text-sm text-gray-400">赔付比例</p>
                <p className="text-xs text-gray-600">亏损金额的赔付百分比</p>
              </div>
              <p className="text-xl font-bold text-primary-400">{payoutRatio ? `${Number(payoutRatio) / 100}%` : "50%"}</p>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-dark-700/50 p-4">
              <div>
                <p className="text-sm text-gray-400">最小理赔亏损额</p>
                <p className="text-xs text-gray-600">低于此金额的亏损不予理赔</p>
              </div>
              <p className="text-xl font-bold text-white">{minLossAmount ? `${formatBNB(minLossAmount)} BNB` : "0.001 BNB"}</p>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-dark-700/50 p-4">
              <div>
                <p className="text-sm text-gray-400">池状态</p>
                <p className="text-xs text-gray-600">当前保险池运行状态</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${isPaused ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
                {isPaused ? "已暂停" : "运行中"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Payouts */}
      <div className="mt-6 glass-card p-6">
        <h3 className="text-lg font-semibold">最近赔付记录</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-700 text-left text-gray-500">
                <th className="pb-3 font-medium">用户</th>
                <th className="pb-3 font-medium">赔付金额</th>
                <th className="pb-3 font-medium">理赔 ID</th>
                <th className="pb-3 font-medium">时间</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">暂无赔付记录</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
