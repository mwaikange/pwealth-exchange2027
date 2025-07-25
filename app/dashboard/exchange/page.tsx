"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useWallet } from "@/contexts/wallet-context"
import { useExchange } from "@/contexts/exchange-context"
import { AlertCircle, TrendingUp, TrendingDown, Wallet, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Helper functions for formatting
const formatCurrency = (value: number): string => {
  return `N$${Number(value).toFixed(2)}`
}

const formatShares = (value: number): string => {
  return Number(value)
    .toFixed(4)
    .replace(/\.?0+$/, "")
}

export default function ExchangePage() {
  const [buyAmount, setBuyAmount] = useState("")
  const [sellShares, setSellShares] = useState("")
  const [cashoutAmount, setCashoutAmount] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isProcessing, setIsProcessing] = useState({
    buy: false,
    sell: false,
    cashout: false,
  })

  const {
    buyWalletBalance,
    holdWalletPostHold,
    cashoutWalletBalance,
    loading: walletLoading,
    error: walletError,
    refreshWalletBalances,
  } = useWallet()

  const {
    marketSellOrders,
    marketBuyOrders,
    userSellOrders,
    userBuyOrders,
    placeBuyOrder,
    placeSellOrder,
    currentSharePrice,
    loading: exchangeLoading,
    error: exchangeError,
    refreshOrders,
  } = useExchange()

  const loading = walletLoading || exchangeLoading

  const handleBuyOrder = async () => {
    if (isProcessing.buy) return // Prevent double-clicking

    const amount = Number.parseFloat(buyAmount)
    if (isNaN(amount) || amount <= 0) {
      setMessage({ type: "error", text: "Please enter a valid positive amount" })
      return
    }

    setIsProcessing((prev) => ({ ...prev, buy: true }))

    try {
      const result = await placeBuyOrder(amount)
      setMessage({ type: result.success ? "success" : "error", text: result.message })

      if (result.success) {
        setBuyAmount("")
        // Force immediate refresh of orders and balances
        await Promise.all([refreshOrders(), refreshWalletBalances()])
      }
    } finally {
      setIsProcessing((prev) => ({ ...prev, buy: false }))
    }
  }

  const handleSellOrder = async () => {
    if (isProcessing.sell) return // Prevent double-clicking

    const shares = Number.parseFloat(sellShares)
    if (isNaN(shares) || shares <= 0) {
      setMessage({ type: "error", text: "Please enter a valid positive number of shares" })
      return
    }

    // Check if user has enough shares in holdWalletPostHold
    if (shares > holdWalletPostHold) {
      setMessage({ type: "error", text: "Insufficient shares in Hold Wallet (Post-Hold)" })
      return
    }

    setIsProcessing((prev) => ({ ...prev, sell: true }))

    try {
      const result = await placeSellOrder(shares)
      setMessage({ type: result.success ? "success" : "error", text: result.message })

      if (result.success) {
        setSellShares("")
        // Force immediate refresh of orders and balances
        await Promise.all([refreshOrders(), refreshWalletBalances()])
      }
    } finally {
      setIsProcessing((prev) => ({ ...prev, sell: false }))
    }
  }

  const handleCashout = async () => {
    if (isProcessing.cashout) return // Prevent double-clicking

    const amount = Number.parseFloat(cashoutAmount)
    if (isNaN(amount) || amount <= 0) {
      setMessage({ type: "error", text: "Please enter a valid positive cashout amount" })
      return
    }

    if (amount > cashoutWalletBalance) {
      setMessage({ type: "error", text: "Insufficient cashout balance" })
      return
    }

    setIsProcessing((prev) => ({ ...prev, cashout: true }))

    try {
      // Mock cashout logic - would integrate with real cashout system
      setMessage({ type: "success", text: `Cashout request for ${formatCurrency(amount)} submitted successfully` })
      setCashoutAmount("")
      await refreshWalletBalances()
    } finally {
      setIsProcessing((prev) => ({ ...prev, cashout: false }))
    }
  }

  // Helper function to determine correct status based on fill percentage
  const getCorrectStatus = (order: any, isUserOrder = false) => {
    let fillPercentage = 0

    if ("total_amount" in order) {
      // Buy order
      fillPercentage = (order.filled_amount / order.total_amount) * 100
    } else {
      // Sell order
      fillPercentage = (order.filled_shares / order.shares) * 100
    }

    if (fillPercentage === 0) {
      return "total_amount" in order ? "pending" : "available"
    } else if (fillPercentage > 0 && fillPercentage < 100) {
      return "partial"
    } else if (fillPercentage >= 100) {
      return isUserOrder ? "completed" : "filled"
    }

    return order.status // fallback to original status
  }

  const getStatusBadge = (order: any, isUserOrder = false) => {
    const actualStatus = getCorrectStatus(order, isUserOrder)

    const variants = {
      pending: "secondary",
      partial: "outline",
      completed: "default",
      filled: "default",
      available: "default",
      expired: "destructive",
      cancelled: "destructive",
    } as const

    const colors = {
      pending: "bg-yellow-500",
      partial: "bg-orange-500",
      completed: "bg-green-500",
      filled: "bg-blue-500",
      available: "bg-green-500",
      expired: "bg-red-500",
      cancelled: "bg-gray-500",
    } as const

    return (
      <Badge
        variant={variants[actualStatus as keyof typeof variants] || "secondary"}
        className={colors[actualStatus as keyof typeof colors] || "bg-gray-500"}
      >
        {actualStatus.replace("_", " ").toUpperCase()}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <span className="ml-2 text-white">Loading exchange data...</span>
        </div>
      </div>
    )
  }

  if (walletError || exchangeError) {
    return (
      <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error loading data: {walletError || exchangeError}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
      {/* Alert Banner */}
      <Alert className="bg-green-100 border-green-500 text-green-800 dark:bg-green-900 dark:border-green-600 dark:text-green-100">
        <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertDescription className="text-green-800 dark:text-green-100">
          Share Exchange is now live! Current price: <strong>{formatCurrency(currentSharePrice)}</strong> per share
        </AlertDescription>
      </Alert>

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-4 gap-6">
        {/* Share Price Section */}
        <div className="col-span-1">
          <Card className="bg-slate-800 border-slate-700 text-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Current Share Price</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{formatCurrency(currentSharePrice)}</div>
              <p className="text-xs text-slate-400 mt-1">per share</p>
            </CardContent>
          </Card>
        </div>

        {/* Wallet Cards */}
        <div className="col-span-3 grid grid-cols-3 gap-4">
          {/* Buy Wallet */}
          <Card className="bg-slate-800 border-slate-700 text-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center text-slate-300">
                <TrendingUp className="h-4 w-4 mr-2 text-blue-400" />
                Buy Wallet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-lg font-semibold text-slate-100">{formatCurrency(buyWalletBalance)}</div>
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="Amount (N$)"
                  value={buyAmount}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === "" || Number(value) >= 0) {
                      setBuyAmount(value)
                    }
                  }}
                  disabled={loading || isProcessing.buy}
                  min="0"
                  step="0.01"
                  className="bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400"
                />
                <Button
                  onClick={handleBuyOrder}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={loading || isProcessing.buy || !buyAmount || Number.parseFloat(buyAmount) <= 0}
                >
                  {isProcessing.buy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    "Buy Shares"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Hold Wallet (Post-Hold) */}
          <Card className="bg-slate-800 border-slate-700 text-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center text-slate-300">
                <TrendingDown className="h-4 w-4 mr-2 text-green-400" />
                Hold Wallet (Post-Hold)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-lg font-semibold text-slate-100">{formatShares(holdWalletPostHold)} shares</div>
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="Shares to sell"
                  value={sellShares}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === "" || Number(value) >= 0) {
                      setSellShares(value)
                    }
                  }}
                  disabled={loading || isProcessing.sell}
                  min="0"
                  step="0.0001"
                  className="bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400"
                />
                <Button
                  onClick={handleSellOrder}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  disabled={
                    loading ||
                    isProcessing.sell ||
                    !sellShares ||
                    Number.parseFloat(sellShares) <= 0 ||
                    Number.parseFloat(sellShares) > holdWalletPostHold
                  }
                >
                  {isProcessing.sell ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    "Sell Shares"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Cashout Wallet */}
          <Card className="bg-slate-800 border-slate-700 text-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center text-slate-300">
                <Wallet className="h-4 w-4 mr-2 text-orange-400" />
                Cashout Wallet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-lg font-semibold text-slate-100">{formatCurrency(cashoutWalletBalance)}</div>
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="Amount to cashout (N$)"
                  value={cashoutAmount}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === "" || Number(value) >= 0) {
                      setCashoutAmount(value)
                    }
                  }}
                  disabled={loading || isProcessing.cashout}
                  min="0"
                  step="0.01"
                  className="bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400"
                />
                <Button
                  onClick={handleCashout}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  disabled={loading || isProcessing.cashout || !cashoutAmount || Number.parseFloat(cashoutAmount) <= 0}
                >
                  {isProcessing.cashout ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    "Cashout"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Order Books */}
      <div className="grid grid-cols-2 gap-6">
        {/* Market Buy Orders */}
        <Card className="bg-slate-800 border-slate-700 text-slate-100">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-200">
              Market Buy Orders ({(marketBuyOrders ?? []).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(marketBuyOrders ?? []).length === 0 ? (
                <p className="text-slate-400 text-center py-4">No active buy orders</p>
              ) : (
                marketBuyOrders.slice(0, 10).map((order) => {
                  const estimatedShares = order.price_per_share > 0 ? order.total_amount / order.price_per_share : 0
                  // Ensure filled_amount is a number and total_amount is not zero to prevent NaN
                  const filledAmount = Number(order.filled_amount) || 0
                  const totalAmount = Number(order.total_amount) || 0
                  const filledPercentage = totalAmount > 0 ? (filledAmount / totalAmount) * 100 : 0

                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-2 bg-slate-700 border border-slate-600 rounded"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-slate-100">{formatCurrency(order.total_amount)}</span>
                        <span className="text-xs text-slate-400">({formatShares(estimatedShares)} shares)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(order, false)}
                        <span className="text-xs text-slate-400">{filledPercentage.toFixed(1)}% filled</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Market Sell Orders */}
        <Card className="bg-slate-800 border-slate-700 text-slate-100">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-200">
              Market Sell Orders ({(marketSellOrders ?? []).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(marketSellOrders ?? []).length === 0 ? (
                <p className="text-slate-400 text-center py-4">No active sell orders</p>
              ) : (
                marketSellOrders.slice(0, 10).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-2 bg-slate-700 border border-slate-600 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-slate-100">{formatShares(order.shares)} shares</span>
                      <span className="text-xs text-slate-400">@ {formatCurrency(order.price_per_share)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(order, false)}
                      <span className="text-xs text-slate-400">
                        {formatShares(order.filled_shares)}/{formatShares(order.shares)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Orders */}
      <div className="grid grid-cols-2 gap-6">
        {/* Your Buy Orders */}
        <Card className="bg-slate-800 border-slate-700 text-slate-100">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-200">
              Your Buy Orders ({(userBuyOrders ?? []).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(userBuyOrders ?? []).length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">No buy orders yet</p>
              ) : (
                userBuyOrders.map((order) => {
                  const estimatedShares = order.price_per_share > 0 ? order.total_amount / order.price_per_share : 0
                  // Ensure filled_amount is a number and total_amount is not zero to prevent NaN
                  const filledAmount = Number(order.filled_amount) || 0
                  const totalAmount = Number(order.total_amount) || 0
                  const filledPercentage = totalAmount > 0 ? (filledAmount / totalAmount) * 100 : 0

                  return (
                    <div key={order.id} className="p-3 border border-slate-600 rounded-lg bg-slate-700">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-medium text-slate-100">{formatCurrency(order.total_amount)}</span>
                          <span className="text-sm text-slate-400 ml-2">({formatShares(estimatedShares)} shares)</span>
                        </div>
                        {getStatusBadge(order, true)}
                      </div>
                      <Progress value={filledPercentage} className="h-2 [&>div]:bg-yellow-500" />
                      <div className="text-xs text-slate-400 mt-1">
                        Filled: {formatCurrency(filledAmount)} / {formatCurrency(totalAmount)}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Your Sell Orders */}
        <Card className="bg-slate-800 border-slate-700 text-slate-100">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-200">
              Your Sell Orders ({(userSellOrders ?? []).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(userSellOrders ?? []).length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">No sell orders yet</p>
              ) : (
                userSellOrders.map((order) => (
                  <div key={order.id} className="p-3 border border-slate-600 rounded-lg bg-slate-700">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-medium text-slate-100">{formatShares(order.shares)} shares</span>
                        <span className="text-sm text-slate-400 ml-2">@ {formatCurrency(order.price_per_share)}</span>
                      </div>
                      {getStatusBadge(order, true)}
                    </div>
                    <Progress value={(order.filled_shares / order.shares) * 100} className="h-2 [&>div]:bg-green-500" />
                    <div className="text-xs text-slate-400 mt-1">
                      Filled: {formatShares(order.filled_shares)} / {formatShares(order.shares)} shares
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
