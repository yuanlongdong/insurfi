import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/Web3Provider";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "InsurFi - BSC 链上交易亏损保险协议",
  description:
    "持有 INSUR 代币即自动激活保单，DEX 交易亏损后一键理赔，BNB 秒到账。BSC 链上首个交易亏损保险 DeFi 协议。",
  keywords: ["InsurFi", "DeFi 保险", "交易亏损保险", "BSC", "INSUR 代币", "智能合约保险"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} bg-dark-900 text-white min-h-screen`}>
        <Web3Provider>
          <Navbar />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        </Web3Provider>
      </body>
    </html>
  );
}
