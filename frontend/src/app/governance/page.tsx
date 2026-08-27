"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Vote, Clock, CheckCircle, XCircle, AlertCircle, ChevronRight, Users, TrendingUp } from "lucide-react";
import Link from "next/link";

type Proposal = {
  id: number;
  title: string;
  description: string;
  status: "active" | "passed" | "rejected" | "pending";
  forVotes: number;
  againstVotes: number;
  endTime: string;
  proposer: string;
  category: string;
};

const mockProposals: Proposal[] = [
  {
    id: 1,
    title: "将赔付比例从 50% 调整为 60%",
    description: "为提升保险吸引力，建议将默认赔付比例从 50% 提升至 60%，同时将尊享版保额上限从 2 BNB 提升至 3 BNB。",
    status: "active",
    forVotes: 8500000,
    againstVotes: 3200000,
    endTime: "2026-09-01 20:00",
    proposer: "0x1234...5678",
    category: "参数调整",
  },
  {
    id: 2,
    title: "新增 Biswap DEX 支持",
    description: "在 DEXRouter 中新增 Biswap 交易所支持，用户可通过 Biswap 进行交易并获得保险保障。",
    status: "active",
    forVotes: 12000000,
    againstVotes: 1500000,
    endTime: "2026-09-03 12:00",
    proposer: "0xabcd...ef01",
    category: "DEX 集成",
  },
  {
    id: 3,
    title: "启用保险池 Venus 收益策略",
    description: "将保险池 40% 闲置资金投入 Venus BNB 借贷市场，获得存款利息，收益的 50% 分配给 INSUR 质押者。",
    status: "passed",
    forVotes: 18500000,
    againstVotes: 800000,
    endTime: "2026-08-25 18:00",
    proposer: "0x9876...5432",
    category: "资金管理",
  },
  {
    id: 4,
    title: "将最小持仓阈值从 1000 降至 500 INSUR",
    description: "降低参保门槛，让更多小额交易者能够获得保险保障。预计将提升 30% 的参保用户数。",
    status: "rejected",
    forVotes: 4200000,
    againstVotes: 15800000,
    endTime: "2026-08-20 10:00",
    proposer: "0x5555...6666",
    category: "参数调整",
  },
];

const governanceParams = [
  { label: "赔付比例", value: "50%", changeable: true },
  { label: "最小亏损门槛", value: "0.001 BNB", changeable: true },
  { label: "最小持仓阈值", value: "1,000 INSUR", changeable: true },
  { label: "保单分级", value: "三级", changeable: true },
  { label: "支持 DEX 数量", value: "1 (PancakeSwap)", changeable: true },
  { label: "交易税率", value: "2% (迭代)", changeable: true },
];

