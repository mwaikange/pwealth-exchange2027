"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { DollarSign, TrendingUp, Wallet, Clock, Users, Gift, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { useWallet } from "@/contexts/wallet-context"
import { usePrice } from "@/contexts/price-context"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"
import { OverviewSkeleton } from "@/components/skeletons/overview-skeleton"

// Helper function to safely convert to number
const safeNumber = (value: any): number => {
  const num = Number(value)
  return isNaN(num) ? 0 : num
}

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return `N$${amount.toFixed(2)}`
}

// Helper function to format shares
const formatShares = (shares: number): string => {
  return shares.toFixed(4)
}

export default function OverviewComponent() {
  const { user } = useAuth()
  const {
    buyWalletBalance,
    holdWalletPreHold,
    holdWalletPostHold,
    cashoutWalletBalance,
    loading: walletLoading,
    error: walletError,
    refreshWalletBalances,
  } = useWallet()

  const { priceData, loading: priceLoading, error: priceError } = usePrice()

  // Local state for vesting data
  const [vestingSlots, setVestingSlots] = useState([])
  const [vestingLoading, setVestingLoading] = useState(true)
  const [vestingError, setVestingError] = useState(null)

  // Fetch vesting data
  useEffect(() => {
    const fetchVestingData = async () => {
      if (!user) return

      try {
        setVestingLoading(true)
        const { data, error } = await supabase
          .from("pivot_vesting")
          .select("*")
          .eq("user_uuid", user.id)
          .order("slot_number", { ascending: true })

        if (error) throw error

        setVestingSlots(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error("Error fetching vesting data:", err)
        setVestingError(err.message)
        setVestingSlots([])
      } finally {
        setVestingLoading(false)
      }
    }

    fetchVestingData()
  }, [user])

  // Calculate values using dynamic share price
  const sharePrice = safeNumber(priceData.currentPrice)
  const totalCash = safeNumber(buyWalletBalance) + safeNumber(cashoutWalletBalance)
  const totalShares = safeNumber(holdWalletPreHold) + safeNumber(holdWalletPostHold)
  const portfolioValue = totalShares * sharePrice

  // Calculate vesting totals
  const vestingSlotsArray = Array.isArray(vestingSlots) ? vestingSlots : []
  const totalVestingShares = vestingSlotsArray.reduce((sum, slot) => sum + safeNumber(slot.shares), 0)
  const totalVestingValue = totalVestingShares * sharePrice
  const lockedShares = vestingSlotsArray
    .filter((slot) => slot.status === "locked")
    .reduce((sum, slot) => sum + safeNumber(slot.shares), 0)
  const claimableShares = vestingSlotsArray
    .filter((slot) => slot.status === "claimable")
    .reduce((sum, slot) => sum + safeNumber(slot.shares), 0)
  const claimedShares = vestingSlotsArray
    .filter((slot) => slot.status === "claimed")
    .reduce((sum, slot) => sum + safeNumber(slot.shares), 0)

  // Calculate wallet distribution percentages
  const totalAccountValue = totalCash + portfolioValue + totalVestingValue
  const buyWalletPercentage = totalAccountValue > 0 ? (safeNumber(buyWalletBalance) / totalAccountValue) * 100 : 0
  const holdPrePercentage =
    totalAccountValue > 0 ? ((safeNumber(holdWalletPreHold) * sharePrice) / totalAccountValue) * 100 : 0
  const holdPostPercentage =
    totalAccountValue > 0 ? ((safeNumber(holdWalletPostHold) * sharePrice) / totalAccountValue) * 100 : 0
  const cashoutPercentage = totalAccountValue > 0 ? (safeNumber(cashoutWalletBalance) / totalAccountValue) * 100 : 0
  const vestingPercentage = totalAccountValue > 0 ? (totalVestingValue / totalAccountValue) * 100 : 0

  const loading = walletLoading || priceLoading || vestingLoading

  if (loading) {
    return <OverviewSkeleton />
  }

  if (walletError || priceError) {
    return (
      <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <h3 className="text-red-400 font-semibold mb-2">Error Loading Data</h3>
          <p className="text-red-300 text-sm">{walletError || priceError || "Failed to load overview data"}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Portfolio Overview</h1>
          <p className="text-slate-400 mt-1">Track your investments and wallet balances</p>
        </div>
        <Button
          onClick={refreshWalletBalances}
          variant="outline"
          size="sm"
          className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
        >
          Refresh Data
        </Button>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Cash */}
        <Card className="bg-slate-800 border-slate-700 text-slate-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Cash</CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{formatCurrency(totalCash)}</div>
            <p className="text-xs text-slate-400 mt-1">
              Buy: {formatCurrency(safeNumber(buyWalletBalance))} + Cashout:{" "}
              {formatCurrency(safeNumber(cashoutWalletBalance))}
            </p>
          </CardContent>
        </Card>

        {/* Portfolio Value */}
        <Card className="bg-slate-800 border-slate-700 text-slate-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Portfolio Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{formatCurrency(portfolioValue)}</div>
            <p className="text-xs text-slate-400 mt-1">
              {formatShares(totalShares)} shares @ {formatCurrency(sharePrice)}
            </p>
          </CardContent>
        </Card>

        {/* Share Price */}
        <Card className="bg-slate-800 border-slate-700 text-slate-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Share Price</CardTitle>
            <Wallet className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{formatCurrency(sharePrice)}</div>
            <p className="text-xs text-slate-400 mt-1">per share</p>
          </CardContent>
        </Card>

        {/* Total Vesting */}
        <Card className="bg-slate-800 border-slate-700 text-slate-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Vesting</CardTitle>
            <Clock className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{formatCurrency(totalVestingValue)}</div>
            <p className="text-xs text-slate-400 mt-1">{formatShares(totalVestingShares)} shares vesting</p>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Distribution */}
      <Card className="bg-slate-800 border-slate-700 text-slate-100">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-200">Wallet Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Buy Wallet */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-300">Buy Wallet</span>
              <span className="text-sm text-slate-400">
                {formatCurrency(safeNumber(buyWalletBalance))} ({buyWalletPercentage.toFixed(1)}%)
              </span>
            </div>
            <Progress value={buyWalletPercentage} className="h-2 [&>div]:bg-green-500" />
          </div>

          {/* Hold Wallet (Pre-Hold) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-300">Hold Wallet (Pre-Hold)</span>
              <span className="text-sm text-slate-400">
                {formatShares(safeNumber(holdWalletPreHold))} shares ={" "}
                {formatCurrency(safeNumber(holdWalletPreHold) * sharePrice)} ({holdPrePercentage.toFixed(1)}%)
              </span>
            </div>
            <Progress value={holdPrePercentage} className="h-2 [&>div]:bg-blue-500" />
          </div>

          {/* Hold Wallet (Post-Hold) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-300">Hold Wallet (Post-Hold)</span>
              <span className="text-sm text-slate-400">
                {formatShares(safeNumber(holdWalletPostHold))} shares ={" "}
                {formatCurrency(safeNumber(holdWalletPostHold) * sharePrice)} ({holdPostPercentage.toFixed(1)}%)
              </span>
            </div>
            <Progress value={holdPostPercentage} className="h-2 [&>div]:bg-orange-500" />
          </div>

          {/* Cashout Wallet */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-300">Cashout Wallet</span>
              <span className="text-sm text-slate-400">
                {formatCurrency(safeNumber(cashoutWalletBalance))} ({cashoutPercentage.toFixed(1)}%)
              </span>
            </div>
            <Progress value={cashoutPercentage} className="h-2 [&>div]:bg-purple-500" />
          </div>

          {/* Vesting */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-300">Vesting</span>
              <span className="text-sm text-slate-400">
                {formatShares(totalVestingShares)} shares = {formatCurrency(totalVestingValue)} (
                {vestingPercentage.toFixed(1)}%)
              </span>
            </div>
            <Progress value={vestingPercentage} className="h-2 [&>div]:bg-pink-500" />
          </div>
        </CardContent>
      </Card>

      {/* Vesting Overview */}
      <Card className="bg-slate-800 border-slate-700 text-slate-100">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-200">Vesting Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {vestingError ? (
            <div className="text-center py-4">
              <p className="text-red-400 text-sm">⚠️ Error loading vesting data: {vestingError}</p>
            </div>
          ) : vestingSlotsArray.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-slate-400 text-sm">No vesting slots found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Locked Shares */}
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-300">Locked</span>
                  <Clock className="h-4 w-4 text-red-400" />
                </div>
                <div className="text-xl font-bold text-slate-100">{formatShares(lockedShares)}</div>
                <p className="text-xs text-slate-400">shares locked</p>
              </div>

              {/* Claimable Shares */}
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-300">Claimable</span>
                  <Gift className="h-4 w-4 text-green-400" />
                </div>
                <div className="text-xl font-bold text-slate-100">{formatShares(claimableShares)}</div>
                <p className="text-xs text-slate-400">shares ready to claim</p>
              </div>

              {/* Claimed Shares */}
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-300">Claimed</span>
                  <Users className="h-4 w-4 text-blue-400" />
                </div>
                <div className="text-xl font-bold text-slate-100">{formatShares(claimedShares)}</div>
                <p className="text-xs text-slate-400">shares claimed</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-slate-800 border-slate-700 text-slate-100">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-200">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Buy Shares */}
            <div className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className="bg-green-500 rounded-full p-2">
                  <ArrowUpRight className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-100">Buy Shares</h3>
                  <p className="text-xs text-slate-400">Purchase shares on the exchange</p>
                </div>
              </div>
            </div>

            {/* Sell Shares */}
            <div className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className="bg-red-500 rounded-full p-2">
                  <ArrowDownRight className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-100">Sell Shares</h3>
                  <p className="text-xs text-slate-400">Sell shares on the exchange</p>
                </div>
              </div>
            </div>

            {/* Claim Vesting */}
            <div className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-500 rounded-full p-2">
                  <Gift className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-100">Claim Vesting</h3>
                  <p className="text-xs text-slate-400">Claim available vested shares</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
