"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useExchange } from "@/contexts/exchange-context"
import { useWallet, formatCurrency, formatShares } from "@/contexts/wallet-context"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, TrendingUp, TrendingDown, Loader2 } from "lucide-react"

export default function ExchangePage() {
  const { toast } = useToast()
  const { user } = useAuth()

  const {
    buyOrders,
    sellOrders,
    userBuyOrders,
    userSellOrders,
    matchedOrders,
    placeBuyOrder,
    placeSellOrder,
    cancelBuyOrder,
    cancelSellOrder,
    refreshOrders,
    loading: exchangeLoading,
    error: exchangeError,
    placingOrder,
  } = useExchange()

  const {
    buyWalletBalance,
    holdWalletPostHold,
    refreshWalletBalances,
    loading: walletLoading,
    error: walletError,
  } = useWallet()

  const [buyAmount, setBuyAmount] = useState("")
  const [sellShares, setSellShares] = useState("")
  const [sellPrice, setSellPrice] = useState("")
  const [currentSharePrice] = useState(108.2) // This should come from price context

  // Auto-refresh orders every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshOrders(true)
      refreshWalletBalances(true)
    }, 30000)

    return () => clearInterval(interval)
  }, [refreshOrders, refreshWalletBalances])

  // Helper function to safely format numbers
  const safeNumber = (value: any): number => {
    const num = Number(value)
    return isNaN(num) ? 0 : num
  }

  // Helper function to calculate fill percentage
  const calculateFillPercentage = (filled: number, total: number): number => {
    if (total === 0) return 0
    return Math.min(100, (filled / total) * 100)
  }

  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "bg-yellow-500",
      partial: "bg-blue-500",
      available: "bg-green-500",
      filled: "bg-green-600",
      matched: "bg-green-600",
      cancelled: "bg-gray-500",
      expired: "bg-red-500",
    }

    return (
      <Badge className={`${statusColors[status.toLowerCase()] || "bg-gray-500"} text-white text-xs`}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  // Handle buy order placement
  const handleBuyOrder = async () => {
    if (!buyAmount || isNaN(Number(buyAmount)) || Number(buyAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid buy amount",
        variant: "destructive",
      })
      return
    }

    const amount = Number(buyAmount)
    if (amount > buyWalletBalance) {
      toast({
        title: "Insufficient Funds",
        description: "You don't have enough funds in your buy wallet",
        variant: "destructive",
      })
      return
    }

    try {
      const estimatedShares = amount / currentSharePrice
      await placeBuyOrder(estimatedShares, currentSharePrice)
      setBuyAmount("")
      toast({
        title: "Buy Order Placed",
        description: `Buy order for ${formatShares(estimatedShares)} shares placed successfully`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to place buy order",
        variant: "destructive",
      })
    }
  }

  // Handle sell order placement
  const handleSellOrder = async () => {
    if (!sellShares || isNaN(Number(sellShares)) || Number(sellShares) <= 0) {
      toast({
        title: "Invalid Shares",
        description: "Please enter a valid number of shares",
        variant: "destructive",
      })
      return
    }

    if (!sellPrice || isNaN(Number(sellPrice)) || Number(sellPrice) <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price per share",
        variant: "destructive",
      })
      return
    }

    const shares = Number(sellShares)
    const pricePerShare = Number(sellPrice)

    if (shares > holdWalletPostHold) {
      toast({
        title: "Insufficient Shares",
        description: "You don't have enough shares in your hold wallet",
        variant: "destructive",
      })
      return
    }

    try {
      await placeSellOrder(shares, pricePerShare)
      setSellShares("")
      setSellPrice("")
      toast({
        title: "Sell Order Placed",
        description: `Sell order for ${formatShares(shares)} shares at ${formatCurrency(pricePerShare)} each placed successfully`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to place sell order",
        variant: "destructive",
      })
    }
  }

  if (walletLoading || exchangeLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <div className="text-lg">Loading exchange data...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Share Exchange</h1>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Current Share Price</div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(currentSharePrice)}</div>
        </div>
      </div>

      {/* Alert Banner */}
      <Alert className="bg-green-50 border-green-200">
        <AlertCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Share Exchange is now live! Current price: <strong>{formatCurrency(currentSharePrice)}</strong> per share
        </AlertDescription>
      </Alert>

      {/* Error Display */}
      {(exchangeError || walletError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error: {exchangeError || walletError}</AlertDescription>
        </Alert>
      )}

      {/* Wallet Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
              Buy Wallet
            </CardTitle>
            <CardDescription>Available funds for purchasing shares</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(buyWalletBalance)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <TrendingDown className="h-5 w-5 mr-2 text-green-500" />
              Hold Wallet (Post-Hold)
            </CardTitle>
            <CardDescription>Shares available for selling</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatShares(holdWalletPostHold)} shares</div>
          </CardContent>
        </Card>
      </div>

      {/* Order Placement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Buy Order */}
        <Card>
          <CardHeader>
            <CardTitle>Place Buy Order</CardTitle>
            <CardDescription>Purchase shares at current market price</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="buyAmount">Amount (NAD)</Label>
              <Input
                id="buyAmount"
                type="number"
                placeholder="Enter amount to spend"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                min="0"
                step="0.01"
              />
              {buyAmount && !isNaN(Number(buyAmount)) && Number(buyAmount) > 0 && (
                <div className="text-sm text-muted-foreground mt-1">
                  Estimated shares: {formatShares(Number(buyAmount) / currentSharePrice)}
                </div>
              )}
            </div>
            <Button onClick={handleBuyOrder} disabled={placingOrder || !buyAmount} className="w-full">
              {placingOrder ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Placing Order...
                </>
              ) : (
                "Place Buy Order"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Sell Order */}
        <Card>
          <CardHeader>
            <CardTitle>Place Sell Order</CardTitle>
            <CardDescription>Sell your shares at a specified price</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="sellShares">Shares to Sell</Label>
              <Input
                id="sellShares"
                type="number"
                placeholder="Enter number of shares"
                value={sellShares}
                onChange={(e) => setSellShares(e.target.value)}
                min="0"
                step="0.0001"
              />
            </div>
            <div>
              <Label htmlFor="sellPrice">Price per Share (NAD)</Label>
              <Input
                id="sellPrice"
                type="number"
                placeholder={`Current: ${formatCurrency(currentSharePrice)}`}
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            {sellShares && sellPrice && !isNaN(Number(sellShares)) && !isNaN(Number(sellPrice)) && (
              <div className="text-sm text-muted-foreground">
                Total value: {formatCurrency(Number(sellShares) * Number(sellPrice))}
              </div>
            )}
            <Button onClick={handleSellOrder} disabled={placingOrder || !sellShares || !sellPrice} className="w-full">
              {placingOrder ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Placing Order...
                </>
              ) : (
                "Place Sell Order"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Market Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Buy Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Market Buy Orders ({(buyOrders || []).length})</CardTitle>
            <CardDescription>Active buy orders from all users</CardDescription>
          </CardHeader>
          <CardContent>
            {!buyOrders || buyOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No active buy orders</div>
            ) : (
              <div className="space-y-3">
                {buyOrders.slice(0, 10).map((order) => {
                  const totalAmount = safeNumber(order.total_amount)
                  const filledAmount = safeNumber(order.shares_filled) * safeNumber(order.price_per_share)
                  const estimatedShares = totalAmount / safeNumber(order.price_per_share)
                  const filledShares = safeNumber(order.shares_filled)
                  const filledPercentage = calculateFillPercentage(filledShares, estimatedShares)

                  return (
                    <div key={order.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          {formatCurrency(totalAmount)}
                          <span className="text-sm text-muted-foreground ml-2">
                            ({formatShares(estimatedShares)} shares)
                          </span>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>

                      {order.status === "partial" && (
                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground">
                            Filled: {formatCurrency(filledAmount)} / {formatCurrency(totalAmount)} (
                            {filledPercentage.toFixed(1)}%)
                          </div>
                          <Progress value={filledPercentage} className="h-2" />
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Market Sell Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Market Sell Orders ({(sellOrders || []).length})</CardTitle>
            <CardDescription>Active sell orders from all users</CardDescription>
          </CardHeader>
          <CardContent>
            {!sellOrders || sellOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No active sell orders</div>
            ) : (
              <div className="space-y-3">
                {sellOrders.slice(0, 10).map((order) => {
                  const totalShares = safeNumber(order.shares_offered)
                  const filledShares = safeNumber(order.shares_filled)
                  const pricePerShare = safeNumber(order.price_per_share)
                  const filledPercentage = calculateFillPercentage(filledShares, totalShares)

                  return (
                    <div key={order.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          {formatShares(totalShares)} shares @ {formatCurrency(pricePerShare)}
                        </div>
                        {getStatusBadge(order.status)}
                      </div>

                      {order.status === "partial" && (
                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground">
                            Filled: {formatShares(filledShares)} / {formatShares(totalShares)} shares (
                            {filledPercentage.toFixed(1)}%)
                          </div>
                          <Progress value={filledPercentage} className="h-2" />
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Your Buy Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Your Buy Orders ({(userBuyOrders || []).length})</CardTitle>
            <CardDescription>Your buy order history</CardDescription>
          </CardHeader>
          <CardContent>
            {!userBuyOrders || userBuyOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No buy orders found</div>
            ) : (
              <div className="space-y-3">
                {userBuyOrders.map((order) => {
                  const totalAmount = safeNumber(order.total_amount)
                  const filledAmount = safeNumber(order.shares_filled) * safeNumber(order.price_per_share)
                  const estimatedShares = totalAmount / safeNumber(order.price_per_share)
                  const filledShares = safeNumber(order.shares_filled)
                  const filledPercentage = calculateFillPercentage(filledShares, estimatedShares)

                  return (
                    <div key={order.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          {formatCurrency(totalAmount)}
                          <span className="text-sm text-muted-foreground ml-2">
                            ({formatShares(estimatedShares)} shares)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(order.status)}
                          {order.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => cancelBuyOrder(order.id)}
                              className="text-xs"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">
                          Filled: {formatCurrency(filledAmount)} / {formatCurrency(totalAmount)} (
                          {filledPercentage.toFixed(1)}%)
                        </div>
                        <Progress value={filledPercentage} className="h-2" />
                      </div>

                      <div className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Your Sell Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Your Sell Orders ({(userSellOrders || []).length})</CardTitle>
            <CardDescription>Your sell order history</CardDescription>
          </CardHeader>
          <CardContent>
            {!userSellOrders || userSellOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No sell orders found</div>
            ) : (
              <div className="space-y-3">
                {userSellOrders.map((order) => {
                  const totalShares = safeNumber(order.shares_offered)
                  const filledShares = safeNumber(order.shares_filled)
                  const pricePerShare = safeNumber(order.price_per_share)
                  const filledPercentage = calculateFillPercentage(filledShares, totalShares)

                  return (
                    <div key={order.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          {formatShares(totalShares)} shares @ {formatCurrency(pricePerShare)}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(order.status)}
                          {order.status === "available" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => cancelSellOrder(order.id)}
                              className="text-xs"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">
                          Filled: {formatShares(filledShares)} / {formatShares(totalShares)} shares (
                          {filledPercentage.toFixed(1)}%)
                        </div>
                        <Progress value={filledPercentage} className="h-2" />
                      </div>

                      <div className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Matches */}
      {matchedOrders && matchedOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Matches ({matchedOrders.length})</CardTitle>
            <CardDescription>Your recent order matches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {matchedOrders.slice(0, 5).map((match) => (
                <div key={match.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {formatShares(match.shares_matched)} shares @ {formatCurrency(match.price_per_share)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total: {formatCurrency(match.total_amount)}</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(match.matched_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
