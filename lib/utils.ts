import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Tailwind-aware class-name joiner.
 * Usage: className={cn("p-4", isActive && "text-primary")}
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a numeric value in Namibian Dollars (NAD) by default.
 *    formatCurrency(1234.5)      → "N$1 234.50"
 *    formatCurrency(99, "USD")   → "$99.00"
 */
export const formatCurrency = (value: number | string, currency = "NAD") => {
  const num = typeof value === "string" ? Number.parseFloat(value) : Number(value || 0)

  if (currency === "NAD") {
    return `N$${num.toLocaleString("en-NA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  return new Intl.NumberFormat("en-NA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(num)
}
