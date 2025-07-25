"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useWallet } from "@/contexts/wallet-context"
import { usePrice } from "@/contexts/price-context"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react"

interface VestingStats {
  totalLockedShares: number
  totalClaimableShares: number
  totalClaimedShares: number
  totalShares: number
  averageSharesPerUser: number
}

export function OverviewComponent() {
  const { user } = useAuth()
  const {
    buyWalletBalance = 0,
    holdWalletPreHold = 0,
    holdWalletPostHold = 0,
    cashoutWalletBalance = 0,
    loading: walletLoading,
    error: walletError,
  } = useWallet()

  const { sharePrice = 100, loading: priceLoading, error: priceError } = usePrice()

  const [stats, setStats] = useState<VestingStats>({
    totalLockedShares: 0,
    totalClaimableShares: 0,
    totalClaimedShares: 0,
    totalShares: 0,
    averageSharesPerUser: 0,
  })
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)

  // Helper function to safely convert to number
  const safeNumber = (value: any): number => {
    const num = Number(value)
    return isNaN(num) ? 0 : num
  }

  // Helper function to safely format numbers
  const safeToFixed = (value: any, decimals = 2): string => {
    const num = safeNumber(value)
    return num.toFixed(decimals)
  }

  // Fetch vesting statistics
  const fetchStats = async () => {
    if (!user) return

    try {
      setStatsLoading(true)
      setStatsError(null)

      console.log("📊 Fetching vesting statistics...")

      // Fetch user's vesting data using the correct column name 'amount'
      const { data: vestingData, error: vestingError } = await supabase
        .from("pivot_vesting")
        .select("amount, status")
        .eq("user_uuid", user.id)

      if (vestingError) {
        console.error("Error fetching vesting data:", vestingError)
        throw new Error(`Error fetching vesting data: ${vestingError.message}`)
      }

      // Process vesting data with safe number conversion
      const processedData = (vestingData || []).map((item) => ({
        ...item,
        amount: safeNumber(item.amount),
      }))

      // Calculate statistics
      const totalLockedShares = processedData
        .filter((item) => item.status === "locked")
        .reduce((sum, item) => sum + item.amount, 0)

      const totalClaimableShares = processedData
        .filter((item) => item.status === "claimable" || item.status === "claim")
        .reduce((sum, item) => sum + item.amount, 0)

      const totalClaimedShares = processedData
        .filter((item) => item.status === "claimed")
        .reduce((sum, item) => sum + item.amount, 0)

      const totalShares = totalLockedShares + totalClaimableShares + totalClaimedShares

      setStats({
        totalLockedShares,
        totalClaimableShares,
        totalClaimedShares,
        totalShares,
        averageSharesPerUser: totalShares > 0 ? totalShares / 1 : 0, // Single user for now
      })

      console.log("✅ Vesting statistics loaded:", {
        totalLockedShares,
        totalClaimableShares,
        totalClaimedShares,
        totalShares,
      })
    } catch (err: any) {
      console.error("❌ Error fetching vesting statistics:", err)
      setStatsError(err.message || "Failed to fetch vesting statistics")
    } finally {
      setStatsLoading(false)
    }
  }

  // Load stats when component mounts or user changes
  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user, buyWalletBalance, holdWalletPreHold, holdWalletPostHold, cashoutWalletBalance])

  // Calculate totals with safe number conversion
  const totalBalance = safeNumber(buyWalletBalance) + safeNumber(cashoutWalletBalance)
  const portfolioValue = safeNumber(holdWalletPreHold) + safeNumber(holdWalletPostHold)
  const totalPortfolioValue = portfolioValue * safeNumber(sharePrice)

  // Calculate distribution percentages
  const totalWalletValue = totalBalance + totalPortfolioValue
  const buyPercentage = totalWalletValue > 0 ? (safeNumber(buyWalletBalance) / totalWalletValue) * 100 : 0
  const holdPrePercentage =
    totalWalletValue > 0 ? ((safeNumber(holdWalletPreHold) * safeNumber(sharePrice)) / totalWalletValue) * 100 : 0
  const holdPostPercentage =
    totalWalletValue > 0 ? ((safeNumber(holdWalletPostHold) * safeNumber(sharePrice)) / totalWalletValue) * 100 : 0
  const cashoutPercentage = totalWalletValue > 0 ? (safeNumber(cashoutWalletBalance) / totalWalletValue) * 100 : 0

  const loading = walletLoading || priceLoading || statsLoading
  const error = walletError || priceError || statsError

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-slate-600">Loading overview data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center text-red-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span className="font-medium">Error loading overview data</span>
            </div>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Balance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cash Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">N${safeToFixed(totalBalance, 2)}</div>
            <p className="text-xs text-muted-foreground">Buy + Cashout wallets</p>
          </CardContent>
        </Card>

        {/* Portfolio Value */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">N${safeToFixed(totalPortfolioValue, 2)}</div>
            <p className="text-xs text-muted-foreground">
              {safeToFixed(portfolioValue, 4)} shares @ N${safeToFixed(sharePrice, 2)}
            </p>
          </CardContent>
        </Card>

        {/* Current Share Price */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Share Price</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">N${safeToFixed(sharePrice, 2)}</div>
            <p className="text-xs text-muted-foreground">per share</p>
          </CardContent>
        </Card>

        {/* Total Vesting */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vesting</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeToFixed(stats.totalShares, 0)}</div>
            <p className="text-xs text-muted-foreground">shares across all levels</p>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Wallet Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Buy Wallet */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
                  Buy Wallet
                </span>
                <span className="text-sm text-muted-foreground">{safeToFixed(buyPercentage, 1)}%</span>
              </div>
              <div className="text-lg font-semibold">N${safeToFixed(buyWalletBalance, 2)}</div>
              <Progress value={buyPercentage} className="h-2" />
            </div>

            {/* Hold Wallet (Pre-Hold) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-yellow-600" />
                  Pre-Hold
                </span>
                <span className="text-sm text-muted-foreground">{safeToFixed(holdPrePercentage, 1)}%</span>
              </div>
              <div className="text-lg font-semibold">{safeToFixed(holdWalletPreHold, 4)} shares</div>
              <Progress value={holdPrePercentage} className="h-2 [&>div]:bg-yellow-500" />
            </div>

            {/* Hold Wallet (Post-Hold) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center">
                  <TrendingDown className="h-4 w-4 mr-2 text-green-600" />
                  Post-Hold
                </span>
                <span className="text-sm text-muted-foreground">{safeToFixed(holdPostPercentage, 1)}%</span>
              </div>
              <div className="text-lg font-semibold">{safeToFixed(holdWalletPostHold, 4)} shares</div>
              <Progress value={holdPostPercentage} className="h-2 [&>div]:bg-green-500" />
            </div>

            {/* Cashout Wallet */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center">
                  <Wallet className="h-4 w-4 mr-2 text-orange-600" />
                  Cashout
                </span>
                <span className="text-sm text-muted-foreground">{safeToFixed(cashoutPercentage, 1)}%</span>
              </div>
              <div className="text-lg font-semibold">N${safeToFixed(cashoutWalletBalance, 2)}</div>
              <Progress value={cashoutPercentage} className="h-2 [&>div]:bg-orange-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vesting Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Locked Shares */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locked Shares</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{safeToFixed(stats.totalLockedShares, 4)}</div>
            <p className="text-xs text-muted-foreground">Currently vesting</p>
          </CardContent>
        </Card>

        {/* Claimable Shares */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Claimable Shares</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{safeToFixed(stats.totalClaimableShares, 4)}</div>
            <p className="text-xs text-muted-foreground">Ready to claim</p>
          </CardContent>
        </Card>

        {/* Claimed Shares */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Claimed Shares</CardTitle>
            <Badge variant="secondary" className="text-xs">
              Total
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeToFixed(stats.totalClaimedShares, 4)}</div>
            <p className="text-xs text-muted-foreground">Historical claims</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="font-medium">Buy Shares</h3>
                  <p className="text-sm text-muted-foreground">Purchase shares on the exchange</p>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
              <div className="flex items-center space-x-3">
                <PiggyBank className="h-8 w-8 text-yellow-600" />
                <div>
                  <h3 className="font-medium">Vest Shares</h3>
                  <p className="text-sm text-muted-foreground">Lock shares for higher returns</p>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
              <div className="flex items-center space-x-3">
                <Wallet className="h-8 w-8 text-orange-600" />
                <div>
                  <h3 className="font-medium">Cashout</h3>
                  <p className="text-sm text-muted-foreground">Withdraw your earnings</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
