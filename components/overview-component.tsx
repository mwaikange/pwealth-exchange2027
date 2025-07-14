"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useWallet } from "@/contexts/wallet-context"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase-singleton"
import { Loader2 } from "lucide-react"

export function OverviewComponent() {
  const { user } = useAuth()
  const {
    buyWalletBalance,
    holdWalletPreHold,
    holdWalletPostHold,
    cashoutWalletBalance,
    loading: walletLoading,
  } = useWallet()

  const [totalCashouts, setTotalCashouts] = useState(0)
  const [totalSharesMatched, setTotalSharesMatched] = useState(0)
  const [referralBonus, setReferralBonus] = useState(0)
  const [totalLockedShares, setTotalLockedShares] = useState(0)
  const [currentSharePrice, setCurrentSharePrice] = useState(108.2)
  const [loading, setLoading] = useState(true) // Only true on initial load
  const [isInitialized, setIsInitialized] = useState(false) // Track if we've loaded data once

  // Helper function to format numbers to 4 decimal places max
  const formatShares = (value: number): string => {
    return Number(value)
      .toFixed(4)
      .replace(/\.?0+$/, "")
  }

  // Helper function to format currency
  const formatCurrency = (value: number): string => {
    return `N$${Number(value).toFixed(2)}`
  }

  // Fetch overview data (with silent option for background updates)
  const fetchOverviewData = async (silent = false) => {
    if (!user) return

    try {
      // Only show loading on initial load, not on background refreshes
      if (!isInitialized && !silent) {
        setLoading(true)
      }

      // Fetch total shares matched from matched_orders
      const { data: matchedData } = await supabase
        .from("matched_orders")
        .select("shares_matched")
        .or(`buyer_uuid.eq.${user.id},seller_uuid.eq.${user.id}`)

      const totalMatched = matchedData?.reduce((sum, order) => sum + Number(order.shares_matched), 0) || 0
      setTotalSharesMatched(totalMatched)

      // Fetch referral bonus from share_transactions
      const { data: referralData } = await supabase
        .from("share_transactions")
        .select("amount")
        .eq("user_uuid", user.id)
        .ilike("type", "%referral%")

      const totalReferral = referralData?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0
      setReferralBonus(totalReferral)

      // Calculate total locked shares (pre-hold + post-hold)
      const totalLocked = holdWalletPreHold + holdWalletPostHold
      setTotalLockedShares(totalLocked)

      // Fetch current share price
      const { data: priceData } = await supabase
        .from("current_pricing_info")
        .select("current_price")
        .order("week_start", { ascending: false })
        .limit(1)

      if (priceData && priceData.length > 0) {
        setCurrentSharePrice(Number(priceData[0].current_price))
      }

      setTotalCashouts(cashoutWalletBalance)

      // Mark as initialized after first successful load
      if (!isInitialized) {
        setIsInitialized(true)
      }

      if (!silent) {
        console.log("✅ Overview data refreshed successfully")
      }
    } catch (error) {
      if (!silent) {
        console.error("Error fetching overview data:", error)
      }
    } finally {
      // Only set loading to false if this was the initial load
      if (!isInitialized) {
        setLoading(false)
      }
    }
  }

  // Initial load and background polling setup
  useEffect(() => {
    if (!user) return

    // Initial load (with loading state)
    fetchOverviewData(false)

    // Set up background polling (silent updates)
    const overviewInterval = setInterval(() => {
      fetchOverviewData(true) // Silent background refresh
    }, 30000) // Every 30 seconds

    return () => {
      clearInterval(overviewInterval)
    }
  }, [user, holdWalletPreHold, holdWalletPostHold, cashoutWalletBalance])

  // Show loading only on initial load, not when wallet is loading in background
  if ((loading || walletLoading) && !isInitialized) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                <div className="h-4 bg-gray-600 rounded animate-pulse"></div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-8">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {/* Total Cashouts to Date */}
      <Card className="bg-green-600 border-green-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white">Total Cashouts to Date</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{formatCurrency(totalCashouts)}</div>
          <p className="text-xs text-green-100">NAD</p>
        </CardContent>
      </Card>

      {/* Total Shares Matched */}
      <Card className="bg-blue-600 border-blue-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white">Total Shares Matched</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{formatShares(totalSharesMatched)}</div>
          <p className="text-xs text-blue-100">shares</p>
        </CardContent>
      </Card>

      {/* Referral Bonus */}
      <Card className="bg-yellow-600 border-yellow-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white">Referral Bonus</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{formatShares(referralBonus)}</div>
          <p className="text-xs text-yellow-100">shares</p>
        </CardContent>
      </Card>

      {/* Total Locked Shares */}
      <Card className="bg-purple-600 border-purple-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white">Total Locked Shares</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{formatShares(totalLockedShares)}</div>
          <p className="text-xs text-purple-100">shares</p>
        </CardContent>
      </Card>

      {/* Share Price */}
      <Card className="bg-gray-600 border-gray-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white">Share Price</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{formatCurrency(currentSharePrice)}</div>
          <p className="text-xs text-gray-100">per share</p>
        </CardContent>
      </Card>
    </div>
  )
}
