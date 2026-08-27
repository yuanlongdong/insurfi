"use client";

import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";
import { useState } from "react";
import { ChevronDown, Wallet, LogOut, Copy, ExternalLink } from "lucide-react";
import { formatAddress, formatBNB, bscScanUrl } from "@/lib/utils";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: bnbBalance } = useBalance({ address });
  const [showMenu, setShowMenu] = useState(false);
  const [showConnectors, setShowConnectors] = useState(false);

  if (!isConnected) {
    return (
      <div className="relative">
        <button onClick={() => setShowConnectors(!showConnectors)} className="btn-primary flex items-center gap-2 text-sm">
          <Wallet className="h-4 w-4" />
          连接钱包
        </button>
        {showConnectors && (
          <div className="absolute right-0 mt-2 w-48 rounded-lg border border-dark-700 bg-dark-800 p-2 shadow-xl">
            {connectors.map((connector) => (
              <button
                key={connector.uid}
                onClick={() => { connect({ connector }); setShowConnectors(false); }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-300 hover:bg-dark-700"
              >
                {connector.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button onClick={() => setShowMenu(!showMenu)} className="flex items-center gap-2 rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-sm hover:border-primary-500">
        <span className="font-mono text-gray-300">{formatAddress(address!)}</span>
        {bnbBalance && <span className="text-primary-400">{formatBNB(bnbBalance.value)} BNB</span>}
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>
      {showMenu && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg border border-dark-700 bg-dark-800 p-2 shadow-xl">
          <div className="border-b border-dark-700 px-3 py-2">
            <p className="text-xs text-gray-500">钱包地址</p>
            <p className="font-mono text-sm text-gray-300">{formatAddress(address!)}</p>
          </div>
          <button onClick={() => navigator.clipboard.writeText(address!)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-300 hover:bg-dark-700">
            <Copy className="h-4 w-4" /> 复制地址
          </button>
          <a href={bscScanUrl(address!)} target="_blank" rel="noopener noreferrer" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-300 hover:bg-dark-700">
            <ExternalLink className="h-4 w-4" /> BscScan 查看
          </a>
          <button onClick={() => disconnect()} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-400 hover:bg-dark-700">
            <LogOut className="h-4 w-4" /> 断开连接
          </button>
        </div>
      )}
    </div>
  );
}
