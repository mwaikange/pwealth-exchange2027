"use client"

import { useState } from "react"
import { useExchange } from "@/contexts/exchange-context"
import { useWallet } from "@/contexts/wallet-context"
import { useNotification } from "@/hooks/use-notification"
import { SlidingNotification } from "@/components/sliding-notification"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingUp, TrendingDown, X } from "lucide-react"

export default function ExchangePage() {
  const {
    buyOrders,
    sellOrders,
    userBuyOrders,
    userSellOrders,
    placeBuyOrder,
    placeSellOrder,
    cancelBuyOrder,
    cancelSellOrder,
    loading,
    error,
    placingOrder,
  } = useExchange()

  const { buyWalletBalance, holdWalletPostHold, cashoutWalletBalance, loading: walletLoading } = useWallet()
  const { notifications, showNotification, hideNotification } = useNotification()

  const [buyAmount, setBuyAmount] = useState("")
  const [sellShares, setSellShares] = useState("")
  const [sellPrice, setSellPrice] = useState("")

  const currentSharePrice = 108.2 // This should come from your pricing system

  // Helper functions for formatting
  const formatShares = (value: number): string => {
    return Number(value)
      .toFixed(4)
      .replace(/\.?0+$/, "")
  }

  const formatCurrency = (value: number): string => {
    return `N$${Number(value).toFixed(2)}`
  }

  const formatPercentage = (filled: number, total: number): string => {
    if (total === 0) return "0.0%"
    return `${((filled / total) * 100).toFixed(1)}%`
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: "bg-yellow-600 text-yellow-100",
      partial: "bg-orange-600 text-orange-100",
      filled: "bg-green-600 text-green-100",
      cancelled: "bg-gray-600 text-gray-100",
      matched: "bg-green-600 text-green-100",
    }

    return (
      <Badge className={`${statusColors[status as keyof typeof statusColors] || "bg-gray-600 text-gray-100"} text-xs`}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  const handleBuyShares = async () => {
    if (!buyAmount || Number.parseFloat(buyAmount) <= 0) return

    try {
      const amount = Number.parseFloat(buyAmount)
      const shares = amount / currentSharePrice
      await placeBuyOrder(shares, currentSharePrice)
      setBuyAmount("")
      showNotification("success", `Buy order placed: ${formatShares(shares)} shares for ${formatCurrency(amount)}`)
    } catch (error: any) {
      showNotification("error", `Failed to place buy order: ${error.message}`)
    }
  }

  const handleSellShares = async () => {
    if (!sellShares || !sellPrice || Number.parseFloat(sellShares) <= 0 || Number.parseFloat(sellPrice) <= 0) return

    try {
      const shares = Number.parseFloat(sellShares)
      const price = Number.parseFloat(sellPrice)
      await placeSellOrder(shares, price)
      setSellShares("")
      setSellPrice("")
      showNotification("success", `Sell order placed: ${formatShares(shares)} shares at ${formatCurrency(price)} each`)
    } catch (error: any) {
      showNotification("error", `Failed to place sell order: ${error.message}`)
    }
  }

  const handleCancelBuyOrder = async (orderId: string) => {
    try {
      await cancelBuyOrder(orderId)
      showNotification("success", "Buy order cancelled successfully")
    } catch (error: any) {
      showNotification("error", `Failed to cancel order: ${error.message}`)
    }
  }

  const handleCancelSellOrder = async (orderId: string) => {
    try {
      await cancelSellOrder(orderId)
      showNotification("success", "Sell order cancelled successfully")
    } catch (error: any) {
      showNotification("error", `Failed to cancel order: ${error.message}`)
    }
  }

  if (loading || walletLoading) {
    return (
      <div className="h-[calc(100vh-130px)] bg-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
        <span className="ml-2 text-white">Loading exchange data...</span>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-130px)] bg-slate-900 overflow-auto p-6">
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

      {/* Wallet Balances */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Current Share Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{formatCurrency(currentSharePrice)}</div>
            <p className="text-xs text-slate-500">per share</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Buy Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{formatCurrency(buyWalletBalance)}</div>
            <div className="mt-2">
              <Input
                type="number"
                placeholder="Amount (N$)"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white text-sm mb-2"
              />
              <Button
                onClick={handleBuyShares}
                disabled={placingOrder || !buyAmount}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                {placingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buy Shares"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Hold Wallet (Post-Hold)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">{formatShares(holdWalletPostHold)}</div>
            <p className="text-xs text-slate-500 mb-2">shares</p>
            <div className="space-y-2">
              <Input
                type="number"
                placeholder="Shares to sell"
                value={sellShares}
                onChange={(e) => setSellShares(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white text-sm"
              />
              <Input
                type="number"
                placeholder="Price per share"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white text-sm"
              />
              <Button
                onClick={handleSellShares}
                disabled={placingOrder || !sellShares || !sellPrice}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                {placingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sell Shares"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Cashout Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">{formatCurrency(cashoutWalletBalance)}</div>
            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white mt-2" size="sm">
              Cashout
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Market Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
              Market Buy Orders ({buyOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {buyOrders.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No active buy orders</p>
            ) : (
              <div className="space-y-2">
                {buyOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <div className="flex-1">
                      <div className="text-slate-200 font-medium">
                        {formatCurrency(order.total_amount)} ({formatShares(order.shares_requested)} shares)
                      </div>
                      <div className="text-slate-400 text-sm">
                        Filled: {formatCurrency(order.shares_filled * order.price_per_share)} /{" "}
                        {formatCurrency(order.total_amount)} (
                        {formatPercentage(order.shares_filled, order.shares_requested)})
                      </div>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center">
              <TrendingDown className="w-5 h-5 mr-2 text-red-400" />
              Market Sell Orders ({sellOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sellOrders.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No active sell orders</p>
            ) : (
              <div className="space-y-2">
                {sellOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <div className="flex-1">
                      <div className="text-slate-200 font-medium">
                        {formatShares(order.shares_offered)} shares @ {formatCurrency(order.price_per_share)}
                      </div>
                      <div className="text-slate-400 text-sm">
                        Filled: {formatShares(order.shares_filled)} / {formatShares(order.shares_offered)} shares (
                        {formatPercentage(order.shares_filled, order.shares_offered)})
                      </div>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100">Your Buy Orders ({userBuyOrders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {userBuyOrders.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No buy orders</p>
            ) : (
              <div className="space-y-2">
                {userBuyOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <div className="flex-1">
                      <div className="text-slate-200 font-medium">
                        {formatCurrency(order.total_amount)} ({formatShares(order.shares_requested)} shares)
                      </div>
                      <div className="text-slate-400 text-sm">
                        Filled: {formatCurrency(order.shares_filled * order.price_per_share)} /{" "}
                        {formatCurrency(order.total_amount)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(order.status)}
                      {(order.status === "pending" || order.status === "partial") && (
                        <Button
                          onClick={() => handleCancelBuyOrder(order.id)}
                          size="sm"
                          variant="outline"
                          className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100">Your Sell Orders ({userSellOrders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {userSellOrders.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No sell orders</p>
            ) : (
              <div className="space-y-2">
                {userSellOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <div className="flex-1">
                      <div className="text-slate-200 font-medium">
                        {formatShares(order.shares_offered)} shares @ {formatCurrency(order.price_per_share)}
                      </div>
                      <div className="text-slate-400 text-sm">
                        Filled: {formatShares(order.shares_filled)} / {formatShares(order.shares_offered)} shares
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(order.status)}
                      {(order.status === "pending" || order.status === "partial") && (
                        <Button
                          onClick={() => handleCancelSellOrder(order.id)}
                          size="sm"
                          variant="outline"
                          className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="mt-6 bg-red-900/30 border border-red-600/30 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}
