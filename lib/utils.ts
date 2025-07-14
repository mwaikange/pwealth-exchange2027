import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return "N$0.00"
  }
  return `N$${amount.toFixed(2)}`
}

export function formatShares(shares: number | undefined | null): string {
  if (shares === undefined || shares === null || isNaN(shares)) {
    return "0"
  }
  return shares.toFixed(0)
}
