"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useWallet } from "@/contexts/wallet-context"
import { usePrice } from "@/contexts/price-context"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase-singleton"
import { Wallet, TrendingUp, TrendingDown, DollarSign, PieChart, Clock, CheckCircle, Lock } from "lucide-react"

// Safe number conversion with fallback
const safeNumber = (value: any): number => {
  const num = Number(value)
  return isNaN(num) ? 0 : num
}

// Safe toFixed with fallback
const safeToFixed = (value: any, decimals = 2): string => {
  const num = safeNumber(value)
  return num.toFixed(decimals)
}

// Format currency with safe conversion
const formatCurrency = (amount: any): string => {
  return `N$${safeToFixed(amount, 2)}`
}

// Format shares with safe conversion
const formatShares = (shares: any): string => {
  return safeToFixed(shares, 4)
}

interface VestingStats {
  totalLockedShares: number
  totalClaimableShares: number
  totalClaimedShares: number
  totalShares: number
  averageSharesPerUser: number
  totalUsers: number
}

export function OverviewComponent() {
  const { user } = useAuth()
  const {
    buyWalletBalance = 0,
    holdWalletPreHold = 0,
    holdWalletPostHold = 0,
    cashoutWalletBalance = 0,
    loading: walletLoading,
  } = useWallet()

  const { sharePrice = 100 } = usePrice()

  const [stats, setStats] = useState<VestingStats>({
    totalLockedShares: 0,
    totalClaimableShares: 0,
    totalClaimedShares: 0,
    totalShares: 0,
    averageSharesPerUser: 0,
    totalUsers: 0,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calculate totals with safe number conversion
  const totalBalance = safeNumber(buyWalletBalance) + safeNumber(cashoutWalletBalance)
  const portfolioValue =
    safeNumber(holdWalletPreHold) * safeNumber(sharePrice) + safeNumber(holdWalletPostHold) * safeNumber(sharePrice)

  // Fetch vesting statistics
  const fetchStats = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      console.log("📊 Fetching vesting statistics...")

      // Fetch vesting data using correct column name 'amount'
      const { data: vestingData, error: vestingError } = await supabase
        .from("pivot_vesting")
        .select("amount, status, user_uuid")

      if (vestingError) {
        console.error("Error fetching vesting data:", vestingError)
        throw new Error(`Failed to fetch vesting data: ${vestingError.message}`)
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
        .filter((item) => item.status === "claim" || item.status === "claimable")
        .reduce((sum, item) => sum + item.amount, 0)

      const totalClaimedShares = processedData
        .filter((item) => item.status === "claimed")
        .reduce((sum, item) => sum + item.amount, 0)

      const totalShares = totalLockedShares + totalClaimableShares + totalClaimedShares

      // Get unique users
      const uniqueUsers = new Set(processedData.map((item) => item.user_uuid))
      const totalUsers = uniqueUsers.size

      const averageSharesPerUser = totalUsers > 0 ? totalShares / totalUsers : 0

      setStats({
        totalLockedShares,
        totalClaimableShares,
        totalClaimedShares,
        totalShares,
        averageSharesPerUser,
        totalUsers,
      })

      console.log("✅ Statistics fetched successfully:", {
        totalLockedShares,
        totalClaimableShares,
        totalClaimedShares,
        totalShares,
        totalUsers,
      })
    } catch (err: any) {
      console.error("❌ Error fetching statistics:", err)
      setError(err.message || "Failed to fetch statistics")
    } finally {
      setLoading(false)
    }
  }

  // Load data on component mount and when user changes
  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user])

  // Refresh when wallet data changes
  useEffect(() => {
    if (user && !walletLoading) {
      fetchStats()
    }
  }, [user, walletLoading, buyWalletBalance, holdWalletPreHold, holdWalletPostHold, cashoutWalletBalance])

  if (loading && !user) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading overview...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600">Error loading overview: {error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Portfolio Overview</h1>
        <Badge variant="outline" className="text-sm">
          Share Price: {formatCurrency(sharePrice)}
        </Badge>
      </div>

      {/* Wallet Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Balance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
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
            <div className="text-2xl font-bold">{formatCurrency(portfolioValue)}</div>
            <p className="text-xs text-muted-foreground">
              {formatShares(safeNumber(holdWalletPreHold) + safeNumber(holdWalletPostHold))} shares
            </p>
          </CardContent>
        </Card>

        {/* Buy Wallet */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Buy Wallet</CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(buyWalletBalance)}</div>
            <p className="text-xs text-muted-foreground">Available for purchases</p>
          </CardContent>
        </Card>

        {/* Cashout Wallet */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cashout Wallet</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(cashoutWalletBalance)}</div>
            <p className="text-xs text-muted-foreground">Ready for withdrawal</p>
          </CardContent>
        </Card>
      </div>

      {/* Hold Wallets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pre-Hold Wallet */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="h-5 w-5 mr-2 text-yellow-600" />
              Hold Wallet (Pre-Hold)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600 mb-2">{formatShares(holdWalletPreHold)} shares</div>
            <div className="text-lg text-slate-600 mb-4">
              Value: {formatCurrency(safeNumber(holdWalletPreHold) * safeNumber(sharePrice))}
            </div>
            <p className="text-sm text-slate-500">Shares available for vesting into hold periods</p>
          </CardContent>
        </Card>

        {/* Post-Hold Wallet */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              Hold Wallet (Post-Hold)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 mb-2">{formatShares(holdWalletPostHold)} shares</div>
            <div className="text-lg text-slate-600 mb-4">
              Value: {formatCurrency(safeNumber(holdWalletPostHold) * safeNumber(sharePrice))}
            </div>
            <p className="text-sm text-slate-500">Shares available for selling on the exchange</p>
          </CardContent>
        </Card>
      </div>

      {/* Vesting Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-purple-600" />
            Vesting Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Locked Shares */}
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 mb-1">{formatShares(stats.totalLockedShares)}</div>
              <div className="text-sm text-slate-600 mb-2">Locked Shares</div>
              <Progress
                value={stats.totalShares > 0 ? (stats.totalLockedShares / stats.totalShares) * 100 : 0}
                className="h-2"
              />
            </div>

            {/* Claimable Shares */}
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">{formatShares(stats.totalClaimableShares)}</div>
              <div className="text-sm text-slate-600 mb-2">Claimable Shares</div>
              <Progress
                value={stats.totalShares > 0 ? (stats.totalClaimableShares / stats.totalShares) * 100 : 0}
                className="h-2"
              />
            </div>

            {/* Claimed Shares */}
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">{formatShares(stats.totalClaimedShares)}</div>
              <div className="text-sm text-slate-600 mb-2">Claimed Shares</div>
              <Progress
                value={stats.totalShares > 0 ? (stats.totalClaimedShares / stats.totalShares) * 100 : 0}
                className="h-2"
              />
            </div>
          </div>

          {/* Summary Stats */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-slate-900">{formatShares(stats.totalShares)}</div>
                <div className="text-sm text-slate-600">Total Shares</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-slate-900">{safeToFixed(stats.averageSharesPerUser, 2)}</div>
                <div className="text-sm text-slate-600">Avg Shares/User</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-slate-900">{stats.totalUsers}</div>
                <div className="text-sm text-slate-600">Active Users</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <PieChart className="h-5 w-5 mr-2 text-indigo-600" />
            Portfolio Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Cash vs Shares */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Cash ({formatCurrency(totalBalance)})</span>
                <span>Shares ({formatCurrency(portfolioValue)})</span>
              </div>
              <Progress
                value={totalBalance + portfolioValue > 0 ? (totalBalance / (totalBalance + portfolioValue)) * 100 : 50}
                className="h-3"
              />
            </div>

            {/* Pre-Hold vs Post-Hold */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Pre-Hold ({formatShares(holdWalletPreHold)})</span>
                <span>Post-Hold ({formatShares(holdWalletPostHold)})</span>
              </div>
              <Progress
                value={
                  safeNumber(holdWalletPreHold) + safeNumber(holdWalletPostHold) > 0
                    ? (safeNumber(holdWalletPreHold) /
                        (safeNumber(holdWalletPreHold) + safeNumber(holdWalletPostHold))) *
                      100
                    : 50
                }
                className="h-3"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
