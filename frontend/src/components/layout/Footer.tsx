import Link from "next/link";
import { Shield, Github, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-dark-700 bg-dark-900">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold gradient-text">InsurFi</span>
            </Link>
            <p className="mt-3 text-sm text-gray-500">BSC 链上面向合约交易者的交易亏损保险 DeFi 协议</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-300">产品</h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-500">
              <li><Link href="/dashboard" className="hover:text-primary-400">我的保单</Link></li>
              <li><Link href="/claim" className="hover:text-primary-400">申请理赔</Link></li>
              <li><Link href="/pool" className="hover:text-primary-400">保险池</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-300">资源</h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-500">
              <li><Link href="/docs" className="hover:text-primary-400">文档</Link></li>
              <li><a href="#" className="hover:text-primary-400">白皮书</a></li>
              <li><a href="#" className="hover:text-primary-400">审计报告</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-300">社区</h4>
            <div className="mt-3 flex gap-3">
              <a href="#" className="rounded-lg border border-dark-700 p-2 text-gray-400 hover:border-primary-500 hover:text-primary-400"><Twitter className="h-4 w-4" /></a>
              <a href="https://github.com/yuanlongdong/insurfi" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-dark-700 p-2 text-gray-400 hover:border-primary-500 hover:text-primary-400"><Github className="h-4 w-4" /></a>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-dark-700 pt-6 text-center text-xs text-gray-600">
          <p>InsurFi © 2026. 本项目处于开发阶段，合约未经审计，请勿在主网使用大额资金。</p>
        </div>
      </div>
    </footer>
  );
}
