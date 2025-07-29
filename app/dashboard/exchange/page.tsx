"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useWallet, formatCurrency, formatShares } from "@/contexts/wallet-context"
import { usePrice } from "@/contexts/price-context"
import { useExchange } from "@/contexts/exchange-context"
import { useNotification } from "@/hooks/use-notification"
import { SlidingNotification } from "@/components/sliding-notification"
import { ExchangePageSkeleton } from "@/components/skeletons/exchange-page-skeleton"
import { SharePriceCard } from "@/components/SharePriceCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"

// Safe number conversion
const safeNumber = (value: any): number => {
  const num = Number(value)
  return isNaN(num) ? 0 : num
}

export default function Exchange() {
  const { user } = useAuth()
  const { holdWalletPostHold, buyWalletBalance, refreshWalletBalances, loading: walletLoading } = useWallet()
  const { currentPrice, loading: priceLoading } = usePrice()
  const {
    isExchangeOpen,
    buyOrders,
    sellOrders,
    marketBuyOrders,
    marketSellOrders,
    placeBuyOrder,
    placeSellOrder,
    loading: exchangeLoading,
    error: exchangeError,
    refreshExchangeData,
  } = useExchange()

  // Notification system
  const { notifications, showNotification, hideNotification } = useNotification()

  // Form states
  const [buyAmount, setBuyAmount] = useState("")
  const [sellAmount, setSellAmount] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  // Refresh data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      refreshExchangeData()
      refreshWalletBalances(true) // Silent refresh
    }, 10000) // Every 10 seconds

    return () => clearInterval(interval)
  }, [refreshExchangeData, refreshWalletBalances])

  // Show skeleton during initial load
  if (walletLoading || priceLoading || exchangeLoading) {
    return <ExchangePageSkeleton />
  }

  // Handle buy order
  const handleBuyOrder = async () => {
    if (!user || isProcessing) return

    const amount = safeNumber(buyAmount)
    if (amount <= 0) {
      showNotification("error", "Please enter a valid amount")
      return
    }

    const totalCost = amount * currentPrice
    if (totalCost > buyWalletBalance) {
      showNotification(
        "error",
        `Insufficient funds. Need ${formatCurrency(totalCost)}, have ${formatCurrency(buyWalletBalance)}`,
      )
      return
    }

    try {
      setIsProcessing(true)

      // Show optimistic notification
      toast.success(`Placing buy order for ${formatShares(amount)} shares...`)

      const result = await placeBuyOrder(amount)

      if (result.success) {
        setBuyAmount("")
        showNotification("success", `Buy order placed successfully! Order ID: ${result.order_id}`)
        await refreshWalletBalances()
      } else {
        showNotification("error", result.message || "Failed to place buy order")
      }
    } catch (error: any) {
      console.error("Buy order error:", error)
      showNotification("error", error.message || "Failed to place buy order")
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle sell order
  const handleSellOrder = async () => {
    if (!user || isProcessing) return

    const amount = safeNumber(sellAmount)
    if (amount <= 0) {
      showNotification("error", "Please enter a valid amount")
      return
    }

    if (amount > holdWalletPostHold) {
      showNotification(
        "error",
        `Insufficient shares. Need ${formatShares(amount)}, have ${formatShares(holdWalletPostHold)}`,
      )
      return
    }

    try {
      setIsProcessing(true)

      // Show optimistic notification
      toast.success(`Placing sell order for ${formatShares(amount)} shares...`)

      const result = await placeSellOrder(amount)

      if (result.success) {
        setSellAmount("")
        showNotification("success", `Sell order placed successfully! Order ID: ${result.order_id}`)
        await refreshWalletBalances()
      } else {
        showNotification("error", result.message || "Failed to place sell order")
      }
    } catch (error: any) {
      console.error("Sell order error:", error)
      showNotification("error", error.message || "Failed to place sell order")
    } finally {
      setIsProcessing(false)
    }
  }

  // Get status badge component
  const getStatusBadge = (status: string, isExpired = false) => {
    const baseClasses = isExpired ? "bg-gray-500 text-gray-300" : ""

    switch (status) {
      case "active":
        return (
          <Badge className={`${baseClasses || "bg-blue-600 text-blue-100"}`}>
            <Clock className="w-3 h-3 mr-1" />
            {isExpired ? "Expired" : "Active"}
          </Badge>
        )
      case "completed":
        return (
          <Badge className="bg-green-600 text-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        )
      case "expired":
        return (
          <Badge className="bg-gray-500 text-gray-300">
            <XCircle className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        )
      default:
        return <Badge className={baseClasses || "bg-gray-600 text-gray-300"}>{status}</Badge>
    }
  }

  // Get progress bar component
  const getProgressBar = (order: any, isExpired = false) => {
    const progress = (safeNumber(order.filled_shares) / safeNumber(order.shares)) * 100
    const progressClass = isExpired ? "bg-gray-600" : "bg-blue-600"

    return (
      <div className="space-y-1">
        <Progress value={progress} className={`h-2 ${isExpired ? "opacity-50" : ""}`} />
        <div className={`text-xs ${isExpired ? "text-gray-500" : "text-slate-400"}`}>
          {formatShares(order.filled_shares)} / {formatShares(order.shares)} shares
          {order.status === "expired" && order.refunded_amount && (
            <span className="ml-2 text-yellow-400">- Refunded {formatShares(order.refunded_amount)}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-130px)] bg-gray-900 overflow-auto">
      {/* Sliding Notifications */}
      {notifications.map((notification) => (
        <SlidingNotification
          key={notification.id}
          type={notification.type}
          message={notification.message}
          isVisible={notification.isVisible}
          onClose={() => hideNotification(notification.id)}
        />
      ))}

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Exchange</h1>
            <p className="text-slate-400">
              {isExchangeOpen ? "Exchange is open for trading" : "Exchange is currently closed"}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isExchangeOpen ? "bg-green-500" : "bg-red-500"}`} />
            <span className={`text-sm font-medium ${isExchangeOpen ? "text-green-400" : "text-red-400"}`}>
              {isExchangeOpen ? "Open" : "Closed"}
            </span>
          </div>
        </div>

        {/* Share Price Card */}
        <SharePriceCard />

        {/* Error Display */}
        {exchangeError && (
          <div className="bg-red-600 text-white p-4 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {exchangeError}
          </div>
        )}

        {/* Trading Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Buy Section */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
                Buy Shares
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">Number of Shares</label>
                <Input
                  type="number"
                  placeholder="0.0000"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  disabled={!isExchangeOpen || isProcessing}
                  className="bg-slate-700 border-slate-600 text-slate-100"
                  step="0.0001"
                  min="0"
                />
              </div>

              {buyAmount && (
                <div className="bg-slate-700 rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Cost:</span>
                    <span className="text-slate-100 font-medium">
                      {formatCurrency(safeNumber(buyAmount) * currentPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-400">Available:</span>
                    <span className="text-slate-100">{formatCurrency(buyWalletBalance)}</span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleBuyOrder}
                disabled={!isExchangeOpen || isProcessing || !buyAmount}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {isProcessing ? "Placing Order..." : "Place Buy Order"}
              </Button>
            </CardContent>
          </Card>

          {/* Sell Section */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center">
                <TrendingDown className="w-5 h-5 mr-2 text-red-400" />
                Sell Shares
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">Number of Shares</label>
                <Input
                  type="number"
                  placeholder="0.0000"
                  value={sellAmount}
                  onChange={(e) => setSellAmount(e.target.value)}
                  disabled={!isExchangeOpen || isProcessing}
                  className="bg-slate-700 border-slate-600 text-slate-100"
                  step="0.0001"
                  min="0"
                />
              </div>

              {sellAmount && (
                <div className="bg-slate-700 rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Value:</span>
                    <span className="text-slate-100 font-medium">
                      {formatCurrency(safeNumber(sellAmount) * currentPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-400">Available:</span>
                    <span className="text-slate-100">{formatShares(holdWalletPostHold)} shares</span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleSellOrder}
                disabled={!isExchangeOpen || isProcessing || !sellAmount}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                {isProcessing ? "Placing Order..." : "Place Sell Order"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Orders Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Market Orders */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-100">Market Orders</h3>

            {/* Market Buy Orders */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100 text-sm">Market Buy Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {marketBuyOrders.length === 0 ? (
                  <p className="text-slate-400 text-sm">No active buy orders</p>
                ) : (
                  <div className="space-y-3">
                    {marketBuyOrders.slice(0, 5).map((order) => (
                      <div key={order.id} className="bg-slate-700 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-sm">
                            <div className="text-slate-100 font-medium">{formatShares(order.shares)} shares</div>
                            <div className="text-slate-400">{formatCurrency(order.total_amount)}</div>
                          </div>
                          {getStatusBadge(order.status)}
                        </div>
                        {getProgressBar(order)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Market Sell Orders */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100 text-sm">Market Sell Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {marketSellOrders.length === 0 ? (
                  <p className="text-slate-400 text-sm">No active sell orders</p>
                ) : (
                  <div className="space-y-3">
                    {marketSellOrders.slice(0, 5).map((order) => (
                      <div key={order.id} className="bg-slate-700 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-sm">
                            <div className="text-slate-100 font-medium">{formatShares(order.shares)} shares</div>
                            <div className="text-slate-400">{formatCurrency(order.total_amount)}</div>
                          </div>
                          {getStatusBadge(order.status)}
                        </div>
                        {getProgressBar(order)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Your Orders */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-100">Your Orders</h3>

            {/* Your Buy Orders */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100 text-sm">Your Buy Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {buyOrders.length === 0 ? (
                  <p className="text-slate-400 text-sm">No buy orders</p>
                ) : (
                  <div className="space-y-3">
                    {buyOrders.map((order) => {
                      const isExpired = order.status === "expired"
                      return (
                        <div key={order.id} className={`bg-slate-700 rounded-lg p-3 ${isExpired ? "opacity-60" : ""}`}>
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-sm">
                              <div className={`font-medium ${isExpired ? "text-gray-400" : "text-slate-100"}`}>
                                {formatShares(order.shares)} shares
                              </div>
                              <div className={`${isExpired ? "text-gray-500" : "text-slate-400"}`}>
                                {formatCurrency(order.total_amount)}
                              </div>
                              <div className={`text-xs ${isExpired ? "text-gray-500" : "text-slate-500"}`}>
                                Buy_{order.id.slice(-6)}
                              </div>
                            </div>
                            {getStatusBadge(order.status, isExpired)}
                          </div>
                          {getProgressBar(order, isExpired)}
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
                <CardTitle className="text-slate-100 text-sm">Your Sell Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {sellOrders.length === 0 ? (
                  <p className="text-slate-400 text-sm">No sell orders</p>
                ) : (
                  <div className="space-y-3">
                    {sellOrders.map((order) => {
                      const isExpired = order.status === "expired"
                      return (
                        <div key={order.id} className={`bg-slate-700 rounded-lg p-3 ${isExpired ? "opacity-60" : ""}`}>
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-sm">
                              <div className={`font-medium ${isExpired ? "text-gray-400" : "text-slate-100"}`}>
                                {formatShares(order.shares)} shares
                              </div>
                              <div className={`${isExpired ? "text-gray-500" : "text-slate-400"}`}>
                                {formatCurrency(order.total_amount)}
                              </div>
                              <div className={`text-xs ${isExpired ? "text-gray-500" : "text-slate-500"}`}>
                                Sell_{order.id.slice(-6)}
                              </div>
                            </div>
                            {getStatusBadge(order.status, isExpired)}
                          </div>
                          {getProgressBar(order, isExpired)}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
