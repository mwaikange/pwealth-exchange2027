"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useWallet } from "@/contexts/wallet-context"
import { useExchange } from "@/contexts/exchange-context"
import { useNotification } from "@/hooks/use-notification"
import { AlertCircle, TrendingUp, TrendingDown, Wallet, Loader2, Clock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ExchangePageSkeleton } from "@/components/skeletons/exchange-page-skeleton"
import { SlidingNotification } from "@/components/sliding-notification"

// Helper functions for formatting
const formatCurrency = (value: number): string => {
  return `N$${Number(value).toFixed(2)}`
}

const formatShares = (value: number): string => {
  return Number(value).toFixed(4)
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
    buyWalletBalance = 0,
    holdWalletPostHold = 0,
    cashoutWalletBalance = 0,
    loading: walletLoading,
    error: walletError,
    refreshWalletBalances,
  } = useWallet() || {}

  const {
    marketSellOrders = [],
    marketBuyOrders = [],
    userSellOrders = [],
    userBuyOrders = [],
    placeBuyOrder,
    placeSellOrder,
    currentSharePrice = 99.68,
    exchangeStatus,
    loading: exchangeLoading,
    error: exchangeError,
    refreshOrders,
  } = useExchange() || {}

  const { notifications = [], showNotification, hideNotification } = useNotification() || {}

  const loading = walletLoading || exchangeLoading

  const handleBuyOrder = async () => {
    if (isProcessing.buy) return

    const amount = Number.parseFloat(buyAmount)
    if (isNaN(amount) || amount <= 0) {
      setMessage({ type: "error", text: "Please enter a valid positive amount" })
      showNotification?.("error", "Please enter a valid positive amount")
      return
    }

    setIsProcessing((prev) => ({ ...prev, buy: true }))

    try {
      const result = await placeBuyOrder?.(amount)
      const success = result?.success ?? false
      const resultMessage = result?.message ?? (success ? "Buy order placed successfully" : "Failed to place buy order")

      setMessage({ type: success ? "success" : "error", text: resultMessage })

      if (showNotification) {
        showNotification(success ? "success" : "error", resultMessage)
      }

      if (success) {
        setBuyAmount("")
        if (refreshOrders) await refreshOrders()
        if (refreshWalletBalances) await refreshWalletBalances()
      }
    } catch (error: any) {
      const errorMessage = error?.message ?? "Failed to place buy order"
      setMessage({ type: "error", text: errorMessage })
      if (showNotification) {
        showNotification("error", errorMessage)
      }
    } finally {
      setIsProcessing((prev) => ({ ...prev, buy: false }))
    }
  }

  const handleSellOrder = async () => {
    if (isProcessing.sell) return

    const shares = Number.parseFloat(sellShares)
    if (isNaN(shares) || shares <= 0) {
      setMessage({ type: "error", text: "Please enter a valid positive number of shares" })
      showNotification?.("error", "Please enter a valid positive number of shares")
      return
    }

    if (shares > holdWalletPostHold) {
      setMessage({ type: "error", text: "Insufficient shares in Hold Wallet (Post-Hold)" })
      showNotification?.("error", "Insufficient shares in Hold Wallet (Post-Hold)")
      return
    }

    setIsProcessing((prev) => ({ ...prev, sell: true }))

    try {
      const result = await placeSellOrder?.(shares)
      const success = result?.success ?? false
      const resultMessage =
        result?.message ?? (success ? "Sell order placed successfully" : "Failed to place sell order")

      setMessage({ type: success ? "success" : "error", text: resultMessage })

      if (showNotification) {
        showNotification(success ? "success" : "error", resultMessage)
      }

      if (success) {
        setSellShares("")
        if (refreshOrders) await refreshOrders()
        if (refreshWalletBalances) await refreshWalletBalances()
      }
    } catch (error: any) {
      const errorMessage = error?.message ?? "Failed to place sell order"
      setMessage({ type: "error", text: errorMessage })
      if (showNotification) {
        showNotification("error", errorMessage)
      }
    } finally {
      setIsProcessing((prev) => ({ ...prev, sell: false }))
    }
  }

  const handleCashout = async () => {
    if (isProcessing.cashout) return

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
      setMessage({ type: "success", text: `Cashout request for ${formatCurrency(amount)} submitted successfully` })
      setCashoutAmount("")
      if (refreshWalletBalances) await refreshWalletBalances()
    } finally {
      setIsProcessing((prev) => ({ ...prev, cashout: false }))
    }
  }

  const getActualStatus = (order: any) => {
    return order?.status || "unknown"
  }

  const getStatusBadge = (order: any) => {
    const actualStatus = getActualStatus(order)
    const isExpired = actualStatus === "expired"
    const isCancelled = actualStatus === "cancelled"

    // Special styling for expired and cancelled orders - black/grey
    if (isExpired || isCancelled) {
      return (
        <Badge className="bg-gray-500 text-gray-300 hover:bg-gray-500">
          {actualStatus.replace("_", " ").toUpperCase()}
        </Badge>
      )
    }

    const variants = {
      pending: "secondary",
      partial: "outline",
      filled: "default",
      completed: "default",
      available: "default",
      matched: "default",
      unknown: "secondary",
    } as const

    const variant = variants[actualStatus as keyof typeof variants] || "secondary"

    return <Badge variant={variant}>{actualStatus.replace("_", " ").toUpperCase()}</Badge>
  }

  const getProgressBar = (order: any, orderType: "buy" | "sell") => {
    if (!order) return null

    const actualStatus = getActualStatus(order)
    const isExpired = actualStatus === "expired"
    const isCancelled = actualStatus === "cancelled"

    let progress = 0
    let filledText = ""
    let refundText = ""

    if (orderType === "buy") {
      // Use ACTUAL schema columns
      const amountFilled = Number(order.amount_filled) || 0
      const totalAmount = Number(order.total_amount) || 0
      const sharesRequested = Number(order.shares_requested) || 0
      const sharesFilled = Number(order.shares_filled) || 0

      progress = totalAmount > 0 ? (amountFilled / totalAmount) * 100 : 0
      filledText = `Filled: ${formatCurrency(amountFilled)} / ${formatCurrency(totalAmount)} (${formatShares(sharesFilled)} / ${formatShares(sharesRequested)} shares)`

      if (isExpired && order.refunded_amount) {
        refundText = ` - Refunded ${formatCurrency(order.refunded_amount)}`
      }
    } else {
      // Use ACTUAL schema columns
      const sharesRemaining = Number(order.shares_remaining) || 0
      const sharesAvailable = Number(order.shares_available) || 0
      const sharesSold = sharesAvailable - sharesRemaining
      progress = sharesAvailable > 0 ? (sharesSold / sharesAvailable) * 100 : 0
      filledText = `Sold: ${formatShares(sharesSold)} / ${formatShares(sharesAvailable)} shares`

      if (isExpired && order.refunded_shares) {
        refundText = ` - Refunded ${formatShares(order.refunded_shares)}`
      }
    }

    // Progress bar colors - ONLY CHANGE THESE COLORS
    let progressBarClass = ""
    if (isExpired || isCancelled) {
      progressBarClass = "opacity-50 [&>div]:bg-gray-500" // Grey for expired/cancelled
    } else if (orderType === "buy") {
      progressBarClass = "[&>div]:bg-green-500" // GREEN for buy orders
    } else {
      progressBarClass = "[&>div]:bg-yellow-500" // YELLOW for sell orders (keep as is)
    }

    return (
      <div className="space-y-1">
        <Progress value={progress} className={`h-2 ${progressBarClass}`} />
        <div className={`text-xs ${isExpired || isCancelled ? "text-gray-500" : "text-slate-400"}`}>
          {filledText}
          {refundText && <span className="text-yellow-400">{refundText}</span>}
        </div>
      </div>
    )
  }

  if (loading) {
    return <ExchangePageSkeleton />
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
      {/* Sliding Notifications */}
      {notifications.map((notification) => (
        <SlidingNotification
          key={notification.id}
          type={notification.type}
          message={notification.message}
          isVisible={notification.isVisible}
          onClose={() => hideNotification?.(notification.id)}
        />
      ))}

      {/* Exchange Status Banner */}
      {exchangeStatus && (
        <div className="space-y-2">
          <Alert
            className={`${
              exchangeStatus.is_trading_open
                ? "bg-green-100 border-green-500 text-green-800 dark:bg-green-900 dark:border-green-600 dark:text-green-100"
                : "bg-red-100 border-red-500 text-red-800 dark:bg-red-900 dark:border-red-600 dark:text-red-100"
            }`}
          >
            <AlertCircle
              className={`h-4 w-4 ${
                exchangeStatus.is_trading_open ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}
            />
            <AlertDescription
              className={
                exchangeStatus.is_trading_open ? "text-green-800 dark:text-green-100" : "text-red-800 dark:text-red-100"
              }
            >
              <div className="flex items-center justify-between">
                <span>{exchangeStatus.status_message}</span>
                {exchangeStatus.windhoek_time && (
                  <span className="text-sm opacity-75 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Windhoek:{" "}
                    {new Date(exchangeStatus.windhoek_time).toLocaleTimeString("en-US", {
                      hour12: false,
                      timeZone: "Africa/Windhoek",
                    })}
                  </span>
                )}
              </div>
            </AlertDescription>
          </Alert>

          {!exchangeStatus.is_trading_open && exchangeStatus.trading_schedule && (
            <Card className="bg-slate-800 border-slate-700 text-slate-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-300 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Weekly Trading Schedule ({exchangeStatus.trading_schedule.timezone})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400">Exchange Closes:</span>
                    <br />
                    <span className="text-slate-200">{exchangeStatus.trading_schedule.weekly_close}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">History Clear:</span>
                    <br />
                    <span className="text-slate-200">{exchangeStatus.trading_schedule.history_clear}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Price Update:</span>
                    <br />
                    <span className="text-slate-200">{exchangeStatus.trading_schedule.price_calculation}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Exchange Opens:</span>
                    <br />
                    <span className="text-green-400 font-semibold">{exchangeStatus.trading_schedule.weekly_open}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

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
              {exchangeStatus?.last_price_update && (
                <p className="text-xs text-slate-500 mt-1">
                  Updated: {new Date(exchangeStatus.last_price_update).toLocaleDateString()}
                </p>
              )}
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
                  disabled={
                    loading ||
                    isProcessing.buy ||
                    !buyAmount ||
                    Number.parseFloat(buyAmount) <= 0 ||
                    !exchangeStatus?.is_trading_open
                  }
                >
                  {isProcessing.buy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : !exchangeStatus?.is_trading_open ? (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Exchange Closed
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
                    Number.parseFloat(sellShares) > holdWalletPostHold ||
                    !exchangeStatus?.is_trading_open
                  }
                >
                  {isProcessing.sell ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : !exchangeStatus?.is_trading_open ? (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Exchange Closed
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
        <Card className="bg-slate-800 border-slate-700 text-slate-100 relative">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-200">
              Market Buy Orders ({marketBuyOrders.length}) - Active Only
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!exchangeStatus?.is_trading_open && (
              <div className="absolute inset-0 bg-slate-800/80 flex items-center justify-center z-10 rounded">
                <div className="text-center text-slate-300">
                  <Clock className="h-8 w-8 mx-auto mb-2" />
                  <div className="text-lg font-semibold">Exchange Closed</div>
                  <div className="text-sm">Trading resumes Monday 10:05</div>
                  <div className="text-xs text-slate-400 mt-1">Windhoek Time</div>
                </div>
              </div>
            )}
            <div className={`space-y-2 ${!exchangeStatus?.is_trading_open ? "opacity-50" : ""}`}>
              {marketBuyOrders.length === 0 ? (
                <p className="text-slate-400 text-center py-4">No active buy orders</p>
              ) : (
                marketBuyOrders.slice(0, 10).map((order) => {
                  const sharesRequested = Number(order.shares_requested) || 0
                  const amountFilled = Number(order.amount_filled) || 0
                  const totalAmount = Number(order.total_amount) || 0
                  const filledPercentage = totalAmount > 0 ? (amountFilled / totalAmount) * 100 : 0

                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-2 bg-slate-700 border border-slate-600 rounded"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-slate-100">{formatCurrency(totalAmount)}</span>
                        <span className="text-xs text-slate-400">({formatShares(sharesRequested)} shares)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(order)}
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
        <Card className="bg-slate-800 border-slate-700 text-slate-100 relative">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-200">
              Market Sell Orders ({marketSellOrders.length}) - Active Only
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!exchangeStatus?.is_trading_open && (
              <div className="absolute inset-0 bg-slate-800/80 flex items-center justify-center z-10 rounded">
                <div className="text-center text-slate-300">
                  <Clock className="h-8 w-8 mx-auto mb-2" />
                  <div className="text-lg font-semibold">Exchange Closed</div>
                  <div className="text-sm">Trading resumes Monday 10:05</div>
                  <div className="text-xs text-slate-400 mt-1">Windhoek Time</div>
                </div>
              </div>
            )}
            <div className={`space-y-2 ${!exchangeStatus?.is_trading_open ? "opacity-50" : ""}`}>
              {marketSellOrders.length === 0 ? (
                <p className="text-slate-400 text-center py-4">No active sell orders</p>
              ) : (
                marketSellOrders.slice(0, 10).map((order) => {
                  const sharesRemaining = Number(order.shares_remaining) || 0
                  const sharesAvailable = Number(order.shares_available) || 0
                  const sharesSold = sharesAvailable - sharesRemaining
                  const filledPercentage = sharesAvailable > 0 ? (sharesSold / sharesAvailable) * 100 : 0

                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-2 bg-slate-700 border border-slate-600 rounded"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-slate-100">
                          {formatShares(sharesRemaining)} shares
                        </span>
                        <span className="text-xs text-slate-400">@ {formatCurrency(order.price_per_share)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(order)}
                        <span className="text-xs text-slate-400">{filledPercentage.toFixed(1)}% sold</span>
                      </div>
                    </div>
                  )
                })
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
              Your Buy Orders ({userBuyOrders.length}) - All History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userBuyOrders.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">No buy orders yet</p>
              ) : (
                userBuyOrders.map((order) => {
                  const sharesRequested = Number(order.shares_requested) || 0

                  return (
                    <div key={order.id} className="p-3 border border-slate-600 rounded-lg bg-slate-700">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-medium text-slate-100">{formatCurrency(order.total_amount)}</span>
                          <span className="text-sm ml-2 text-slate-400">({formatShares(sharesRequested)} shares)</span>
                          <div className="text-xs mt-1 text-slate-500">
                            {order.buy_ref || `Buy_${order.id.slice(-6)}`}
                          </div>
                        </div>
                        {getStatusBadge(order)}
                      </div>
                      {getProgressBar(order, "buy")}
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
              Your Sell Orders ({userSellOrders.length}) - All History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userSellOrders.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">No sell orders yet</p>
              ) : (
                userSellOrders.map((order) => {
                  return (
                    <div key={order.id} className="p-3 border border-slate-600 rounded-lg bg-slate-700">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-medium text-slate-100">
                            {formatShares(order.shares_available)} shares
                          </span>
                          <span className="text-sm ml-2 text-slate-400">@ {formatCurrency(order.price_per_share)}</span>
                          <div className="text-xs mt-1 text-slate-500">
                            {order.sell_ref || `Sell_${order.id.slice(-6)}`}
                          </div>
                        </div>
                        {getStatusBadge(order)}
                      </div>
                      {getProgressBar(order, "sell")}
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
