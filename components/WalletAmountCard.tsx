"use client"

import { formatNAD, formatShares, calculateShareValue } from "@/lib/price-calculations"

interface WalletAmountCardProps {
  title: string
  shares: number
  subtitle?: string
  pricePerShare?: number
}

export default function WalletAmountCard({ title, shares, subtitle, pricePerShare = 100 }: WalletAmountCardProps) {
  const estimatedValue = calculateShareValue(shares, pricePerShare)

  return (
    <div>
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{title}</div>

      {/* Share Count */}
      <div className="text-2xl font-bold text-black dark:text-white mb-1">{formatShares(shares)}</div>

      {/* Estimated NAD Value */}
      <div className="text-lg font-semibold text-green-600 dark:text-green-400 mb-1">≈ {formatNAD(estimatedValue)}</div>

      {subtitle && <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{subtitle}</div>}

      {/* Price per share info */}
      <div className="text-xs text-gray-500 dark:text-gray-500">@ {formatNAD(pricePerShare)} per share</div>
    </div>
  )
}
