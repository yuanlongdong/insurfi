"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TrendingDown, Search, CheckCircle, XCircle, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { CONTRACT_ADDRESSES, LOSS_VERIFIER_ABI, DEX_ROUTER_ABI } from "@/lib/contracts";
import { formatBNB, formatAddress } from "@/lib/utils";

tradeInfo: {
  id: bigint;
  trader: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  amountOut: bigint;
  blockNumber: bigint;
  timestamp: bigint;
  isBuy: boolean;
} | null;

export default function ClaimPage() {
  const { address, isConnected } = useAccount();
  const [buyTradeId, setBuyTradeId] = useState("");
  const [sellTradeId, setSellTradeId] = useState("");
  const [step, setStep] = useState<"input" | "verifying" | "result">("input");
  const [error, setError] = useState("");

  const { writeContract, isPending: isWriting } = useWriteContract();

  // Preview loss calculation
  const { data: lossPreview, isLoading: isCalculating } = useReadContract({
    address: CONTRACT_ADDRESSES.lossVerifier as `0x${string}` || undefined,
    abi: LOSS_VERIFIER_ABI,
    functionName: "calculateLoss",
    args: buyTradeId && sellTradeId ? [BigInt(buyTradeId), BigInt(sellTradeId)] : undefined,
  });

  // Fetch buy trade info
  const { data: buyTrade } = useReadContract({
    address: CONTRACT_ADDRESSES.dexRouter as `0x${string}` || undefined,
    abi: DEX_ROUTER_ABI,
    functionName: "getTrade",
    args: buyTradeId ? [BigInt(buyTradeId)] : undefined,
  });

  // Fetch sell trade info
  const { data: sellTrade } = useReadContract({
    address: CONTRACT_ADDRESSES.dexRouter as `0x${string}` || undefined,
    abi: DEX_ROUTER_ABI,
    functionName: "getTrade",
    args: sellTradeId ? [BigInt(sellTradeId)] : undefined,
  });

  const handleVerify = () => {
    setError("");
    if (!buyTradeId || !sellTradeId) {
      setError("请输入买入和卖出交易 ID");
      return;
    }
    setStep("verifying");
    setTimeout(() => setStep("result"), 1500);
  };

  const handleClaim = () => {
    if (!buyTradeId || !sellTradeId) return;
    writeContract({
      address: CONTRACT_ADDRESSES.lossVerifier as `0x${string}`,
      abi: LOSS_VERIFIER_ABI,
      functionName: "verifyAndPayout",
      args: [BigInt(buyTradeId), BigInt(sellTradeId)],
    });
  };

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <AlertCircle className="mx-auto h-16 w-16 text-gray-600" />
        <h2 className="mt-6 text-2xl font-bold">请先连接钱包</h2>
        <p className="mt-2 text-gray-500">连接钱包后提交交易 ID 申请理赔</p>
      </div>
    );
  }

  const lossAmount = lossPreview?.[0];
  const isValid = lossPreview?.[1];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">申请理赔</h1>
      <p className="mt-2 text-gray-500">提交买入和卖出交易 ID，系统自动校验亏损并执行赔付</p>

      {/* Step indicator */}
      <div className="mt-8 flex items-center gap-4">
        {["输入交易 ID", "校验亏损", "确认赔付"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${step === "input" && i === 0 || step === "verifying" && i <= 1 || step === "result" ? "bg-primary-600 text-white" : "bg-dark-700 text-gray-500"}`}>
              {i + 1}
            </div>
            <span className={`text-sm ${i <= (step === "input" ? 0 : step === "verifying" ? 1 : 2) ? "text-white" : "text-gray-500"}`}>{s}</span>
            {i < 2 && <ArrowRight className="h-4 w-4 text-gray-600" />}
          </div>
        ))}
      </div>

      {/* Input Form */}
      {step === "input" && (
        <div className="mt-8 glass-card p-6">
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-300">买入交易 ID (Buy Trade ID)</label>
              <p className="mt-1 text-xs text-gray-500">通过 InsurFi DEX 代理买入代币的交易编号</p>
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  value={buyTradeId}
                  onChange={(e) => setBuyTradeId(e.target.value)}
                  placeholder="例如: 1"
                  className="flex-1 rounded-lg border border-dark-600 bg-dark-800 px-4 py-3 text-white placeholder-gray-600 focus:border-primary-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300">卖出交易 ID (Sell Trade ID)</label>
              <p className="mt-1 text-xs text-gray-500">通过 InsurFi DEX 代理卖出代币的交易编号</p>
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  value={sellTradeId}
                  onChange={(e) => setSellTradeId(e.target.value)}
                  placeholder="例如: 2"
                  className="flex-1 rounded-lg border border-dark-600 bg-dark-800 px-4 py-3 text-white placeholder-gray-600 focus:border-primary-500 focus:outline-none"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button onClick={handleVerify} className="btn-primary flex w-full items-center justify-center gap-2">
              <Search className="h-4 w-4" /> 校验交易
            </button>
          </div>

          {/* Guide */}
          <div className="mt-6 rounded-lg border border-dark-700 bg-dark-800/50 p-4">
            <h4 className="text-sm font-semibold text-gray-300">理赔指南</h4>
            <ul className="mt-2 space-y-1 text-xs text-gray-500">
              <li>• 必须通过 InsurFi DEX 代理进行交易才能获得理赔</li>
              <li>• 买入交易必须早于卖出交易</li>
              <li>• 卖出时必须持有有效保单（INSUR 持仓达标）</li>
              <li>• 赔付金额 = min(实际亏损 × 赔付比例, 保单保额上限)</li>
              <li>• 每对交易只能理赔一次</li>
            </ul>
          </div>
        </div>
      )}

      {/* Verifying */}
      {step === "verifying" && (
        <div className="mt-8 glass-card flex flex-col items-center p-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary-400" />
          <p className="mt-4 text-lg font-medium">正在校验交易数据...</p>
          <p className="mt-2 text-sm text-gray-500">解析交易记录、计算亏损金额、校验保单有效性</p>
        </div>
      )}

      {/* Result */}
      {step === "result" && (
        <div className="mt-8 space-y-6">
          {/* Trade details */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold">交易详情</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-dark-700/50 p-4">
                <p className="text-xs text-gray-500">买入交易 #{buyTradeId}</p>
                {buyTrade ? (
                  <div className="mt-2 space-y-1 text-sm">
                    <p>投入: <span className="text-white">{formatBNB(buyTrade.amountIn)} BNB</span></p>
                    <p>收到: <span className="text-white">{formatBNB(buyTrade.amountOut)} Token</span></p>
                    <p>交易者: <span className="font-mono text-gray-400">{formatAddress(buyTrade.trader)}</span></p>
                  </div>
                ) : <p className="mt-2 text-sm text-gray-500">加载中...</p>}
              </div>
              <div className="rounded-lg bg-dark-700/50 p-4">
                <p className="text-xs text-gray-500">卖出交易 #{sellTradeId}</p>
                {sellTrade ? (
                  <div className="mt-2 space-y-1 text-sm">
                    <p>投入: <span className="text-white">{formatBNB(sellTrade.amountIn)} Token</span></p>
                    <p>收到: <span className="text-white">{formatBNB(sellTrade.amountOut)} BNB</span></p>
                    <p>交易者: <span className="font-mono text-gray-400">{formatAddress(sellTrade.trader)}</span></p>
                  </div>
                ) : <p className="mt-2 text-sm text-gray-500">加载中...</p>}
              </div>
            </div>
          </div>

          {/* Loss & Payout */}
          <div className="glass-card p-6">
            {isValid ? (
              <>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-green-400" />
                  <div>
                    <p className="text-lg font-semibold text-green-400">校验通过</p>
                    <p className="text-sm text-gray-500">交易有效，可以申请理赔</p>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-lg bg-dark-700/50 p-4">
                    <p className="text-xs text-gray-500">实际亏损</p>
                    <p className="mt-1 text-xl font-bold text-red-400">{lossAmount ? `${formatBNB(lossAmount)} BNB` : "—"}</p>
                  </div>
                  <div className="rounded-lg bg-dark-700/50 p-4">
                    <p className="text-xs text-gray-500">赔付比例</p>
                    <p className="mt-1 text-xl font-bold text-white">50%</p>
                  </div>
                  <div className="rounded-lg bg-primary-600/20 p-4">
                    <p className="text-xs text-primary-400">预计赔付</p>
                    <p className="mt-1 text-xl font-bold text-primary-400">{lossAmount ? `${formatBNB(lossAmount * 50n / 100n)} BNB` : "—"}</p>
                  </div>
                </div>
                <button onClick={handleClaim} disabled={isWriting} className="btn-primary mt-6 flex w-full items-center justify-center gap-2">
                  {isWriting ? <><Loader2 className="h-4 w-4 animate-spin" /> 处理中...</> : <><TrendingDown className="h-4 w-4" /> 确认理赔</>}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-red-400" />
                <div>
                  <p className="text-lg font-semibold text-red-400">校验未通过</p>
                  <p className="text-sm text-gray-500">该交易对不符合理赔条件，请检查交易 ID 是否正确</p>
                </div>
              </div>
            )}
            <button onClick={() => { setStep("input"); setBuyTradeId(""); setSellTradeId(""); }} className="btn-outline mt-6 w-full">
              重新输入
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
