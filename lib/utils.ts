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
 * Usage: formatCurrency(1234.5) → "N$1,234.50"
 */
export const formatCurrency = (value: number | string, currency = "NAD") => {
  const number = typeof value === "string" ? Number.parseFloat(value) : value

  if (currency === "NAD") {
    return `N$${number.toLocaleString("en-NA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  return new Intl.NumberFormat("en-NA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(number)
}

/**
 * Format date like "20 June 2025"
 */
export const formatDate = (date: Date | string) => {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-NA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

/**
 * Format number with commas (e.g., 1,000,000)
 */
export const formatNumber = (value: number | string) => {
  const number = typeof value === "string" ? Number.parseFloat(value) : value
  return new Intl.NumberFormat("en-NA").format(number)
}

/**
 * Convert days to readable time (e.g., "5 days", "1 day left")
 */
export const formatDays = (days: number) => {
  return days === 1 ? "1 day" : `${days} days`
}

/**
 * Convert seconds to HH:MM:SS (for countdowns or timers)
 */
export const formatTime = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0")
  const mins = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0")
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")

  return `${hrs}:${mins}:${secs}`
}

/**
 * Capitalize first letter of each word
 */
export const capitalizeWords = (str: string) => {
  return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
}
