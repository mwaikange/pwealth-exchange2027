"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { usePrice } from "@/contexts/price-context"

export default function SharePriceCard() {
  const { priceData, loading, error } = usePrice()

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Share Price</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Loading...</div>
          <p className="text-xs text-muted-foreground">Fetching latest price data</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Share Price</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500">Error</div>
          <p className="text-xs text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const { currentPrice, priceChange, lastUpdated } = priceData

  const getTrendIcon = () => {
    if (priceChange > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (priceChange < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  const getTrendColor = () => {
    if (priceChange > 0) return "text-green-500"
    if (priceChange < 0) return "text-red-500"
    return "text-gray-500"
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)
  }

  const formatChange = (change: number) => {
    const sign = change >= 0 ? "+" : ""
    return `${sign}${formatPrice(change)}`
  }

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return "No recent updates"

    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Updated recently"
    if (diffInHours < 24) return `Updated ${diffInHours}h ago`

    const diffInDays = Math.floor(diffInHours / 24)
    return `Updated ${diffInDays}d ago`
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Current Share Price</CardTitle>
        {getTrendIcon()}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatPrice(currentPrice)}</div>
        <div className={`text-xs ${getTrendColor()}`}>{formatChange(priceChange)} from last week</div>
        <p className="text-xs text-muted-foreground mt-1">{formatLastUpdated(lastUpdated)}</p>
      </CardContent>
    </Card>
  )
}
