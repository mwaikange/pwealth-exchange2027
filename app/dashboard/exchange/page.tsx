"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { useExchange } from "@/contexts/exchange-context"
import { useWallet, formatCurrency, formatShares } from "@/contexts/wallet-context"
import { usePrice } from "@/contexts/price-context"
import { useToast } from "@/hooks/use-toast"

export default function ExchangePage() {
  const { toast } = useToast()
  const {
    marketBuyOrders,
    marketSellOrders,
    userBuyOrders,
    userSellOrders,
    placeBuyOrder,
    placeSellOrder,
    refreshOrders,
    loading: exchangeLoading,
    error: exchangeError,
  } = useExchange()

  const { buyWallet, holdWalletPostHold, refreshBalances, loading: walletLoading } = useWallet()

  const { currentPrice, loading: priceLoading } = usePrice()

  const [buyAmount, setBuyAmount] = useState("")
  const [sellShares, setSellShares] = useState("")
  const [sellPrice, setSellPrice] = useState("")
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)

  // Auto-refresh orders every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshOrders()
      refreshBalances()
    }, 30000)

    return () => clearInterval(interval)
  }, [refreshOrders, refreshBalances])

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
    if (amount > buyWallet) {
      toast({
        title: "Insufficient Funds",
        description: "You don't have enough funds in your buy wallet",
        variant: "destructive",
      })
      return
    }

    try {
      setIsPlacingOrder(true)
      await placeBuyOrder(amount)
      setBuyAmount("")
      toast({
        title: "Buy Order Placed",
        description: `Buy order for ${formatCurrency(amount)} placed successfully. Will be matched in 30 seconds.`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to place buy order",
        variant: "destructive",
      })
    } finally {
      setIsPlacingOrder(false)
    }
  }

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
      setIsPlacingOrder(true)
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
    } finally {
      setIsPlacingOrder(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      PENDING: "bg-yellow-500",
      PARTIAL: "bg-blue-500",
      FILLED: "bg-green-500",
      MATCHED: "bg-green-500",
      CANCELLED: "bg-gray-500",
      EXPIRED: "bg-red-500",
    }

    return <Badge className={`${statusColors[status] || "bg-gray-500"} text-white`}>{status}</Badge>
  }

  if (priceLoading || walletLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-lg">Loading exchange data...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Exchange</h1>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Current Share Price</div>
          <div className="text-2xl font-bold">{formatCurrency(currentPrice)}</div>
        </div>
      </div>

      {exchangeError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-red-600">Error: {exchangeError}</div>
          </CardContent>
        </Card>
      )}

      {/* Wallet Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Buy Wallet</CardTitle>
            <CardDescription>Available funds for purchasing shares</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(buyWallet)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hold Wallet (Post-Hold)</CardTitle>
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
                  Estimated shares: {formatShares(Number(buyAmount) / currentPrice)}
                </div>
              )}
            </div>
            <Button
              onClick={handleBuyOrder}
              disabled={isPlacingOrder || exchangeLoading || !buyAmount}
              className="w-full"
            >
              {isPlacingOrder ? "Placing Order..." : "Place Buy Order"}
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
                placeholder="Enter price per share"
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
            <Button
              onClick={handleSellOrder}
              disabled={isPlacingOrder || exchangeLoading || !sellShares || !sellPrice}
              className="w-full"
            >
              {isPlacingOrder ? "Placing Order..." : "Place Sell Order"}
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
            <CardTitle>Market Buy Orders ({marketBuyOrders.length})</CardTitle>
            <CardDescription>Active buy orders from all users</CardDescription>
          </CardHeader>
          <CardContent>
            {marketBuyOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No active buy orders</div>
            ) : (
              <div className="space-y-3">
                {marketBuyOrders.map((order) => {
                  const estimatedShares = order.total_amount / order.price_per_share
                  const filledAmount = Number(order.filled_amount) || 0
                  const totalAmount = Number(order.total_amount) || 0
                  const filledPercentage = totalAmount > 0 ? (filledAmount / totalAmount) * 100 : 0

                  return (
                    <div key={order.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">
                          {formatCurrency(order.total_amount)}
                          <span className="text-sm text-muted-foreground ml-1">
                            ({formatShares(estimatedShares)} shares)
                          </span>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                      {order.status === "PARTIAL" && (
                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground">{filledPercentage.toFixed(1)}% filled</div>
                          <Progress value={filledPercentage} className="h-2" />
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(order.created_at).toLocaleString()}
                      </div>
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
            <CardTitle>Market Sell Orders ({marketSellOrders.length})</CardTitle>
            <CardDescription>Active sell orders from all users</CardDescription>
          </CardHeader>
          <CardContent>
            {marketSellOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No active sell orders</div>
            ) : (
              <div className="space-y-3">
                {marketSellOrders.map((order) => {
                  const filledShares = Number(order.filled_shares) || 0
                  const totalShares = Number(order.shares) || 0
                  const filledPercentage = totalShares > 0 ? (filledShares / totalShares) * 100 : 0

                  return (
                    <div key={order.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">
                          {formatShares(order.shares)} shares @ {formatCurrency(order.price_per_share)}
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                      {order.status === "PARTIAL" && (
                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground">
                            Filled: {formatShares(filledShares)}/{formatShares(totalShares)} shares
                          </div>
                          <Progress value={filledPercentage} className="h-2" />
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(order.created_at).toLocaleString()}
                      </div>
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
            <CardTitle>Your Buy Orders ({userBuyOrders.length})</CardTitle>
            <CardDescription>Your buy order history</CardDescription>
          </CardHeader>
          <CardContent>
            {userBuyOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No buy orders found</div>
            ) : (
              <div className="space-y-3">
                {userBuyOrders.map((order) => {
                  const estimatedShares = order.total_amount / order.price_per_share
                  const filledAmount = Number(order.filled_amount) || 0
                  const totalAmount = Number(order.total_amount) || 0
                  const filledPercentage = totalAmount > 0 ? (filledAmount / totalAmount) * 100 : 0

                  return (
                    <div key={order.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">
                          {formatCurrency(order.total_amount)}
                          <span className="text-sm text-muted-foreground ml-1">
                            ({formatShares(estimatedShares)} shares)
                          </span>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">
                          Filled: {formatCurrency(filledAmount)} / {formatCurrency(totalAmount)}
                        </div>
                        <Progress value={filledPercentage} className="h-2" />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(order.created_at).toLocaleString()}
                      </div>
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
            <CardTitle>Your Sell Orders ({userSellOrders.length})</CardTitle>
            <CardDescription>Your sell order history</CardDescription>
          </CardHeader>
          <CardContent>
            {userSellOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No sell orders found</div>
            ) : (
              <div className="space-y-3">
                {userSellOrders.map((order) => {
                  const filledShares = Number(order.filled_shares) || 0
                  const totalShares = Number(order.shares) || 0
                  const filledPercentage = totalShares > 0 ? (filledShares / totalShares) * 100 : 0

                  return (
                    <div key={order.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">
                          {formatShares(order.shares)} shares @ {formatCurrency(order.price_per_share)}
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">
                          Filled: {formatShares(filledShares)} / {formatShares(totalShares)} shares
                        </div>
                        <Progress value={filledPercentage} className="h-2" />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(order.created_at).toLocaleString()}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
