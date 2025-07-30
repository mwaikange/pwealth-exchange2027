"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useWallet } from "@/contexts/wallet-context"
import { usePrice } from "@/contexts/price-context"
import { useVesting } from "@/contexts/vesting-context"
import { useRouter } from "next/navigation"
import { TrendingUp, DollarSign, PieChart, ArrowDownRight, Wallet, Gift, Target, Clock } from "lucide-react"
import { OverviewSkeleton } from "@/components/skeletons/overview-skeleton"

// Helper functions - FIXED: Always 4 decimal places for shares
const formatCurrency = (value: number): string => {
  return `N$${Number(value).toFixed(2)}`
}

const formatShares = (value: number): string => {
  return Number(value).toFixed(4) // Always 4 decimal places
}

// Wave SVG Component for card backgrounds
const WaveBackground = ({ className = "" }: { className?: string }) => (
  <svg
    className={`absolute inset-0 w-full h-full object-cover ${className}`}
    viewBox="0 0 200 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M0 40C20 20, 40 60, 60 40C80 20, 100 60, 120 40C140 20, 160 60, 180 40C190 35, 200 45, 200 40V120H0V40Z"
      fill="currentColor"
      opacity="0.1"
    />
    <path
      d="M0 60C25 45, 50 75, 75 60C100 45, 125 75, 150 60C175 45, 200 75, 200 60V120H0V60Z"
      fill="currentColor"
      opacity="0.05"
    />
  </svg>
)

