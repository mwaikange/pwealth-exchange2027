"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/contexts/auth-context"
import { useWallet } from "@/contexts/wallet-context"
import { useVesting } from "@/contexts/vesting-context"
import { usePrice } from "@/contexts/price-context"
import { supabase } from "@/lib/supabase-singleton"
import { TrendingUp, DollarSign, Wallet, Clock, Target, ArrowUpRight, ArrowDownRight, Lock, Unlock } from "lucide-react"

interface OverviewStats {
  totalShares: number
  totalValue: number
  preHoldShares: number
  postHoldShares: number
  totalLockedShares: number
  totalClaimableShares: number
  weeklyGrowth: number
  monthlyGrowth: number
}

export function OverviewComponent() {
  const { user } = useAuth()
  const { walletData, loading: walletLoading } = useWallet()
  const { getTotalVestingInProgress, getTotalClaimableShares } = useVesting()
  const { currentPrice, weeklyGrowth, loading: priceLoading } = usePrice()

  const [stats, setStats] = useState<OverviewStats>({
    totalShares: 0,
    totalValue: 0,
    preHoldShares: 0,
    postHoldShares: 0,
    totalLockedShares: 0,
    totalClaimableShares: 0,
    weeklyGrowth: 0,
    monthlyGrowth: 0,
  })
  const [loading, setLoading] = useState(true)

  // Calculate overview statistics
  useEffect(() => {
    if (!walletData || walletLoading || priceLoading) return

    const calculateStats = async () => {
      try {
        setLoading(true)

        // Get vesting data from pivot_vesting table
        let totalLockedShares = 0
        let totalClaimableShares = 0

        if (user) {
          const { data: vestingData, error } = await supabase
            .from("pivot_vesting")
            .select("amount, status")
            .eq("user_uuid", user.id)

          if (!error && vestingData) {
            totalLockedShares = vestingData
              .filter((slot) => slot.status === "locked")
              .reduce((sum, slot) => sum + Number(slot.amount || 0), 0)

            totalClaimableShares = vestingData
              .filter((slot) => slot.status === "claim")
              .reduce((sum, slot) => sum + Number(slot.amount || 0), 0)
          }
        }

        const preHoldShares = Number(walletData.pre_hold_shares || 0)
        const postHoldShares = Number(walletData.post_hold_shares || 0)
        const totalShares = preHoldShares + postHoldShares + totalLockedShares + totalClaimableShares
        const totalValue = totalShares * currentPrice

        setStats({
          totalShares,
          totalValue,
          preHoldShares,
          postHoldShares,
          totalLockedShares,
          totalClaimableShares,
          weeklyGrowth: weeklyGrowth || 0,
          monthlyGrowth: 0, // We can add this later if needed
        })
      } catch (error) {
        console.error("Error calculating overview stats:", error)
      } finally {
        setLoading(false)
      }
    }

    calculateStats()
  }, [walletData, walletLoading, priceLoading, currentPrice, weeklyGrowth, user])

  if (loading || walletLoading || priceLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-24 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 w-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatShares = (shares: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(shares)
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Portfolio Value */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              {formatShares(stats.totalShares)} shares @ {formatCurrency(currentPrice)}
            </p>
          </CardContent>
        </Card>

        {/* Available Shares */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Shares</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatShares(stats.preHoldShares)}</div>
            <p className="text-xs text-muted-foreground">Ready for trading or vesting</p>
          </CardContent>
        </Card>

        {/* Locked Shares */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locked Shares</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatShares(stats.totalLockedShares)}</div>
            <p className="text-xs text-muted-foreground">Currently vesting</p>
          </CardContent>
        </Card>

        {/* Claimable Shares */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Claimable Shares</CardTitle>
            <Unlock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatShares(stats.totalClaimableShares)}</div>
            <p className="text-xs text-muted-foreground">Ready to claim</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Share Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Share Distribution</CardTitle>
            <CardDescription>Breakdown of your share holdings across different categories</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="text-sm">Available (Pre-Hold)</span>
                </div>
                <span className="text-sm font-medium">{formatShares(stats.preHoldShares)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-sm">Matured (Post-Hold)</span>
                </div>
                <span className="text-sm font-medium">{formatShares(stats.postHoldShares)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full" />
                  <span className="text-sm">Locked (Vesting)</span>
                </div>
                <span className="text-sm font-medium">{formatShares(stats.totalLockedShares)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full" />
                  <span className="text-sm">Claimable</span>
                </div>
                <span className="text-sm font-medium">{formatShares(stats.totalClaimableShares)}</span>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between font-medium">
              <span>Total Shares</span>
              <span>{formatShares(stats.totalShares)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Performance & Growth */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
            <CardDescription>Share price performance and portfolio growth</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Current Share Price</span>
                <span className="text-sm font-medium">{formatCurrency(currentPrice)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Weekly Growth</span>
                <div className="flex items-center space-x-1">
                  {stats.weeklyGrowth >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-500" />
                  )}
                  <span
                    className={`text-sm font-medium ${stats.weeklyGrowth >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {stats.weeklyGrowth >= 0 ? "+" : ""}
                    {stats.weeklyGrowth.toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Portfolio Allocation</span>
                <Badge variant="outline">Diversified</Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Liquid Assets</span>
                <span>{(((stats.preHoldShares + stats.postHoldShares) / stats.totalShares) * 100).toFixed(1)}%</span>
              </div>
              <Progress
                value={((stats.preHoldShares + stats.postHoldShares) / stats.totalShares) * 100}
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Vesting Assets</span>
                <span>
                  {(((stats.totalLockedShares + stats.totalClaimableShares) / stats.totalShares) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress
                value={((stats.totalLockedShares + stats.totalClaimableShares) / stats.totalShares) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common actions you can take with your portfolio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="justify-start bg-transparent" asChild>
              <a href="/dashboard/exchange">
                <TrendingUp className="mr-2 h-4 w-4" />
                Trade Shares
              </a>
            </Button>

            <Button variant="outline" className="justify-start bg-transparent" asChild>
              <a href="/dashboard/vesting">
                <Clock className="mr-2 h-4 w-4" />
                Vest Shares
              </a>
            </Button>

            <Button variant="outline" className="justify-start bg-transparent" asChild>
              <a href="/dashboard/transactions">
                <Target className="mr-2 h-4 w-4" />
                View History
              </a>
            </Button>

            <Button variant="outline" className="justify-start bg-transparent" asChild>
              <a href="/dashboard/referrals">
                <DollarSign className="mr-2 h-4 w-4" />
                Referrals
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
