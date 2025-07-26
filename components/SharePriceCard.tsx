"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { usePrice } from "@/contexts/price-context"

export default function SharePriceCard() {
  const { priceData, loading, error } = usePrice()

  const formatPrice = (price: number) => {
    // Ensure price is never NaN
    const safePrice = isNaN(price) ? 108.2 : price
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safePrice)
  }

  const formatChange = (change: number) => {
    // Ensure change is never NaN
    const safeChange = isNaN(change) ? 0 : change
    const sign = safeChange > 0 ? "+" : ""
    return `${sign}${safeChange.toFixed(2)}`
  }

  const getChangeIcon = (change: number) => {
    const safeChange = isNaN(change) ? 0 : change
    if (safeChange > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (safeChange < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-600" />
  }

  const getChangeColor = (change: number) => {
    const safeChange = isNaN(change) ? 0 : change
    if (safeChange > 0) return "text-green-600"
    if (safeChange < 0) return "text-red-600"
    return "text-gray-600"
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Share Price</CardTitle>
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Share Price</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">R 108.20</div>
          <p className="text-xs text-muted-foreground">Error loading price data</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Current Share Price</CardTitle>
        {getChangeIcon(priceData.priceChange)}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatPrice(priceData.currentPrice)}</div>
        <div className={`text-xs flex items-center gap-1 ${getChangeColor(priceData.priceChange)}`}>
          <span>{formatChange(priceData.priceChange)}</span>
          <span className="text-muted-foreground">
            {priceData.lastUpdated
              ? `• Updated ${priceData.lastUpdated.toLocaleDateString()}`
              : "• Based on JSE200 index"}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
