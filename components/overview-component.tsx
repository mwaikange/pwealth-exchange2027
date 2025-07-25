"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useWallet } from "@/contexts/wallet-context"
import { usePrice } from "@/contexts/price-context"
import { supabase } from "@/lib/supabase-singleton"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Lock,
  Unlock,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react"

interface OverviewStats {
  totalUsers: number
  totalShares: number
  totalLockedShares: number
  totalClaimableShares: number
  totalClaimedShares: number
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
  } = useWallet()
  const { sharePrice = 100, loading: priceLoading } = usePrice()

  const [stats, setStats] = useState<OverviewStats>({
    totalUsers: 0,
    totalShares: 0,
    totalLockedShares: 0,
    totalClaimableShares: 0,
    totalClaimedShares: 0,
    averageSharesPerUser: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Safe number conversion with fallback
  const safeNumber = (value: any, fallback = 0): number => {
    const num = Number(value)
    return isNaN(num) ? fallback : num
  }

  // Safe formatting function
  const safeToFixed = (value: any, decimals = 2): string => {
    const num = safeNumber(value, 0)
    return num.toFixed(decimals)
  }

  // Fetch overview statistics
  const fetchStats = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // Fetch total locked shares from pivot_vesting table
      const { data: vestingData, error: vestingError } = await supabase.from("pivot_vesting").select("amount, status")

      if (vestingError) {
        console.error("Error fetching vesting data:", vestingError)
        throw new Error(`Failed to fetch vesting data: ${vestingError.message}`)
      }

      // Calculate vesting statistics with safe number conversion
      const totalLockedShares = (vestingData || [])
        .filter((item) => item.status === "locked")
        .reduce((sum, item) => sum + safeNumber(item.amount, 0), 0)

      const totalClaimableShares = (vestingData || [])
        .filter((item) => item.status === "claimable" || item.status === "claim")
        .reduce((sum, item) => sum + safeNumber(item.amount, 0), 0)

      const totalClaimedShares = (vestingData || [])
        .filter((item) => item.status === "claimed")
        .reduce((sum, item) => sum + safeNumber(item.amount, 0), 0)

      // Fetch user count and other stats
      const { count: userCount, error: userError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })

      if (userError) {
        console.error("Error fetching user count:", userError)
      }

      // Calculate total shares (sum of all wallet balances) with safe number conversion
      const safeHoldPreHold = safeNumber(holdWalletPreHold, 0)
      const safeHoldPostHold = safeNumber(holdWalletPostHold, 0)
      const totalShares = safeHoldPreHold + safeHoldPostHold + totalLockedShares + totalClaimedShares

      const safeUserCount = safeNumber(userCount, 0)

      setStats({
        totalUsers: safeUserCount,
        totalShares,
        totalLockedShares,
        totalClaimableShares,
        totalClaimedShares,
        averageSharesPerUser: safeUserCount > 0 ? totalShares / safeUserCount : 0,
      })

      console.log("✅ Overview stats loaded:", {
        totalUsers: safeUserCount,
        totalShares,
        totalLockedShares,
        totalClaimableShares,
        totalClaimedShares,
      })
    } catch (err: any) {
      console.error("❌ Error fetching overview stats:", err)
      setError(err.message || "Failed to load overview data")
    } finally {
      setLoading(false)
    }
  }

  // Load stats on component mount and user change
  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user, holdWalletPreHold, holdWalletPostHold]) // Add dependencies to refetch when wallet data changes

  // Calculate portfolio value with safe number conversion
  const safeBuyWallet = safeNumber(buyWalletBalance, 0)
  const safeCashoutWallet = safeNumber(cashoutWalletBalance, 0)
  const safeHoldPreHold = safeNumber(holdWalletPreHold, 0)
  const safeHoldPostHold = safeNumber(holdWalletPostHold, 0)
  const safeSharePrice = safeNumber(sharePrice, 100)
  const safeTotalLockedShares = safeNumber(stats.totalLockedShares, 0)

  const portfolioValue = (safeHoldPreHold + safeHoldPostHold + safeTotalLockedShares) * safeSharePrice
  const totalBalance = safeBuyWallet + safeCashoutWallet + portfolioValue

  // Calculate distribution percentages
  const getDistributionPercentage = (value: number, total: number) => {
    return total > 0 ? (value / total) * 100 : 0
  }

  if (loading || walletLoading || priceLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-slate-600">Loading overview data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Portfolio Overview</h1>
          <p className="text-slate-600">Your complete financial dashboard</p>
        </div>
        <Button onClick={fetchStats} variant="outline" size="sm">
          <TrendingUp className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
              <DollarSign className="w-4 h-4 mr-2 text-green-500" />
              Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">N${safeToFixed(totalBalance, 2)}</div>
            <p className="text-xs text-slate-500">Cash + Portfolio Value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-blue-500" />
              Portfolio Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">N${safeToFixed(portfolioValue, 2)}</div>
            <p className="text-xs text-slate-500">
              {safeToFixed(safeHoldPreHold + safeHoldPostHold + safeTotalLockedShares, 4)} shares
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
              <Users className="w-4 h-4 mr-2 text-purple-500" />
              Share Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">N${safeToFixed(safeSharePrice, 2)}</div>
            <p className="text-xs text-slate-500">per share</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
              <Lock className="w-4 h-4 mr-2 text-orange-500" />
              Locked Shares
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{safeToFixed(safeTotalLockedShares, 4)}</div>
            <p className="text-xs text-slate-500">in vesting slots</p>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-900">Wallet Balances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 text-blue-500 mr-3" />
                <div>
                  <div className="font-medium text-slate-900">Buy Wallet</div>
                  <div className="text-sm text-slate-600">Available for purchases</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-900">N${safeToFixed(safeBuyWallet, 2)}</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <Lock className="w-5 h-5 text-green-500 mr-3" />
                <div>
                  <div className="font-medium text-slate-900">Hold Wallet (Pre-Hold)</div>
                  <div className="text-sm text-slate-600">Shares in holding period</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-900">{safeToFixed(safeHoldPreHold, 4)}</div>
                <div className="text-xs text-slate-500">shares</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center">
                <Unlock className="w-5 h-5 text-purple-500 mr-3" />
                <div>
                  <div className="font-medium text-slate-900">Hold Wallet (Post-Hold)</div>
                  <div className="text-sm text-slate-600">Available for trading</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-900">{safeToFixed(safeHoldPostHold, 4)}</div>
                <div className="text-xs text-slate-500">shares</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center">
                <TrendingDown className="w-5 h-5 text-orange-500 mr-3" />
                <div>
                  <div className="font-medium text-slate-900">Cashout Wallet</div>
                  <div className="text-sm text-slate-600">Ready for withdrawal</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-900">N${safeToFixed(safeCashoutWallet, 2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-slate-900">Vesting Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center">
                <Lock className="w-5 h-5 text-yellow-500 mr-3" />
                <div>
                  <div className="font-medium text-slate-900">Locked Shares</div>
                  <div className="text-sm text-slate-600">In vesting slots</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-900">{safeToFixed(stats.totalLockedShares, 4)}</div>
                <div className="text-xs text-slate-500">shares</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <Unlock className="w-5 h-5 text-green-500 mr-3" />
                <div>
                  <div className="font-medium text-slate-900">Claimable Shares</div>
                  <div className="text-sm text-slate-600">Ready to claim</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-900">{safeToFixed(stats.totalClaimableShares, 4)}</div>
                <div className="text-xs text-slate-500">shares</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-blue-500 mr-3" />
                <div>
                  <div className="font-medium text-slate-900">Claimed Shares</div>
                  <div className="text-sm text-slate-600">Previously claimed</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-900">{safeToFixed(stats.totalClaimedShares, 4)}</div>
                <div className="text-xs text-slate-500">shares</div>
              </div>
            </div>

            {/* Vesting Progress */}
            <div className="pt-2">
              <div className="flex justify-between text-sm text-slate-600 mb-2">
                <span>Vesting Progress</span>
                <span>
                  {stats.totalClaimedShares > 0
                    ? safeToFixed(
                        (stats.totalClaimedShares /
                          (stats.totalLockedShares + stats.totalClaimableShares + stats.totalClaimedShares)) *
                          100,
                        1,
                      )
                    : "0.0"}
                  %
                </span>
              </div>
              <Progress
                value={
                  stats.totalClaimedShares > 0
                    ? (stats.totalClaimedShares /
                        (stats.totalLockedShares + stats.totalClaimableShares + stats.totalClaimedShares)) *
                      100
                    : 0
                }
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900">Portfolio Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-slate-700">Cash vs Shares</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Cash (Buy + Cashout)</span>
                  <span className="font-medium">
                    {safeToFixed(getDistributionPercentage(safeBuyWallet + safeCashoutWallet, totalBalance), 1)}%
                  </span>
                </div>
                <Progress
                  value={getDistributionPercentage(safeBuyWallet + safeCashoutWallet, totalBalance)}
                  className="h-2"
                />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Shares (Portfolio Value)</span>
                  <span className="font-medium">
                    {safeToFixed(getDistributionPercentage(portfolioValue, totalBalance), 1)}%
                  </span>
                </div>
                <Progress value={getDistributionPercentage(portfolioValue, totalBalance)} className="h-2" />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-slate-700">Share Distribution</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Pre-Hold</span>
                  <span className="font-medium">
                    {safeToFixed(
                      getDistributionPercentage(
                        safeHoldPreHold,
                        safeHoldPreHold + safeHoldPostHold + safeTotalLockedShares,
                      ),
                      1,
                    )}
                    %
                  </span>
                </div>
                <Progress
                  value={getDistributionPercentage(
                    safeHoldPreHold,
                    safeHoldPreHold + safeHoldPostHold + safeTotalLockedShares,
                  )}
                  className="h-2"
                />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Post-Hold</span>
                  <span className="font-medium">
                    {safeToFixed(
                      getDistributionPercentage(
                        safeHoldPostHold,
                        safeHoldPreHold + safeHoldPostHold + safeTotalLockedShares,
                      ),
                      1,
                    )}
                    %
                  </span>
                </div>
                <Progress
                  value={getDistributionPercentage(
                    safeHoldPostHold,
                    safeHoldPreHold + safeHoldPostHold + safeTotalLockedShares,
                  )}
                  className="h-2"
                />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Vested</span>
                  <span className="font-medium">
                    {safeToFixed(
                      getDistributionPercentage(
                        safeTotalLockedShares,
                        safeHoldPreHold + safeHoldPostHold + safeTotalLockedShares,
                      ),
                      1,
                    )}
                    %
                  </span>
                </div>
                <Progress
                  value={getDistributionPercentage(
                    safeTotalLockedShares,
                    safeHoldPreHold + safeHoldPostHold + safeTotalLockedShares,
                  )}
                  className="h-2"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900">Platform Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">{safeToFixed(stats.totalUsers, 0)}</div>
              <div className="text-sm text-slate-600">Total Users</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">{safeToFixed(stats.totalShares, 0)}</div>
              <div className="text-sm text-slate-600">Total Shares</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">{safeToFixed(stats.averageSharesPerUser, 2)}</div>
              <div className="text-sm text-slate-600">Avg Shares/User</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">N${safeToFixed(safeSharePrice, 2)}</div>
              <div className="text-sm text-slate-600">Current Price</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
