import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBNB(amount: bigint | number | string): string {
  const value = typeof amount === "bigint" ? Number(amount) / 1e18 : Number(amount) / 1e18;
  if (value === 0) return "0";
  if (value < 0.001) return value.toFixed(6);
  if (value < 1) return value.toFixed(4);
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatINSUR(amount: bigint | number | string): string {
  const value = typeof amount === "bigint" ? Number(amount) / 1e18 : Number(amount) / 1e18;
  if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
  if (value >= 1000) return (value / 1000).toFixed(1) + "K";
  return value.toFixed(0);
}

export function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTimestamp(timestamp: bigint | number): string {
  const ts = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  return new Date(ts * 1000).toLocaleString();
}

export function bscScanUrl(address: string, type: "address" | "tx" = "address"): string {
  const base = "https://bscscan.com";
  return `${base}/${type}/${address}`;
}
