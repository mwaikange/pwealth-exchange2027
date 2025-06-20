"use client"

import { formatNAD, formatShares } from "@/data/shares-supply"
import { calculateShareValue } from "@/lib/price-calculations"

interface WalletAmountCardProps {
  title: string
  amount: number
  isShares?: boolean // true for share amounts, false for NAD amounts
  subtitle?: string
  pricePerShare?: number
}

export default function WalletAmountCard({
  title,
  amount,
  isShares = false,
  subtitle,
  pricePerShare = 100,
}: WalletAmountCardProps) {
  return (
    <div>
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{title}</div>

      {isShares ? (
        // Display for shares
        <>
          <div className="text-2xl font-bold text-black dark:text-white mb-1">{formatShares(amount)}</div>
          <div className="text-lg font-semibold text-green-600 dark:text-green-400 mb-1">
            ≈ {formatNAD(calculateShareValue(amount, pricePerShare))}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500">@ {formatNAD(pricePerShare)} per share</div>
        </>
      ) : (
        // Display for NAD amounts
        <>
          <div className="text-2xl font-bold text-black dark:text-white mb-1">{formatNAD(amount)}</div>
          {subtitle && <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{subtitle}</div>}
        </>
      )}
    </div>
  )
}
