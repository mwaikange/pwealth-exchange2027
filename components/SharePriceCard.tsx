"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { usePrice } from "@/contexts/price-context"

export default function SharePriceCard() {
  const { priceData, loading, error } = usePrice()

  // NaN protection for display
  const safeCurrentPrice = isNaN(priceData.currentPrice) ? 108.2 : priceData.currentPrice
  const safePriceChange = isNaN(priceData.priceChange) ? 0 : priceData.priceChange
  const safePriceChangePercent = isNaN(priceData.priceChangePercent) ? 0 : priceData.priceChangePercent

  const formatCurrency = (amount: number) => {
    const safeAmount = isNaN(amount) ? 0 : amount
    return `N$${safeAmount.toFixed(2)}`
  }

  const formatPercentage = (percent: number) => {
    const safePercent = isNaN(percent) ? 0 : percent
    return `${safePercent >= 0 ? "+" : ""}${safePercent.toFixed(2)}%`
  }

  const getTrendIcon = () => {
    if (safePriceChange > 0) return <TrendingUp className="h-4 w-4" />
    if (safePriceChange < 0) return <TrendingDown className="h-4 w-4" />
    return <Minus className="h-4 w-4" />
  }

  const getTrendColor = () => {
    if (safePriceChange > 0) return "text-green-600"
    if (safePriceChange < 0) return "text-red-600"
    return "text-gray-600"
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Share Price</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Loading...</div>
          <p className="text-xs text-muted-foreground">Fetching latest price</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Share Price</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">N$108.20</div>
          <p className="text-xs text-red-600">Error loading price data</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Current Share Price</CardTitle>
        {getTrendIcon()}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(safeCurrentPrice)}</div>
        <p className={`text-xs ${getTrendColor()}`}>
          {formatCurrency(safePriceChange)} ({formatPercentage(safePriceChangePercent)}) from last week
        </p>
      </CardContent>
    </Card>
  )
}
