import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format probability bps (0..10000) as a percentage string, e.g. 6125 -> "61.25". */
export function bpsToPct(bps: number, decimals = 2): string {
  return (bps / 100).toFixed(decimals);
}

/** Format a USDC base-unit amount (6 decimals) as a human string. */
export function formatUsdc(baseUnits: number, decimals = 2): string {
  return (baseUnits / 1_000_000).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Signed number with a leading + / − and fixed decimals. */
export function signed(n: number, decimals = 2): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(decimals)}`;
}
