"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useWallet } from "@/contexts/wallet-context"
import { useExchange } from "@/contexts/exchange-context"
import { usePrice } from "@/contexts/price-context"
import { useNotification } from "@/hooks/use-notification"
import { SlidingNotification } from "@/components/sliding-notification"
import { OrderTable } from "@/components/OrderTable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, TrendingUp, TrendingDown, DollarSign, Users } from "lucide-react"

export default function ExchangePage() {
  const { user } = useAuth()
  const { holdWalletPostHold, cashBalance, loading: walletLoading } = useWallet()
  const { sharePrice, loading: priceLoading } = usePrice()
  const { notifications, showNotification, hideNotification } = useNotification()

  const {
    buyOrders,
    sellOrders,
    userBuyOrders,
    userSellOrders,
    placeBuyOrder,
    placeSellOrder,
    loading: exchangeLoading,
    error: exchangeError,
  } = useExchange()

  // Form states
  const [buyAmount, setBuyAmount] = useState("")
  const [buyPrice, setBuyPrice] = useState("")
  const [sellAmount, setSellAmount] = useState("")
  const [sellPrice, setSellPrice] = useState("")
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)

  // Set default prices to current share price
  useEffect(() => {
    if (sharePrice > 0) {
      setBuyPrice(sharePrice.toFixed(2))
      setSellPrice(sharePrice.toFixed(2))
    }
  }, [sharePrice])

  // Handle buy order submission
  const handleBuyOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || isPlacingOrder) return

    const shares = Number.parseFloat(buyAmount)
    const price = Number.parseFloat(buyPrice)

    if (isNaN(shares) || isNaN(price) || shares <= 0 || price <= 0) {
      showNotification("error", "Please enter valid amounts")
      return
    }

    const totalCost = shares * price
    if (totalCost > cashBalance) {
      showNotification("error", "Insufficient cash balance")
      return
    }

    try {
      setIsPlacingOrder(true)
      await placeBuyOrder(shares, price)

      // Show success notification
      showNotification(
        "success",
        `Buy order placed: ${shares.toFixed(4)} shares at N$${price.toFixed(2)} each (Total: N$${totalCost.toFixed(2)})`,
      )

      // Reset form
      setBuyAmount("")
      setBuyPrice(sharePrice.toFixed(2))
    } catch (error: any) {
      showNotification("error", `Failed to place buy order: ${error.message}`)
    } finally {
      setIsPlacingOrder(false)
    }
  }

  // Handle sell order submission
  const handleSellOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || isPlacingOrder) return

    const shares = Number.parseFloat(sellAmount)
    const price = Number.parseFloat(sellPrice)

    if (isNaN(shares) || isNaN(price) || shares <= 0 || price <= 0) {
      showNotification("error", "Please enter valid amounts")
      return
    }

    if (shares > holdWalletPostHold) {
      showNotification("error", "Insufficient shares in post-hold wallet")
      return
    }

    try {
      setIsPlacingOrder(true)
      await placeSellOrder(shares, price)

      // Show success notification
      const totalValue = shares * price
      showNotification(
        "success",
        `Sell order placed: ${shares.toFixed(4)} shares at N$${price.toFixed(2)} each (Total: N$${totalValue.toFixed(2)})`,
      )

      // Reset form
      setSellAmount("")
      setSellPrice(sharePrice.toFixed(2))
    } catch (error: any) {
      showNotification("error", `Failed to place sell order: ${error.message}`)
    } finally {
      setIsPlacingOrder(false)
    }
  }

  // Helper functions
  const setMaxBuyAmount = () => {
    const price = Number.parseFloat(buyPrice) || sharePrice
    const maxShares = cashBalance / price
    setBuyAmount(maxShares.toFixed(4))
  }

  const setMaxSellAmount = () => {
    setSellAmount(holdWalletPostHold.toFixed(4))
  }

  const setCurrentPrice = (isBuy: boolean) => {
    const currentPrice = sharePrice.toFixed(2)
    if (isBuy) {
      setBuyPrice(currentPrice)
    } else {
      setSellPrice(currentPrice)
    }
  }

  if (walletLoading || priceLoading || exchangeLoading) {
    return (
      <div className="h-[calc(100vh-130px)] bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading exchange data...</div>
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
            <h1 className="text-3xl font-bold text-white">Exchange</h1>
            <p className="text-slate-400">Trade your shares on the peer-to-peer exchange</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-400">N${sharePrice.toFixed(2)}</div>
            <div className="text-sm text-slate-400">Current Share Price</div>
          </div>
        </div>

        {/* Error Display */}
        {exchangeError && (
          <div className="bg-red-900/30 border border-red-600/30 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
              <span className="text-red-400">{exchangeError}</span>
            </div>
          </div>
        )}

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-200 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-green-400" />
                Cash Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">N${cashBalance.toFixed(2)}</div>
              <p className="text-sm text-slate-400">Available for buying shares</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-200 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-blue-400" />
                Post-Hold Shares
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{holdWalletPostHold.toFixed(4)}</div>
              <p className="text-sm text-slate-400">Available for selling</p>
            </CardContent>
          </Card>
        </div>

        {/* Trading Forms */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Buy Order Form */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-green-400 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Place Buy Order
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBuyOrder} className="space-y-4">
                <div>
                  <Label htmlFor="buyAmount" className="text-slate-300">
                    Shares to Buy
                  </Label>
                  <div className="flex mt-1">
                    <Input
                      id="buyAmount"
                      type="number"
                      step="0.0001"
                      min="0"
                      value={buyAmount}
                      onChange={(e) => setBuyAmount(e.target.value)}
                      placeholder="0.0000"
                      className="bg-slate-700 border-slate-600 text-white"
                      disabled={isPlacingOrder}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={setMaxBuyAmount}
                      className="ml-2 bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                      disabled={isPlacingOrder}
                    >
                      MAX
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="buyPrice" className="text-slate-300">
                    Price per Share (N$)
                  </Label>
                  <div className="flex mt-1">
                    <Input
                      id="buyPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={buyPrice}
                      onChange={(e) => setBuyPrice(e.target.value)}
                      placeholder="0.00"
                      className="bg-slate-700 border-slate-600 text-white"
                      disabled={isPlacingOrder}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPrice(true)}
                      className="ml-2 bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                      disabled={isPlacingOrder}
                    >
                      CURRENT
                    </Button>
                  </div>
                </div>

                {buyAmount && buyPrice && (
                  <div className="p-3 bg-slate-700 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Total Cost:</span>
                      <span className="text-green-400 font-medium">
                        N${(Number.parseFloat(buyAmount) * Number.parseFloat(buyPrice)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={isPlacingOrder || !buyAmount || !buyPrice}
                >
                  {isPlacingOrder ? "Placing Order..." : "Place Buy Order"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Sell Order Form */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center">
                <TrendingDown className="w-5 h-5 mr-2" />
                Place Sell Order
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSellOrder} className="space-y-4">
                <div>
                  <Label htmlFor="sellAmount" className="text-slate-300">
                    Shares to Sell
                  </Label>
                  <div className="flex mt-1">
                    <Input
                      id="sellAmount"
                      type="number"
                      step="0.0001"
                      min="0"
                      max={holdWalletPostHold}
                      value={sellAmount}
                      onChange={(e) => setSellAmount(e.target.value)}
                      placeholder="0.0000"
                      className="bg-slate-700 border-slate-600 text-white"
                      disabled={isPlacingOrder}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={setMaxSellAmount}
                      className="ml-2 bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                      disabled={isPlacingOrder}
                    >
                      MAX
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="sellPrice" className="text-slate-300">
                    Price per Share (N$)
                  </Label>
                  <div className="flex mt-1">
                    <Input
                      id="sellPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={sellPrice}
                      onChange={(e) => setSellPrice(e.target.value)}
                      placeholder="0.00"
                      className="bg-slate-700 border-slate-600 text-white"
                      disabled={isPlacingOrder}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPrice(false)}
                      className="ml-2 bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                      disabled={isPlacingOrder}
                    >
                      CURRENT
                    </Button>
                  </div>
                </div>

                {sellAmount && sellPrice && (
                  <div className="p-3 bg-slate-700 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Total Value:</span>
                      <span className="text-red-400 font-medium">
                        N${(Number.parseFloat(sellAmount) * Number.parseFloat(sellPrice)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700"
                  disabled={isPlacingOrder || !sellAmount || !sellPrice}
                >
                  {isPlacingOrder ? "Placing Order..." : "Place Sell Order"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Order Tables */}
        <Tabs defaultValue="market" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800">
            <TabsTrigger value="market" className="data-[state=active]:bg-slate-700">
              Market Orders
            </TabsTrigger>
            <TabsTrigger value="your-buy" className="data-[state=active]:bg-slate-700">
              Your Buy Orders
            </TabsTrigger>
            <TabsTrigger value="your-sell" className="data-[state=active]:bg-slate-700">
              Your Sell Orders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="market" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-green-400 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Buy Orders ({buyOrders.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <OrderTable orders={buyOrders} type="buy" />
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-red-400 flex items-center">
                    <TrendingDown className="w-5 h-5 mr-2" />
                    Sell Orders ({sellOrders.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <OrderTable orders={sellOrders} type="sell" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="your-buy">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-green-400 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Your Buy Orders ({userBuyOrders.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OrderTable orders={userBuyOrders} type="buy" showUserActions />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="your-sell">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Your Sell Orders ({userSellOrders.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OrderTable orders={userSellOrders} type="sell" showUserActions />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Market Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Buy Orders</p>
                  <p className="text-2xl font-bold text-green-400">{buyOrders.length}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Sell Orders</p>
                  <p className="text-2xl font-bold text-red-400">{sellOrders.length}</p>
                </div>
                <TrendingDown className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Your Active Orders</p>
                  <p className="text-2xl font-bold text-blue-400">{userBuyOrders.length + userSellOrders.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Share Price</p>
                  <p className="text-2xl font-bold text-yellow-400">N${sharePrice.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trading Info */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-200 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-blue-400" />
              Trading Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-slate-200 mb-2">Buy Orders</h4>
                <ul className="space-y-1 text-slate-400">
                  <li>• Use your cash balance to buy shares</li>
                  <li>• Orders are matched automatically with sell orders</li>
                  <li>• Purchased shares go to your post-hold wallet</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-slate-200 mb-2">Sell Orders</h4>
                <ul className="space-y-1 text-slate-400">
                  <li>• Only post-hold shares can be sold</li>
                  <li>• Orders are matched automatically with buy orders</li>
                  <li>• Sale proceeds go to your cash balance</li>
                </ul>
              </div>
            </div>
            <Separator className="bg-slate-700" />
            <div className="text-sm text-slate-400">
              <p>
                <strong className="text-slate-300">Note:</strong> All trades are peer-to-peer. Orders are matched
                automatically when compatible buy and sell orders are found. Current share price is N$
                {sharePrice.toFixed(2)}.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
