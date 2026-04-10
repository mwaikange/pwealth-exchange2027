"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react"
import { usePrice } from "@/contexts/price-context"
import { useState } from "react"

export function SharePriceCard() {
  const { priceData, loading, error, refreshPrice, triggerPriceCalculation } = usePrice()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refreshPrice()
    setIsRefreshing(false)
  }

  const handleTriggerCalculation = async () => {
    setIsCalculating(true)
    const result = await triggerPriceCalculation()
    setIsCalculating(false)

    // You could show a toast notification here
    console.log("Price calculation result:", result)
  }

  // Format currency to exactly 2 decimal places
  const formatCurrency = (value: number) => `N$${Number(value).toFixed(2)}`
  const formatPercentage = (value: number) => `${value >= 0 ? "+" : ""}${Number(value).toFixed(2)}%`

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Share Price</CardTitle>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Share Price</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500">Error: {error}</div>
          <div className="text-2xl font-bold text-muted-foreground">N$100.00</div>
        </CardContent>
      </Card>
    )
  }

  const isPositive = priceData.priceChange >= 0
  const TrendIcon = isPositive ? TrendingUp : TrendingDown
  const trendColor = isPositive ? "text-green-600" : "text-red-600"
  const badgeVariant = isPositive ? "default" : "destructive"

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Share Price</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTriggerCalculation}
            disabled={isCalculating}
            title="Trigger price calculation (for testing)"
          >
            {isCalculating ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              "Calculate"
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(priceData.currentPrice)}</div>
        <div className="flex items-center gap-2 mt-2">
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="h-4 w-4" />
            <span className="text-sm font-medium">{formatCurrency(Math.abs(priceData.priceChange))}</span>
          </div>
          <Badge variant={badgeVariant} className="text-xs">
            {formatPercentage(priceData.percentageChange)}
          </Badge>
        </div>

        {/* JSE200 Growth Indicator */}
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>JSE200 Growth:</span>
            <span className={`font-medium ${priceData.j200Growth >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatPercentage(priceData.j200Growth)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
            <span>Week of:</span>
            <span>{new Date(priceData.effectiveDate).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
