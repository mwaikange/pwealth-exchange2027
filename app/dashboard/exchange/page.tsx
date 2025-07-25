"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
    const statusMap: Record<string, { color: string; text: string }> = {
      PENDING: { color: "bg-yellow-500", text: "PENDING" },
      PARTIAL: { color: "bg-orange-500", text: "PARTIAL" },
      FILLED: { color: "bg-green-500", text: "FILLED" },
      MATCHED: { color: "bg-green-500", text: "MATCHED" },
      CANCELLED: { color: "bg-gray-500", text: "CANCELLED" },
      EXPIRED: { color: "bg-red-500", text: "EXPIRED" },
    }

    const statusInfo = statusMap[status.toUpperCase()] || { color: "bg-gray-500", text: status.toUpperCase() }

    return <Badge className={`${statusInfo.color} text-white text-xs px-2 py-1 rounded`}>{statusInfo.text}</Badge>
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
      {/* Wallet Balances Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-sm">Current Share Price</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{formatCurrency(currentPrice)}</div>
            <div className="text-xs text-slate-400">per share</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-sm">Buy Wallet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-white">{formatCurrency(buyWallet)}</div>
            <div className="mt-2">
              <Input
                type="number"
                placeholder="Amount (N$)"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                className="mb-2 bg-slate-700 border-slate-600 text-white"
                min="0"
                step="0.01"
              />
              <Button
                onClick={handleBuyOrder}
                disabled={isPlacingOrder || exchangeLoading || !buyAmount}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isPlacingOrder ? "Placing..." : "Buy Shares"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-sm">Hold Wallet (Post-Hold)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-white">{formatShares(holdWalletPostHold)} shares</div>
            <div className="mt-2 space-y-2">
              <Input
                type="number"
                placeholder="Shares to sell"
                value={sellShares}
                onChange={(e) => setSellShares(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                min="0"
                step="0.0001"
              />
              <Input
                type="number"
                placeholder="Price per share (N$)"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                min="0"
                step="0.01"
              />
              <Button
                onClick={handleSellOrder}
                disabled={isPlacingOrder || exchangeLoading || !sellShares || !sellPrice}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isPlacingOrder ? "Placing..." : "Sell Shares"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-sm">Cashout Wallet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-white">N$2321.70</div>
            <div className="mt-2">
              <Input
                type="number"
                placeholder="Amount to cashout (N$)"
                className="mb-2 bg-slate-700 border-slate-600 text-white"
                min="0"
                step="0.01"
              />
              <Button className="w-full bg-orange-600 hover:bg-orange-700">Cashout</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Buy Orders */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Market Buy Orders ({(marketBuyOrders || []).length})</CardTitle>
          </CardHeader>
          <CardContent>
            {!marketBuyOrders || marketBuyOrders.length === 0 ? (
              <div className="text-center py-8 text-slate-400">No active buy orders</div>
            ) : (
              <div className="space-y-3">
                {marketBuyOrders.map((order) => {
                  const totalAmount = safeNumber(order.total_amount)
                  const filledAmount = safeNumber(order.filled_amount) || 0
                  const estimatedShares = totalAmount / safeNumber(order.price_per_share)
                  const filledPercentage = calculateFillPercentage(filledAmount, totalAmount)

                  return (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                      <div className="flex-1">
                        <div className="text-white font-medium">
                          {formatCurrency(totalAmount)} ({formatShares(estimatedShares)} shares)
                        </div>
                        {order.status === "PARTIAL" && (
                          <div className="text-xs text-slate-400 mt-1">{filledPercentage.toFixed(1)}% filled</div>
                        )}
                      </div>
                      <div className="ml-4">{getStatusBadge(order.status)}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Market Sell Orders */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Market Sell Orders ({(marketSellOrders || []).length})</CardTitle>
          </CardHeader>
          <CardContent>
            {!marketSellOrders || marketSellOrders.length === 0 ? (
              <div className="text-center py-8 text-slate-400">No active sell orders</div>
            ) : (
              <div className="space-y-3">
                {marketSellOrders.map((order) => {
                  const totalShares = safeNumber(order.shares)
                  const filledShares = safeNumber(order.filled_shares) || 0
                  const pricePerShare = safeNumber(order.price_per_share)
                  const filledPercentage = calculateFillPercentage(filledShares, totalShares)

                  return (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                      <div className="flex-1">
                        <div className="text-white font-medium">
                          {formatShares(totalShares)} shares @ {formatCurrency(pricePerShare)}
                        </div>
                        {order.status === "PARTIAL" && (
                          <div className="text-xs text-slate-400 mt-1">{filledPercentage.toFixed(1)}% filled</div>
                        )}
                      </div>
                      <div className="ml-4">{getStatusBadge(order.status)}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Your Buy Orders */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Your Buy Orders ({(userBuyOrders || []).length})</CardTitle>
          </CardHeader>
          <CardContent>
            {!userBuyOrders || userBuyOrders.length === 0 ? (
              <div className="text-center py-8 text-slate-400">No buy orders found</div>
            ) : (
              <div className="space-y-3">
                {userBuyOrders.map((order) => {
                  const totalAmount = safeNumber(order.total_amount)
                  const filledAmount = safeNumber(order.filled_amount) || 0
                  const estimatedShares = totalAmount / safeNumber(order.price_per_share)
                  const filledPercentage = calculateFillPercentage(filledAmount, totalAmount)

                  return (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                      <div className="flex-1">
                        <div className="text-white font-medium">
                          {formatCurrency(totalAmount)} ({formatShares(estimatedShares)} shares)
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Filled: {formatCurrency(filledAmount)} / {formatCurrency(totalAmount)} (
                          {filledPercentage.toFixed(1)}%)
                        </div>
                      </div>
                      <div className="ml-4">{getStatusBadge(order.status)}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Your Sell Orders */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Your Sell Orders ({(userSellOrders || []).length})</CardTitle>
          </CardHeader>
          <CardContent>
            {!userSellOrders || userSellOrders.length === 0 ? (
              <div className="text-center py-8 text-slate-400">No sell orders found</div>
            ) : (
              <div className="space-y-3">
                {userSellOrders.map((order) => {
                  const totalShares = safeNumber(order.shares)
                  const filledShares = safeNumber(order.filled_shares) || 0
                  const pricePerShare = safeNumber(order.price_per_share)
                  const filledPercentage = calculateFillPercentage(filledShares, totalShares)

                  return (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                      <div className="flex-1">
                        <div className="text-white font-medium">
                          {formatShares(totalShares)} shares @ {formatCurrency(pricePerShare)}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Filled: {formatShares(filledShares)} / {formatShares(totalShares)} shares (
                          {filledPercentage.toFixed(1)}%)
                        </div>
                      </div>
                      <div className="ml-4">{getStatusBadge(order.status)}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {exchangeError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-red-600">Error: {exchangeError}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
