"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./WalletButton";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/dashboard", label: "我的保单" },
  { href: "/claim", label: "申请理赔" },
  { href: "/pool", label: "保险池" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-dark-700 bg-dark-900/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">InsurFi</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-primary-600/20 text-primary-400"
                  : "text-gray-400 hover:text-white"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <WalletButton />
      </div>
    </nav>
  );
}
