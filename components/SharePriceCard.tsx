"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { usePrice } from "@/contexts/price-context"

export default function SharePriceCard() {
  const { priceData, loading, error } = usePrice()

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Share Price</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Share Price</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 text-sm">Error loading price data</div>
          <div className="text-2xl font-bold text-gray-400">N$ 108.20</div>
        </CardContent>
      </Card>
    )
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-NA", {
      style: "currency",
      currency: "NAD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)
  }

  const formatChange = (change: number) => {
    const sign = change > 0 ? "+" : ""
    return `${sign}${change.toFixed(2)}%`
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4" />
    if (change < 0) return <TrendingDown className="h-4 w-4" />
    return <Minus className="h-4 w-4" />
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600"
    if (change < 0) return "text-red-600"
    return "text-gray-600"
  }

  const getBadgeVariant = (change: number) => {
    if (change > 0) return "default" // Green
    if (change < 0) return "destructive" // Red
    return "secondary" // Gray
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Current Share Price</CardTitle>
        <Badge variant={getBadgeVariant(priceData.priceChange)} className="flex items-center gap-1">
          {getChangeIcon(priceData.priceChange)}
          {formatChange(priceData.priceChange)}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatPrice(priceData.currentPrice)}</div>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-sm ${getChangeColor(priceData.priceChange)}`}>
            Weekly change: {formatChange(priceData.priceChange)}
          </span>
        </div>
        {priceData.lastUpdated && (
          <p className="text-xs text-muted-foreground mt-2">
            Last updated: {priceData.lastUpdated.toLocaleDateString()} at {priceData.lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
