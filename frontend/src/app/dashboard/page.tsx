"use client";

import { useAccount, useReadContract } from "wagmi";
import { Shield, Coins, TrendingDown, Award, AlertCircle, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { CONTRACT_ADDRESSES, INSUR_TOKEN_ABI, POLICY_MANAGER_ABI, INSURANCE_POOL_ABI } from "@/lib/contracts";
import { formatBNB, formatINSUR } from "@/lib/utils";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();

  const { data: insurBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.insurToken as `0x${string}` || undefined,
    abi: INSUR_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const { data: policyStatus } = useReadContract({
    address: CONTRACT_ADDRESSES.policyManager as `0x${string}` || undefined,
    abi: POLICY_MANAGER_ABI,
    functionName: "getPolicyStatus",
    args: address ? [address] : undefined,
  });

  const { data: userPayout } = useReadContract({
    address: CONTRACT_ADDRESSES.insurancePool as `0x${string}` || undefined,
    abi: INSURANCE_POOL_ABI,
    functionName: "userTotalPayout",
    args: address ? [address] : undefined,
  });

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <AlertCircle className="mx-auto h-16 w-16 text-gray-600" />
        <h2 className="mt-6 text-2xl font-bold">请先连接钱包</h2>
        <p className="mt-2 text-gray-500">连接钱包后查看您的保单状态和持仓信息</p>
      </div>
    );
  }

  const isActive = policyStatus?.[0] ?? false;
  const tier = policyStatus?.[1] ?? 0;
  const coverageLimit = policyStatus?.[2] ?? 0n;

  const tierNames = ["", "基础版", "进阶版", "尊享版"];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">我的保单</h1>
      <p className="mt-2 text-gray-500">查看您的保险状态、持仓和理赔历史</p>

      {/* Policy Status Card */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="glass-card lg:col-span-2 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isActive ? "bg-green-500/20" : "bg-gray-700/50"}`}>
                <Shield className={`h-6 w-6 ${isActive ? "text-green-400" : "text-gray-500"}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">保单状态</p>
                <p className={`text-xl font-bold ${isActive ? "text-green-400" : "text-gray-400"}`}>
                  {isActive ? `已激活 · ${tierNames[tier] || `Tier ${tier}`}` : "未激活"}
                </p>
              </div>
            </div>
            {isActive && (
              <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-400">ACTIVE</span>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-dark-700/50 p-4">
              <p className="text-xs text-gray-500">INSUR 持仓</p>
              <p className="mt-1 text-lg font-bold text-primary-400">{insurBalance ? formatINSUR(insurBalance) : "—"}</p>
            </div>
            <div className="rounded-lg bg-dark-700/50 p-4">
              <p className="text-xs text-gray-500">保障上限</p>
              <p className="mt-1 text-lg font-bold text-white">{isActive ? `${formatBNB(coverageLimit)} BNB` : "—"}</p>
            </div>
            <div className="rounded-lg bg-dark-700/50 p-4">
              <p className="text-xs text-gray-500">保单等级</p>
              <p className="mt-1 text-lg font-bold text-white">{isActive ? `Tier ${tier}` : "—"}</p>
            </div>
            <div className="rounded-lg bg-dark-700/50 p-4">
              <p className="text-xs text-gray-500">累计赔付</p>
              <p className="mt-1 text-lg font-bold text-green-400">{userPayout ? `${formatBNB(userPayout)} BNB` : "0 BNB"}</p>
            </div>
          </div>

          {!isActive && (
            <div className="mt-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-yellow-400" />
                <div>
                  <p className="text-sm font-medium text-yellow-400">保单未激活</p>
                  <p className="mt-1 text-sm text-gray-400">持有至少 1,000 INSUR 即可自动激活保单。当前持仓不足，请购买更多 INSUR 代币。</p>
                  <a href="https://pancakeswap.finance/swap" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300">
                    前往 PancakeSwap 购买 INSUR <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold">快捷操作</h3>
          <div className="mt-4 space-y-3">
            <Link href="/claim" className="flex items-center gap-3 rounded-lg bg-primary-600/20 p-3 text-primary-400 hover:bg-primary-600/30">
              <TrendingDown className="h-5 w-5" />
              <span className="text-sm font-medium">申请理赔</span>
            </Link>
            <a href="https://pancakeswap.finance/swap" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg bg-dark-700/50 p-3 text-gray-300 hover:bg-dark-700">
              <Coins className="h-5 w-5" />
              <span className="text-sm font-medium">购买 INSUR</span>
            </a>
            <Link href="/pool" className="flex items-center gap-3 rounded-lg bg-dark-700/50 p-3 text-gray-300 hover:bg-dark-700">
              <Award className="h-5 w-5" />
              <span className="text-sm font-medium">查看保险池</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Claim History */}
      <div className="mt-8 glass-card p-6">
        <h3 className="text-lg font-semibold">理赔历史</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-700 text-left text-gray-500">
                <th className="pb-3 font-medium">交易哈希</th>
                <th className="pb-3 font-medium">亏损金额</th>
                <th className="pb-3 font-medium">赔付金额</th>
                <th className="pb-3 font-medium">时间</th>
                <th className="pb-3 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">暂无理赔记录</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
