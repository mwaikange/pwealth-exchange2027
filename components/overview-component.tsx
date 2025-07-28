"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useWallet, formatCurrency, formatShares } from "@/contexts/wallet-context"
import { usePrice } from "@/contexts/price-context"
import { SharePriceCard } from "@/components/SharePriceCard"
import { OverviewSkeleton } from "@/components/skeletons/overview-skeleton"
import { TrendingUp, Wallet, PiggyBank, Clock, DollarSign, Target, RefreshCw, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"

interface VestingSlot {
  id: string
  status: string
  shares_amount: number
  level: number
  slot_number: number
  created_at: string
  unlock_date?: string
}

export function OverviewComponent() {
  const { user } = useAuth()
  const {
    buyWalletBalance = 0,
    holdWalletPreHold = 0,
    holdWalletPostHold = 0,
    cashoutWalletBalance = 0,
    getTotalAccountValue,
    getCurrentSharePrice,
    loading: walletLoading,
    error: walletError,
    refreshWalletBalances,
  } = useWallet()

  const { priceData, loading: priceLoading } = usePrice()

  const [vestingSlots, setVestingSlots] = useState<VestingSlot[]>([])
  const [vestingLoading, setVestingLoading] = useState(false)
  const [vestingError, setVestingError] = useState<string | null>(null)
  const [totalAccountValue, setTotalAccountValue] = useState<number>(0)
  const [currentSharePrice, setCurrentSharePrice] = useState<number>(100.0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch vesting data
  const fetchVestingData = async () => {
    if (!user) return

    try {
      setVestingLoading(true)
      setVestingError(null)

      const { data: vestingData, error: vestingError } = await supabase
        .from("pivot_vesting")
        .select("*")
        .eq("user_uuid", user.id)
        .order("level", { ascending: true })
        .order("slot_number", { ascending: true })

      if (vestingError) {
        throw new Error(`Failed to fetch vesting data: ${vestingError.message}`)
      }

      setVestingSlots(vestingData || [])
    } catch (error: any) {
      console.error("Error fetching vesting data:", error)
      setVestingError(error.message)
      setVestingSlots([]) // Ensure it's always an array
    } finally {
      setVestingLoading(false)
    }
  }

  // Calculate values when wallet data or price changes
  useEffect(() => {
    const calculateValues = async () => {
      try {
        const [accountValue, sharePrice] = await Promise.all([getTotalAccountValue(), getCurrentSharePrice()])

        setTotalAccountValue(accountValue)
        setCurrentSharePrice(sharePrice)
      } catch (error) {
        console.error("Error calculating values:", error)
      }
    }

    if (!walletLoading && !priceLoading) {
      calculateValues()
    }
  }, [
    buyWalletBalance,
    holdWalletPreHold,
    holdWalletPostHold,
    cashoutWalletBalance,
    priceData.currentPrice,
    walletLoading,
    priceLoading,
    getTotalAccountValue,
    getCurrentSharePrice,
  ])

  // Fetch vesting data on mount
  useEffect(() => {
    if (user) {
      fetchVestingData()
    }
  }, [user])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([refreshWalletBalances(), fetchVestingData()])
    } finally {
      setIsRefreshing(false)
    }
  }

  const loading = walletLoading || priceLoading || vestingLoading

  if (loading) {
    return <OverviewSkeleton />
  }

  if (walletError) {
    return (
      <div className="p-6 space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center text-red-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span className="font-medium">Error loading wallet data</span>
            </div>
            <p className="text-red-600 text-sm mt-1">{walletError}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate portfolio metrics using current share price
  const totalShares = holdWalletPreHold + holdWalletPostHold
  const portfolioValue = totalShares * currentSharePrice
  const totalCash = buyWalletBalance + cashoutWalletBalance

  // Calculate vesting metrics - ensure vestingSlots is always an array
  const safeVestingSlots = Array.isArray(vestingSlots) ? vestingSlots : []
  const activeVestingSlots = safeVestingSlots.filter(
    (slot) => slot.status === "active" || slot.status === "locked",
  ).length
  const totalVestingValue = safeVestingSlots.reduce((sum, slot) => {
    if (slot.status === "active" || slot.status === "locked") {
      return sum + (slot.shares_amount || 0) * currentSharePrice
    }
    return sum
  }, 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Overview</h1>
          <p className="text-muted-foreground">Track your investments and performance</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Share Price Card */}
        <SharePriceCard />

        {/* Portfolio Value */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(portfolioValue)}</div>
            <p className="text-xs text-muted-foreground">
              {formatShares(totalShares)} shares @ {formatCurrency(currentSharePrice)}
            </p>
          </CardContent>
        </Card>

        {/* Total Account Value */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Account Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAccountValue)}</div>
            <p className="text-xs text-muted-foreground">
              Portfolio + Cash: {formatCurrency(portfolioValue + totalCash)}
            </p>
          </CardContent>
        </Card>

        {/* Active Vesting */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vesting</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeVestingSlots}</div>
            <p className="text-xs text-muted-foreground">Value: {formatCurrency(totalVestingValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Tabs defaultValue="wallets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="wallets">Wallet Breakdown</TabsTrigger>
          <TabsTrigger value="vesting">Vesting Schedule</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="wallets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Buy Wallet */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Buy Wallet</CardTitle>
                <Wallet className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-blue-600">{formatCurrency(buyWalletBalance)}</div>
                <p className="text-xs text-muted-foreground">Available for purchases</p>
              </CardContent>
            </Card>

            {/* Hold Wallet (Pre-Hold) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hold Wallet (Pre)</CardTitle>
                <PiggyBank className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-orange-600">{formatShares(holdWalletPreHold)}</div>
                <p className="text-xs text-muted-foreground">
                  Value: {formatCurrency(holdWalletPreHold * currentSharePrice)}
                </p>
              </CardContent>
            </Card>

            {/* Hold Wallet (Post-Hold) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hold Wallet (Post)</CardTitle>
                <Target className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-green-600">{formatShares(holdWalletPostHold)}</div>
                <p className="text-xs text-muted-foreground">
                  Value: {formatCurrency(holdWalletPostHold * currentSharePrice)}
                </p>
              </CardContent>
            </Card>

            {/* Cashout Wallet */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cashout Wallet</CardTitle>
                <DollarSign className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-purple-600">{formatCurrency(cashoutWalletBalance)}</div>
                <p className="text-xs text-muted-foreground">Ready for withdrawal</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vesting" className="space-y-4">
          {vestingError && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-center text-yellow-600">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">Warning: {vestingError}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {safeVestingSlots.length > 0 ? (
              safeVestingSlots.map((slot) => (
                <Card key={slot.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        Level {slot.level} - Slot {slot.slot_number}
                      </CardTitle>
                      <Badge variant={slot.status === "active" || slot.status === "locked" ? "default" : "secondary"}>
                        {slot.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Shares:</span>
                        <span className="text-sm font-medium">{formatShares(slot.shares_amount || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Value:</span>
                        <span className="text-sm font-medium">
                          {formatCurrency((slot.shares_amount || 0) * currentSharePrice)}
                        </span>
                      </div>
                      {slot.unlock_date && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Unlocks:</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(slot.unlock_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <PiggyBank className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No vesting slots found.</p>
                <p className="text-sm">Start investing to see your vesting schedule.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Share Price</span>
                  <span className="text-sm">{formatCurrency(currentSharePrice)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Shares Owned</span>
                  <span className="text-sm">{formatShares(totalShares)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Portfolio Value</span>
                  <span className="text-sm font-semibold">{formatCurrency(portfolioValue)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Available Cash</span>
                  <span className="text-sm">{formatCurrency(totalCash)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Total Account Value</span>
                    <span className="text-sm font-bold text-green-600">{formatCurrency(totalAccountValue)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* JSE200 Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Market Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">JSE200 Growth</span>
                  <Badge variant={priceData.j200Growth >= 0 ? "default" : "destructive"}>
                    {priceData.j200Growth >= 0 ? "+" : ""}
                    {priceData.j200Growth.toFixed(2)}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Price Change</span>
                  <span
                    className={`text-sm font-medium ${priceData.priceChange >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatCurrency(priceData.priceChange)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Percentage Change</span>
                  <span
                    className={`text-sm font-medium ${priceData.percentageChange >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {priceData.percentageChange >= 0 ? "+" : ""}
                    {priceData.percentageChange.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Last Updated</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(priceData.lastUpdated).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