export function OverviewComponent() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  const {
    buyWalletBalance = 0,
    holdWalletPreHold = 0,
    holdWalletPostHold = 0,
    cashoutWalletBalance = 0,
    loading: walletLoading,
    error: walletError,
  } = useWallet() || {}

  const { currentSharePrice = 99.68, loading: priceLoading, error: priceError } = usePrice() || {}

  const {
    vestingSlots = [],
    totalLockedShares = 0,
    totalClaimableShares = 0,
    totalClaimedShares = 0,
    loading: vestingLoading,
    error: vestingError,
  } = useVesting() || {}

  // Calculate totals - FIXED: Total Cash Balance = Buy Wallet + Cashout Wallet
  const totalCashBalance = buyWalletBalance + cashoutWalletBalance
  const totalShares = holdWalletPreHold + holdWalletPostHold
  const totalShareValue = totalShares * currentSharePrice
  const totalPortfolioValue = totalCashBalance + totalShareValue

  // Loading state
  useEffect(() => {
    if (!walletLoading && !priceLoading && !vestingLoading) {
      setIsLoading(false)
    }
  }, [walletLoading, priceLoading, vestingLoading])

  if (isLoading) {
    return <OverviewSkeleton />
  }

  if (walletError || priceError || vestingError) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-red-500">Error loading data: {walletError || priceError || vestingError}</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Top 4 Cards with Enhanced Styling - MATCHING EXISTING CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Cash Balance - Green with Wave Background */}
        <Card className="bg-gradient-to-tl from-green-600 to-green-400 text-white border-0 relative overflow-hidden rounded-xl shadow-lg">
          <WaveBackground className="text-white" />
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-sm font-medium flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Total Cash Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{formatCurrency(totalCashBalance)}</div>
            <p className="text-xs opacity-80 mt-1">Buy + Cashout Wallets</p>
          </CardContent>
        </Card>

        {/* Share Value - Blue with Wave Background */}
        <Card className="bg-gradient-to-tl from-blue-600 to-blue-400 text-white border-0 relative overflow-hidden rounded-xl shadow-lg">
          <WaveBackground className="text-white" />
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Share Value
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{formatCurrency(totalShareValue)}</div>
            <p className="text-xs opacity-80 mt-1">
              {formatShares(totalShares)} shares @ {formatCurrency(currentSharePrice)}
            </p>
          </CardContent>
        </Card>

        {/* Share Price - Yellow/Orange with Wave Background */}
        <Card className="bg-gradient-to-tl from-orange-500 to-yellow-400 text-white border-0 relative overflow-hidden rounded-xl shadow-lg">
          <WaveBackground className="text-white" />
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-sm font-medium flex items-center">
              <PieChart className="h-4 w-4 mr-2" />
              Share Price
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{formatCurrency(currentSharePrice)}</div>
            <p className="text-xs opacity-80 mt-1">per share</p>
          </CardContent>
        </Card>

        {/* Total Portfolio - Purple with Wave Background */}
        <Card className="bg-gradient-to-tl from-purple-700 to-purple-500 text-white border-0 relative overflow-hidden rounded-xl shadow-lg">
          <WaveBackground className="text-white" />
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-sm font-medium flex items-center">
              <Wallet className="h-4 w-4 mr-2" />
              Total Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{formatCurrency(totalPortfolioValue)}</div>
            <p className="text-xs opacity-80 mt-1">Cash + Share Value</p>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Distribution */}
      <Card className="bg-slate-800 border-slate-700 text-slate-100">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-200">Wallet Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Buy Wallet */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Buy Wallet</span>
                <span className="text-sm text-slate-400">
                  {totalCashBalance > 0 ? ((buyWalletBalance / totalCashBalance) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="text-lg font-semibold">{formatCurrency(buyWalletBalance)}</div>
              <Progress
                value={totalCashBalance > 0 ? (buyWalletBalance / totalCashBalance) * 100 : 0}
                className="h-2 [&>div]:bg-blue-500"
              />
            </div>

            {/* Pre-Hold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Pre-Hold</span>
                <span className="text-sm text-slate-400">
                  {totalShares > 0 ? ((holdWalletPreHold / totalShares) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="text-lg font-semibold">{formatShares(holdWalletPreHold)} shares</div>
              <Progress
                value={totalShares > 0 ? (holdWalletPreHold / totalShares) * 100 : 0}
                className="h-2 [&>div]:bg-orange-500"
              />
            </div>

            {/* Post-Hold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Post-Hold</span>
                <span className="text-sm text-slate-400">
                  {totalShares > 0 ? ((holdWalletPostHold / totalShares) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="text-lg font-semibold">{formatShares(holdWalletPostHold)} shares</div>
              <Progress
                value={totalShares > 0 ? (holdWalletPostHold / totalShares) * 100 : 0}
                className="h-2 [&>div]:bg-green-500"
              />
            </div>

            {/* Cashout */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Cashout</span>
                <span className="text-sm text-slate-400">
                  {totalCashBalance > 0 ? ((cashoutWalletBalance / totalCashBalance) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="text-lg font-semibold">{formatCurrency(cashoutWalletBalance)}</div>
              <Progress
                value={totalCashBalance > 0 ? (cashoutWalletBalance / totalCashBalance) * 100 : 0}
                className="h-2 [&>div]:bg-purple-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vesting Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Locked Shares */}
        <Card className="bg-slate-800 border-slate-700 text-slate-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center text-slate-300">
              <Clock className="h-4 w-4 mr-2 text-orange-400" />
              Locked Shares
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">{formatShares(totalLockedShares)}</div>
            <p className="text-xs text-slate-400 mt-1">Currently vesting</p>
          </CardContent>
        </Card>

        {/* Claimable Shares */}
        <Card className="bg-slate-800 border-slate-700 text-slate-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center text-slate-300">
              <Gift className="h-4 w-4 mr-2 text-green-400" />
              Claimable Shares
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{formatShares(totalClaimableShares)}</div>
            <p className="text-xs text-slate-400 mt-1">Ready to claim</p>
          </CardContent>
        </Card>

        {/* Claimed Shares */}
        <Card className="bg-slate-800 border-slate-700 text-slate-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center text-slate-300">
              <Target className="h-4 w-4 mr-2 text-slate-400" />
              Claimed Shares
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-400">{formatShares(totalClaimedShares)}</div>
            <p className="text-xs text-slate-400 mt-1">Historical claims</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-slate-800 border-slate-700 text-slate-100">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-200">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Buy Shares - Links to Exchange */}
            <Button
              onClick={() => router.push("/dashboard/exchange")}
              className="h-16 bg-blue-600 hover:bg-blue-700 text-white flex flex-col items-center justify-center space-y-1"
            >
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium">Buy Shares</span>
            </Button>

            {/* Vest Shares - Links to Vesting */}
            <Button
              onClick={() => router.push("/dashboard/vesting")}
              className="h-16 bg-green-600 hover:bg-green-700 text-white flex flex-col items-center justify-center space-y-1"
            >
              <Clock className="h-5 w-5" />
              <span className="text-sm font-medium">Vest Shares</span>
            </Button>

            {/* Cashout - No link for now */}
            <Button
              disabled
              className="h-16 bg-orange-600 hover:bg-orange-700 text-white flex flex-col items-center justify-center space-y-1 opacity-50 cursor-not-allowed"
            >
              <ArrowDownRight className="h-5 w-5" />
              <span className="text-sm font-medium">Cashout</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