export default function GovernancePage() {
  const { address, isConnected } = useAccount();
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "passed">("all");

  const filteredProposals = mockProposals.filter((p) => {
    if (activeTab === "active") return p.status === "active";
    if (activeTab === "passed") return p.status === "passed" || p.status === "rejected";
    return true;
  });

  const statusConfig = {
    active: { label: "投票中", color: "text-blue-400 bg-blue-500/20", icon: Clock },
    passed: { label: "已通过", color: "text-green-400 bg-green-500/20", icon: CheckCircle },
    rejected: { label: "已拒绝", color: "text-red-400 bg-red-500/20", icon: XCircle },
    pending: { label: "待开始", color: "text-gray-400 bg-gray-500/20", icon: Clock },
  };

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <AlertCircle className="mx-auto h-16 w-16 text-gray-600" />
        <h2 className="mt-6 text-2xl font-bold">请先连接钱包</h2>
        <p className="mt-2 text-gray-500">连接钱包后查看治理提案和投票</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">协议治理</h1>
      <p className="mt-2 text-gray-500">INSUR 持有者参与协议决策，投票决定协议参数和发展方向</p>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600/20">
              <Vote className="h-5 w-5 text-primary-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">活跃提案</p>
              <p className="text-lg font-bold text-white">{mockProposals.filter((p) => p.status === "active").length}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">已通过提案</p>
              <p className="text-lg font-bold text-white">{mockProposals.filter((p) => p.status === "passed").length}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/20">
              <Users className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">我的投票权</p>
              <p className="text-lg font-bold text-white">— INSUR</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Proposals List */}
        <div className="lg:col-span-2">
          <div className="flex gap-2">
            {[
              { key: "all", label: "全部" },
              { key: "active", label: "投票中" },
              { key: "passed", label: "已结束" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.key ? "bg-primary-600 text-white" : "bg-dark-700/50 text-gray-400 hover:text-white"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-4">
            {filteredProposals.map((proposal) => {
              const status = statusConfig[proposal.status];
              const totalVotes = proposal.forVotes + proposal.againstVotes;
              const forPercent = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;
              return (
                <div key={proposal.id} className="glass-card p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-dark-700 px-2 py-0.5 text-xs text-gray-400">#{proposal.id}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>{status.label}</span>
                        <span className="text-xs text-gray-500">{proposal.category}</span>
                      </div>
                      <h3 className="mt-2 text-lg font-semibold text-white">{proposal.title}</h3>
                      <p className="mt-1 text-sm text-gray-400 line-clamp-2">{proposal.description}</p>
                    </div>
                    <button
                      onClick={() => setSelectedProposal(proposal)}
                      className="ml-4 rounded-lg p-2 text-gray-400 hover:bg-dark-700 hover:text-white"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Vote Progress */}
                  <div className="mt-4">
                    <div className="flex h-2 overflow-hidden rounded-full bg-dark-700">
                      <div className="bg-green-500" style={{ width: `${forPercent}%` }} />
                      <div className="bg-red-500" style={{ width: `${100 - forPercent}%` }} />
                    </div>
                    <div className="mt-2 flex justify-between text-xs">
                      <span className="text-green-400">赞成 {(proposal.forVotes / 1e6).toFixed(1)}M ({forPercent.toFixed(1)}%)</span>
                      <span className="text-red-400">反对 {(proposal.againstVotes / 1e6).toFixed(1)}M ({(100 - forPercent).toFixed(1)}%)</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>提案者: {proposal.proposer}</span>
                    <span>截止: {proposal.endTime}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Governance Params */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold">可治理参数</h3>
            <div className="mt-4 space-y-3">
              {governanceParams.map((param) => (
                <div key={param.label} className="flex items-center justify-between rounded-lg bg-dark-700/50 px-4 py-3">
                  <span className="text-sm text-gray-400">{param.label}</span>
                  <span className="text-sm font-medium text-white">{param.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* How to vote */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold">如何投票</h3>
            <ol className="mt-4 space-y-3 text-sm text-gray-400">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">1</span>
                持有 INSUR 代币（质押中的 INSUR 同样享有投票权）
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">2</span>
                选择活跃提案，查看详情
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">3</span>
                点击「赞成」或「反对」进行链上投票
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">4</span>
                投票周期 72 小时，通过后经 Timelock 延迟执行
              </li>
            </ol>
          </div>

          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
            <p className="text-xs text-yellow-400">⚠️ 治理模块即将上线，当前为预览页面</p>
          </div>
        </div>
      </div>

      {/* Proposal Detail Modal */}
      {selectedProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedProposal(null)}>
          <div className="glass-card max-h-[80vh] w-full max-w-2xl overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-dark-700 px-2 py-0.5 text-xs text-gray-400">#{selectedProposal.id}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig[selectedProposal.status].color}`}>
                    {statusConfig[selectedProposal.status].label}
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-bold">{selectedProposal.title}</h2>
              </div>
              <button onClick={() => setSelectedProposal(null)} className="rounded-lg p-2 text-gray-400 hover:bg-dark-700 hover:text-white">
                ✕
              </button>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-300">提案描述</h4>
              <p className="mt-2 text-sm text-gray-400">{selectedProposal.description}</p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-green-500/10 p-4">
                <p className="text-xs text-green-400">赞成票</p>
                <p className="mt-1 text-2xl font-bold text-green-400">{(selectedProposal.forVotes / 1e6).toFixed(1)}M</p>
              </div>
              <div className="rounded-lg bg-red-500/10 p-4">
                <p className="text-xs text-red-400">反对票</p>
                <p className="mt-1 text-2xl font-bold text-red-400">{(selectedProposal.againstVotes / 1e6).toFixed(1)}M</p>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-500">
              <p>提案者: {selectedProposal.proposer}</p>
              <p className="mt-1">截止时间: {selectedProposal.endTime}</p>
            </div>

            {selectedProposal.status === "active" && (
              <div className="mt-6 flex gap-3">
                <button className="btn-primary flex flex-1 items-center justify-center gap-2 bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4" /> 赞成
                </button>
                <button className="btn-outline flex flex-1 items-center justify-center gap-2 border-red-500/50 text-red-400 hover:border-red-500">
                  <XCircle className="h-4 w-4" /> 反对
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
