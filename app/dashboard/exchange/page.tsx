"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useExchange } from "@/contexts/exchange-context"
import { useWallet } from "@/contexts/wallet-context"
import { useToast } from "@/components/ui/use-toast"

export default function ExchangePage() {
  const [buyAmount, setBuyAmount] = useState("")
  const [sellShares, setSellShares] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { toast } = useToast()
  const {
    marketBuyOrders,
    marketSellOrders,
    userBuyOrders,
    userSellOrders,
    placeBuyOrder,
    placeSellOrder,
    currentSharePrice,
  } = useExchange()

  const { buyWalletBalance, holdWalletPostHold } = useWallet()

  const handleBuyOrder = async () => {
    setIsSubmitting(true)
    try {
      const amount = Number.parseFloat(buyAmount)
      if (isNaN(amount) || amount <= 0) {
        toast({ title: "Invalid amount", description: "Please enter a valid amount", variant: "destructive" })
        return
      }

      const result = await placeBuyOrder(amount)

      if (result.success) {
        toast({ title: "Success", description: result.message })
        setBuyAmount("")
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSellOrder = async () => {
    setIsSubmitting(true)
    try {
      const shares = Number.parseFloat(sellShares)
      if (isNaN(shares) || shares <= 0) {
        toast({ title: "Invalid shares", description: "Please enter a valid number of shares", variant: "destructive" })
        return
      }

      const result = await placeSellOrder(shares)

      if (result.success) {
        toast({ title: "Success", description: result.message })
        setSellShares("")
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Buy Shares</CardTitle>
          <CardDescription>Current price: N${currentSharePrice.toFixed(2)} per share</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Buy Wallet Balance: N${buyWalletBalance.toFixed(2)}</p>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  placeholder="Amount in N$"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  min="50"
                  step="10"
                />
                <Button onClick={handleBuyOrder} disabled={isSubmitting}>
                  Buy
                </Button>
              </div>
              {buyAmount && !isNaN(Number.parseFloat(buyAmount)) && (
                <p className="text-sm mt-2">
                  This will buy approximately {(Number.parseFloat(buyAmount) / currentSharePrice).toFixed(2)} shares
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sell Shares</CardTitle>
          <CardDescription>Current price: N${currentSharePrice.toFixed(2)} per share</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">
                Post-Hold Wallet Balance: {holdWalletPostHold.toFixed(2)} shares
              </p>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  placeholder="Number of shares"
                  value={sellShares}
                  onChange={(e) => setSellShares(e.target.value)}
                  min="0.5"
                  step="0.5"
                />
                <Button onClick={handleSellOrder} disabled={isSubmitting}>
                  Sell
                </Button>
              </div>
              {sellShares && !isNaN(Number.parseFloat(sellShares)) && (
                <p className="text-sm mt-2">
                  This will sell {Number.parseFloat(sellShares)} shares for approximately N$
                  {(Number.parseFloat(sellShares) * currentSharePrice).toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Market Buy Orders ({marketBuyOrders?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {marketBuyOrders?.length > 0 ? (
            <div className="space-y-2">
              {marketBuyOrders.map((order) => (
                <div key={order.id} className="flex justify-between p-2 bg-muted rounded-md">
                  <span>N${order.total_amount.toFixed(2)}</span>
                  <span>{(order.total_amount / order.price_per_share).toFixed(2)} shares</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No active buy orders</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Market Sell Orders ({marketSellOrders?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {marketSellOrders?.length > 0 ? (
            <div className="space-y-2">
              {marketSellOrders.map((order) => (
                <div key={order.id} className="flex justify-between p-2 bg-muted rounded-md">
                  <span>{order.shares.toFixed(2)} shares</span>
                  <span>N${(order.shares * order.price_per_share).toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No active sell orders</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Buy Orders ({userBuyOrders?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {userBuyOrders?.length > 0 ? (
            <div className="space-y-2">
              {userBuyOrders.map((order) => (
                <div key={order.id} className="flex justify-between p-2 bg-muted rounded-md">
                  <span>N${order.total_amount.toFixed(2)}</span>
                  <span>{order.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No buy orders yet</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Sell Orders ({userSellOrders?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {userSellOrders?.length > 0 ? (
            <div className="space-y-2">
              {userSellOrders.map((order) => (
                <div key={order.id} className="flex justify-between p-2 bg-muted rounded-md">
                  <span>{order.shares.toFixed(2)} shares</span>
                  <span>{order.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No sell orders yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
