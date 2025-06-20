import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a numeric value in Namibian Dollars (NAD).
 * Usage   formatCurrency(1234.5)  →  “N$1 234.50”
 */
export const formatCurrency = (value: number | string, currency: "NAD" | string = "NAD") => {
  const num = typeof value === "string" ? Number.parseFloat(value) : value
  if (currency === "NAD")
    return `N$${num.toLocaleString("en-NA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  return new Intl.NumberFormat("en-NA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(num)
}
