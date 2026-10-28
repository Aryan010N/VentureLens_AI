import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "N/A";
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";

  if (abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  }
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(2)} Lakh`;
  }
  return `${sign}₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(abs)}`;
}

export function formatPct(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "N/A";
  return `${val.toFixed(1)}%`;
}
