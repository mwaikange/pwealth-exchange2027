"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useWallet } from "@/contexts/wallet-context"
import { useVesting } from "@/contexts/vesting-context"
import { usePrice } from "@/contexts/price-context"
import { supabase } from "@/lib/supabase-singleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { DollarSign, TrendingUp, Lock, Clock, CheckCircle, Wallet, PiggyBank, ArrowUpRight } from "lucide-react"

export default function OverviewComponent() {
  const { user } = useAuth()
  const { cashBalance, holdWalletPreHold, holdWalletPostHold, loading: walletLoading } = useWallet()
  const { getTotalVestingInProgress, getTotalClaimableShares, loading: vestingLoading } = useVesting()
  const { sharePrice, loading: priceLoading } = usePrice()

  // State for total locked shares from pivot_vesting
  const [totalLockedShares, setTotalLockedShares] = useState(0)
  const [loadingLocked, setLoadingLocked] = useState(true)

  // Fetch total locked shares from pivot_vesting table
  useEffect(() => {
    const fetchTotalLockedShares = async () => {
      if (!user) return

      try {
        setLoadingLocked(true)

        // Get shares with status 'locked' and 'claim' from pivot_vesting
        const { data, error } = await supabase
          .from("pivot_vesting")
          .select("amount")
          .eq("user_uuid", user.id)
          .in("status", ["locked", "claim"])

        if (error) {
          console.error("Error fetching locked shares:", error)
          return
        }

        // Sum up all the amounts
        const total = (data || []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
        setTotalLockedShares(total)
      } catch (error) {
        console.error("Error calculating total locked shares:", error)
      } finally {
        setLoadingLocked(false)
      }
    }

    fetchTotalLockedShares()

    // Set up real-time subscription for pivot_vesting changes
    const subscription = supabase
      .channel("pivot_vesting_overview")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pivot_vesting",
          filter: `user_uuid=eq.${user?.id}`,
        },
        () => {
          fetchTotalLockedShares()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user])

  // Calculate derived values
  const totalVesting = getTotalVestingInProgress()
  const totalClaimable = getTotalClaimableShares()
  const totalSharesValue = (holdWalletPreHold + holdWalletPostHold + totalLockedShares) * sharePrice
  const totalPortfolioValue = cashBalance + totalSharesValue

  // Loading state
  if (walletLoading || vestingLoading || priceLoading || loadingLocked) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-slate-600 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-slate-600 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Portfolio Value */}
        <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border-blue-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-blue-200 flex items-center text-sm font-medium">
              <PiggyBank className="w-4 h-4 mr-2" />
              Total Portfolio Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-100">N${totalPortfolioValue.toFixed(2)}</div>
            <p className="text-xs text-blue-300 mt-1">Cash + Shares Value</p>
          </CardContent>
        </Card>

        {/* Cash Balance */}
        <Card className="bg-gradient-to-br from-green-900/50 to-green-800/30 border-green-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-green-200 flex items-center text-sm font-medium">
              <DollarSign className="w-4 h-4 mr-2" />
              Cash Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-100">N${cashBalance.toFixed(2)}</div>
            <p className="text-xs text-green-300 mt-1">Available for trading</p>
          </CardContent>
        </Card>

        {/* Total Shares Value */}
        <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-purple-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-purple-200 flex items-center text-sm font-medium">
              <TrendingUp className="w-4 h-4 mr-2" />
              Total Shares Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-100">N${totalSharesValue.toFixed(2)}</div>
            <p className="text-xs text-purple-300 mt-1">
              {(holdWalletPreHold + holdWalletPostHold + totalLockedShares).toFixed(4)} shares @ N$
              {sharePrice.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        {/* Current Share Price */}
        <Card className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/30 border-yellow-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-yellow-200 flex items-center text-sm font-medium">
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Share Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-100">N${sharePrice.toFixed(2)}</div>
            <p className="text-xs text-yellow-300 mt-1">Current market price</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Share Holdings */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-200 flex items-center">
              <Wallet className="w-5 h-5 mr-2 text-blue-400" />
              Share Holdings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pre-Hold Wallet */}
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-400 rounded-full mr-3"></div>
                <div>
                  <p className="text-slate-200 font-medium">Pre-Hold Wallet</p>
                  <p className="text-xs text-slate-400">Available for vesting</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-slate-200 font-bold">{holdWalletPreHold.toFixed(4)}</p>
                <p className="text-xs text-slate-400">shares</p>
              </div>
            </div>

            {/* Total Locked Shares */}
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-400 rounded-full mr-3"></div>
                <div>
                  <p className="text-slate-200 font-medium">Total Locked Shares</p>
                  <p className="text-xs text-slate-400">Vesting + Ready to claim</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-slate-200 font-bold">{totalLockedShares.toFixed(4)}</p>
                <p className="text-xs text-slate-400">shares</p>
              </div>
            </div>

            {/* Post-Hold Wallet */}
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
                <div>
                  <p className="text-slate-200 font-medium">Post-Hold Wallet</p>
                  <p className="text-xs text-slate-400">Available for trading</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-slate-200 font-bold">{holdWalletPostHold.toFixed(4)}</p>
                <p className="text-xs text-slate-400">shares</p>
              </div>
            </div>

            <Separator className="bg-slate-600" />

            {/* Total Shares */}
            <div className="flex items-center justify-between p-3 bg-slate-600/50 rounded-lg">
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 text-purple-400 mr-3" />
                <div>
                  <p className="text-slate-200 font-bold">Total Shares</p>
                  <p className="text-xs text-slate-400">All wallets combined</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-purple-400 font-bold text-lg">
                  {(holdWalletPreHold + holdWalletPostHold + totalLockedShares).toFixed(4)}
                </p>
                <p className="text-xs text-slate-400">shares</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vesting Status */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-200 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-yellow-400" />
              Vesting Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Currently Vesting */}
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center">
                <Lock className="w-4 h-4 text-yellow-400 mr-3" />
                <div>
                  <p className="text-slate-200 font-medium">Currently Vesting</p>
                  <p className="text-xs text-slate-400">Locked in vesting slots</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-yellow-400 font-bold">{totalVesting.toFixed(4)}</p>
                <p className="text-xs text-slate-400">shares</p>
              </div>
            </div>

            {/* Ready to Claim */}
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-400 mr-3" />
                <div>
                  <p className="text-slate-200 font-medium">Ready to Claim</p>
                  <p className="text-xs text-slate-400">Vesting completed</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-green-400 font-bold">{totalClaimable.toFixed(4)}</p>
                <p className="text-xs text-slate-400">shares</p>
              </div>
            </div>

            {/* Vesting Progress */}
            <div className="p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-200 font-medium">Vesting Progress</p>
                <Badge variant="outline" className="text-xs">
                  {totalVesting > 0 ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Locked: {totalVesting.toFixed(4)}</span>
                  <span>Claimable: {totalClaimable.toFixed(4)}</span>
                </div>
                <div className="w-full bg-slate-600 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-yellow-400 to-green-400 h-2 rounded-full transition-all duration-300"
                    style={{
                      width:
                        totalVesting + totalClaimable > 0
                          ? `${(totalClaimable / (totalVesting + totalClaimable)) * 100}%`
                          : "0%",
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button className="p-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/30 rounded-lg text-blue-400 text-xs font-medium transition-colors">
                View Vesting
              </button>
              <button className="p-2 bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 rounded-lg text-green-400 text-xs font-medium transition-colors">
                Claim Ready
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Summary */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-200 flex items-center">
            <PiggyBank className="w-5 h-5 mr-2 text-blue-400" />
            Portfolio Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Asset Allocation */}
            <div>
              <h4 className="text-slate-300 font-medium mb-3">Asset Allocation</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Cash</span>
                  <span className="text-green-400">
                    {totalPortfolioValue > 0 ? ((cashBalance / totalPortfolioValue) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Shares</span>
                  <span className="text-blue-400">
                    {totalPortfolioValue > 0 ? ((totalSharesValue / totalPortfolioValue) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Share Distribution */}
            <div>
              <h4 className="text-slate-300 font-medium mb-3">Share Distribution</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Available</span>
                  <span className="text-blue-400">{holdWalletPreHold.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Locked</span>
                  <span className="text-yellow-400">{totalLockedShares.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Tradeable</span>
                  <span className="text-green-400">{holdWalletPostHold.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div>
              <h4 className="text-slate-300 font-medium mb-3">Key Metrics</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Share Price</span>
                  <span className="text-yellow-400">N${sharePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total Shares</span>
                  <span className="text-purple-400">
                    {(holdWalletPreHold + holdWalletPostHold + totalLockedShares).toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Portfolio Value</span>
                  <span className="text-blue-400">N${totalPortfolioValue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
