"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@/contexts/wallet-context"
import { useExchange } from "@/contexts/exchange-context"
import { useTransactions } from "@/contexts/transaction-context"
import { formatCurrency, formatShares } from "@/lib/utils"
import { AlertCircle, TrendingUp, TrendingDown, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"

export default function ExchangePage() {
  const [buyAmount, setBuyAmount] = useState("")
  const [sellAmount, setSellAmount] = useState("")
  const [buyPrice, setBuyPrice] = useState("")
  const [sellPrice, setSellPrice] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const { buyWalletBalance, holdWalletPostHold, loading: walletLoading, error: walletError } = useWallet()
  const {
    currentPrice,
    buyOrders,
    sellOrders,
    userOrders,
    placeBuyOrder,
    placeSellOrder,
    cancelOrder,
    loading: exchangeLoading,
    error: exchangeError,
    refreshExchangeData,
  } = useExchange()
  const { addTransaction } = useTransactions()

  // Auto-refresh exchange data every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshExchangeData()
    }, 10000)
    return () => clearInterval(interval)
  }, [refreshExchangeData])

  const handleBuyOrder = async () => {
    if (!buyAmount || !buyPrice) {
      toast({
        title: "Invalid Input",
        description: "Please enter both amount and price",
        variant: "destructive",
      })
      return
    }

    const shares = Number(buyAmount)
    const price = Number(buyPrice)
    const totalCost = shares * price

    if (totalCost > buyWalletBalance) {
      toast({
        title: "Insufficient Funds",
        description: `You need ${formatCurrency(totalCost)} but only have ${formatCurrency(buyWalletBalance)}`,
        variant: "destructive",
      })
      return
    }

    try {
      setIsProcessing(true)
      await placeBuyOrder(shares, price)

      // Record transaction
      await addTransaction({
        transaction_type: "buy_order",
        shares: shares,
        total_amount: totalCost,
        from_wallet: "buy_wallet",
        to_wallet: "exchange",
        status: "pending",
        description: `Buy order: ${formatShares(shares)} shares at ${formatCurrency(price)} each`,
      })

      toast({
        title: "Buy Order Placed",
        description: `Order for ${formatShares(shares)} shares at ${formatCurrency(price)} each has been placed`,
      })

      setBuyAmount("")
      setBuyPrice("")
    } catch (error: any) {
      toast({
        title: "Order Failed",
        description: error.message || "Failed to place buy order",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSellOrder = async () => {
    if (!sellAmount || !sellPrice) {
      toast({
        title: "Invalid Input",
        description: "Please enter both amount and price",
        variant: "destructive",
      })
      return
    }

    const shares = Number(sellAmount)
    const price = Number(sellPrice)

    if (shares > holdWalletPostHold) {
      toast({
        title: "Insufficient Shares",
        description: `You only have ${formatShares(holdWalletPostHold)} shares available to sell`,
        variant: "destructive",
      })
      return
    }

    try {
      setIsProcessing(true)
      await placeSellOrder(shares, price)

      // Record transaction
      await addTransaction({
        transaction_type: "sell_order",
        shares: shares,
        total_amount: shares * price,
        from_wallet: "hold_post",
        to_wallet: "exchange",
        status: "pending",
        description: `Sell order: ${formatShares(shares)} shares at ${formatCurrency(price)} each`,
      })

      toast({
        title: "Sell Order Placed",
        description: `Order for ${formatShares(shares)} shares at ${formatCurrency(price)} each has been placed`,
      })

      setSellAmount("")
      setSellPrice("")
    } catch (error: any) {
      toast({
        title: "Order Failed",
        description: error.message || "Failed to place sell order",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancelOrder = async (orderId: string, orderType: "buy" | "sell") => {
    try {
      await cancelOrder(orderId, orderType)
      toast({
        title: "Order Cancelled",
        description: "Your order has been cancelled successfully",
      })
    } catch (error: any) {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel order",
        variant: "destructive",
      })
    }
  }

  if (walletLoading || exchangeLoading) {
    return (
      <div className="h-[calc(100vh-130px)] bg-gray-900 overflow-auto">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <span className="ml-2 text-white">Loading exchange data...</span>
        </div>
      </div>
    )
  }

  if (walletError || exchangeError) {
    return (
      <div className="h-[calc(100vh-130px)] bg-gray-900 overflow-auto">
        <div className="px-6 py-4">
          <div className="bg-red-600 text-white p-4 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <div>
              <h3 className="font-bold">Error Loading Exchange</h3>
              <p>{walletError || exchangeError}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-130px)] bg-gray-900 overflow-auto">
      <div className="px-6 py-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Share Exchange</h1>
            <p className="text-gray-400">Trade shares with other users</p>
          </div>
          <Button onClick={refreshExchangeData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Current Price */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-white">Current Share Price</h3>
                <p className="text-3xl font-bold text-green-400">{formatCurrency(currentPrice)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">24h Change</p>
                <div className="flex items-center text-green-400">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span>+2.5%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Balances */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white">Buy Wallet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-400">{formatCurrency(buyWalletBalance)}</p>
              <p className="text-sm text-gray-400">Available for buying shares</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white">Post-Hold Shares</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-400">{formatShares(holdWalletPostHold)}</p>
              <p className="text-sm text-gray-400">Available for selling</p>
            </CardContent>
          </Card>
        </div>

        {/* Trading Interface */}
        <Tabs defaultValue="buy" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800">
            <TabsTrigger value="buy" className="data-[state=active]:bg-green-600">
              Buy Shares
            </TabsTrigger>
            <TabsTrigger value="sell" className="data-[state=active]:bg-red-600">
              Sell Shares
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
                  Place Buy Order
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Shares to Buy</label>
                    <Input
                      type="number"
                      value={buyAmount}
                      onChange={(e) => setBuyAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Price per Share (NAD)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={buyPrice}
                      onChange={(e) => setBuyPrice(e.target.value)}
                      placeholder="Enter price"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
                {buyAmount && buyPrice && (
                  <div className="bg-slate-700 p-3 rounded-md">
                    <p className="text-sm text-gray-300">
                      Total Cost:{" "}
                      <span className="font-bold text-white">
                        {formatCurrency(Number(buyAmount) * Number(buyPrice))}
                      </span>
                    </p>
                  </div>
                )}
                <Button
                  onClick={handleBuyOrder}
                  disabled={isProcessing || !buyAmount || !buyPrice}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    "Place Buy Order"
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sell" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <TrendingDown className="w-5 h-5 mr-2 text-red-400" />
                  Place Sell Order
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Shares to Sell</label>
                    <Input
                      type="number"
                      value={sellAmount}
                      onChange={(e) => setSellAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Price per Share (NAD)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={sellPrice}
                      onChange={(e) => setSellPrice(e.target.value)}
                      placeholder="Enter price"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
                {sellAmount && sellPrice && (
                  <div className="bg-slate-700 p-3 rounded-md">
                    <p className="text-sm text-gray-300">
                      Total Revenue:{" "}
                      <span className="font-bold text-white">
                        {formatCurrency(Number(sellAmount) * Number(sellPrice))}
                      </span>
                    </p>
                  </div>
                )}
                <Button
                  onClick={handleSellOrder}
                  disabled={isProcessing || !sellAmount || !sellPrice}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    "Place Sell Order"
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Order Books */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Buy Orders */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Buy Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {buyOrders.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No buy orders</p>
                ) : (
                  buyOrders.slice(0, 10).map((order) => (
                    <div key={order.id} className="flex justify-between items-center p-2 bg-slate-700 rounded">
                      <div>
                        <span className="text-white">{formatShares(order.shares)} shares</span>
                        <span className="text-green-400 ml-2">@ {formatCurrency(order.price)}</span>
                      </div>
                      <span className="text-xs text-gray-400">{formatCurrency(order.shares * order.price)}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sell Orders */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Sell Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sellOrders.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No sell orders</p>
                ) : (
                  sellOrders.slice(0, 10).map((order) => (
                    <div key={order.id} className="flex justify-between items-center p-2 bg-slate-700 rounded">
                      <div>
                        <span className="text-white">{formatShares(order.shares)} shares</span>
                        <span className="text-red-400 ml-2">@ {formatCurrency(order.price)}</span>
                      </div>
                      <span className="text-xs text-gray-400">{formatCurrency(order.shares * order.price)}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Orders */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Your Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {userOrders.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No active orders</p>
              ) : (
                userOrders.map((order) => (
                  <div key={order.id} className="flex justify-between items-center p-3 bg-slate-700 rounded">
                    <div>
                      <span className={`font-medium ${order.type === "buy" ? "text-green-400" : "text-red-400"}`}>
                        {order.type.toUpperCase()}
                      </span>
                      <span className="text-white ml-2">
                        {formatShares(order.shares)} shares @ {formatCurrency(order.price)}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">({order.status})</span>
                    </div>
                    <Button
                      onClick={() => handleCancelOrder(order.id, order.type)}
                      variant="outline"
                      size="sm"
                      className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                    >
                      Cancel
                    </Button>
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
