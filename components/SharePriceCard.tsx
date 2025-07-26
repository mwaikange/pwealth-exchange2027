"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { usePrice } from "@/contexts/price-context"

export default function SharePriceCard() {
  const { priceData, loading, error } = usePrice()

  // Format currency with NaN protection
  const formatCurrency = (value: number): string => {
    const safeValue = isNaN(value) ? 0 : value
    return `N$${safeValue.toFixed(2)}`
  }

  // Format percentage with NaN protection
  const formatPercentage = (value: number): string => {
    const safeValue = isNaN(value) ? 0 : value
    return `${safeValue >= 0 ? "+" : ""}${safeValue.toFixed(2)}%`
  }

  // Get trend icon and color
  const getTrendInfo = () => {
    const change = priceData.priceChangePercentage
    if (isNaN(change) || change === 0) {
      return {
        icon: Minus,
        color: "text-gray-500",
        bgColor: "bg-gray-100",
      }
    } else if (change > 0) {
      return {
        icon: TrendingUp,
        color: "text-green-600",
        bgColor: "bg-green-100",
      }
    } else {
      return {
        icon: TrendingDown,
        color: "text-red-600",
        bgColor: "bg-red-100",
      }
    }
  }

  const trendInfo = getTrendInfo()
  const TrendIcon = trendInfo.icon

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Share Price</CardTitle>
          <div className="h-4 w-4 animate-pulse bg-gray-300 rounded" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold animate-pulse bg-gray-300 h-8 w-24 rounded mb-1" />
          <div className="animate-pulse bg-gray-300 h-4 w-16 rounded" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Share Price</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">N$108.20</div>
          <p className="text-xs text-red-500">Error loading price data</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Current Share Price</CardTitle>
        <div className={`p-1 rounded-full ${trendInfo.bgColor}`}>
          <TrendIcon className={`h-4 w-4 ${trendInfo.color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(priceData.currentPrice)}</div>
        <div className="flex items-center space-x-2 text-xs">
          <span className={trendInfo.color}>{formatCurrency(priceData.priceChange)}</span>
          <span className={trendInfo.color}>({formatPercentage(priceData.priceChangePercentage)})</span>
        </div>
      </CardContent>
    </Card>
  )
}
