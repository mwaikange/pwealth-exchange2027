"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, Clock, Gift, Lock, Unlock, TrendingUp } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"
import { VestingPageSkeleton } from "@/components/skeletons/vesting-page-skeleton"

interface VestingData {
  id: string
  user_uuid: string
  level: number
  slot_number: number
  shares_amount: number
  vest_date: string
  status: "locked" | "available" | "claimed"
  created_at: string
  claimed_at?: string
}

interface VestingStats {
  totalShares: number
  availableShares: number
  claimedShares: number
  lockedShares: number
  nextVestDate: string | null
  currentLevel: number
}

export default function VestingPage() {
  const [vestingData, setVestingData] = useState<VestingData[]>([])
  const [vestingStats, setVestingStats] = useState<VestingStats>({
    totalShares: 0,
    availableShares: 0,
    claimedShares: 0,
    lockedShares: 0,
    nextVestDate: null,
    currentLevel: 1,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const { user } = useAuth()

  const fetchVestingData = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Fetching vesting data...")

      // Try to call the vest_shares function to get vesting data
      const { data: vestingResult, error: vestingError } = await supabase.rpc("get_user_vesting_data", {
        p_user_uuid: user.id,
      })

      if (vestingError) {
        console.error("Error calling get_user_vesting_data:", vestingError)

        // Fallback: try to fetch from a vesting table directly
        const { data: directData, error: directError } = await supabase
          .from("user_vesting")
          .select("*")
          .eq("user_uuid", user.id)
          .order("created_at", { ascending: false })

        if (directError) {
          console.error("Error fetching from user_vesting:", directError)
          throw new Error("Unable to fetch vesting data. Please contact support.")
        }

        const formattedData = (directData || []).map((item: any) => ({
          id: item.id,
          user_uuid: item.user_uuid,
          level: item.level || 1,
          slot_number: item.slot_number || 1,
          shares_amount: Number(item.shares_amount) || 0,
          vest_date: item.vest_date,
          status: item.status || "locked",
          created_at: item.created_at,
          claimed_at: item.claimed_at,
        }))

        setVestingData(formattedData)
      } else {
        setVestingData(vestingResult || [])
      }

      // Calculate stats from the data
      const data = vestingResult || []
      const totalShares = data.reduce((sum: number, item: any) => sum + Number(item.shares_amount || 0), 0)
      const availableShares = data
        .filter((item: any) => item.status === "available")
        .reduce((sum: number, item: any) => sum + Number(item.shares_amount || 0), 0)
      const claimedShares = data
        .filter((item: any) => item.status === "claimed")
        .reduce((sum: number, item: any) => sum + Number(item.shares_amount || 0), 0)
      const lockedShares = data
        .filter((item: any) => item.status === "locked")
        .reduce((sum: number, item: any) => sum + Number(item.shares_amount || 0), 0)

      // Find next vest date
      const lockedItems = data.filter((item: any) => item.status === "locked")
      const nextVestDate = lockedItems.length > 0 ? lockedItems[0].vest_date : null

      // Determine current level
      const maxLevel = Math.max(...data.map((item: any) => item.level || 1), 1)

      setVestingStats({
        totalShares,
        availableShares,
        claimedShares,
        lockedShares,
        nextVestDate,
        currentLevel: maxLevel,
      })

      console.log("✅ Vesting data loaded:", data.length, "items")
    } catch (err: any) {
      console.error("❌ Error fetching vesting data:", err)
      setError(err.message || "Failed to load vesting data")
    } finally {
      setLoading(false)
    }
  }

  const handleClaimShares = async (vestingId: string) => {
    if (!user || isProcessing) return

    try {
      setIsProcessing(true)

      console.log("🔄 Claiming shares for vesting ID:", vestingId)

      const { data, error } = await supabase.rpc("claim_vested_shares", {
        p_user_uuid: user.id,
        p_vesting_id: vestingId,
      })

      if (error) {
        console.error("Error claiming shares:", error)
        throw new Error(error.message || "Failed to claim shares")
      }

      if (data?.success) {
        console.log("✅ Shares claimed successfully")
        await fetchVestingData() // Refresh data
      } else {
        throw new Error(data?.message || "Failed to claim shares")
      }
    } catch (err: any) {
      console.error("❌ Error claiming shares:", err)
      setError(err.message || "Failed to claim shares")
    } finally {
      setIsProcessing(false)
    }
  }

  useEffect(() => {
    fetchVestingData()
  }, [user])

  const formatShares = (shares: number) => Number(shares).toFixed(4)
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      locked: "bg-red-500 text-white",
      available: "bg-green-500 text-white",
      claimed: "bg-blue-500 text-white",
    }
    return <Badge className={variants[status as keyof typeof variants] || "bg-gray-500"}>{status.toUpperCase()}</Badge>
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "locked":
        return <Lock className="h-4 w-4 text-red-400" />
      case "available":
        return <Unlock className="h-4 w-4 text-green-400" />
      case "claimed":
        return <Gift className="h-4 w-4 text-blue-400" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  if (loading) {
    return <VestingPageSkeleton />
  }

  if (error) {
    return (
      <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error loading vesting data: {error}</AlertDescription>
        </Alert>
        <Button onClick={fetchVestingData} className="mt-4">
          Retry Loading
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Vesting Schedule</h1>
          <p className="text-gray-400 mt-1">Manage your vested shares and unlock rewards</p>
        </div>
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-blue-400" />
          <Badge variant="outline" className="text-lg px-4 py-2 border-blue-400 text-blue-400">
            Level {vestingStats.currentLevel}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Shares</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatShares(vestingStats.totalShares)}</div>
            <p className="text-xs text-slate-400 mt-1">All vesting positions</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Available to Claim</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{formatShares(vestingStats.availableShares)}</div>
            <p className="text-xs text-slate-400 mt-1">Ready to claim</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Already Claimed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{formatShares(vestingStats.claimedShares)}</div>
            <p className="text-xs text-slate-400 mt-1">Successfully claimed</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Still Locked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{formatShares(vestingStats.lockedShares)}</div>
            <p className="text-xs text-slate-400 mt-1">
              {vestingStats.nextVestDate ? `Next: ${formatDate(vestingStats.nextVestDate)}` : "No upcoming vests"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Vesting Progress</CardTitle>
          <CardDescription>Your overall vesting completion</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300">Claimed</span>
              <span className="text-slate-300">
                {formatShares(vestingStats.claimedShares)} / {formatShares(vestingStats.totalShares)} shares
              </span>
            </div>
            <Progress
              value={vestingStats.totalShares > 0 ? (vestingStats.claimedShares / vestingStats.totalShares) * 100 : 0}
              className="h-3"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>
                {vestingStats.totalShares > 0
                  ? ((vestingStats.claimedShares / vestingStats.totalShares) * 100).toFixed(1)
                  : 0}
                % Complete
              </span>
              <span>{vestingData.filter((item) => item.status === "available").length} positions ready to claim</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vesting Positions */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Vesting Positions</CardTitle>
          <CardDescription>Individual vesting schedule breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          {vestingData.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-400">No vesting positions found</p>
              <p className="text-slate-500 text-sm mt-2">
                Vesting positions will appear here once you have shares to vest
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {vestingData.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-slate-700 border border-slate-600 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(item.status)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-white">
                          Level {item.level} - Slot {item.slot_number}
                        </span>
                        {getStatusBadge(item.status)}
                      </div>
                      <div className="text-sm text-slate-400 mt-1">{formatShares(item.shares_amount)} shares</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {item.status === "claimed" && item.claimed_at
                          ? `Claimed on ${formatDate(item.claimed_at)}`
                          : `Vest date: ${formatDate(item.vest_date)}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {item.status === "available" && (
                      <Button
                        onClick={() => handleClaimShares(item.id)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={isProcessing}
                      >
                        {isProcessing ? "Processing..." : "Claim Shares"}
                      </Button>
                    )}
                    {item.status === "locked" && (
                      <div className="text-xs text-slate-400">Available {formatDate(item.vest_date)}</div>
                    )}
                    {item.status === "claimed" && <div className="text-xs text-blue-400 font-medium">✓ Claimed</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">How Vesting Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-slate-300">
            <p>
              • <strong>Vesting Schedule:</strong> Your shares are locked for a specific period based on your level
            </p>
            <p>
              • <strong>Claim Process:</strong> Once the vesting period is complete, you can claim your shares
            </p>
            <p>
              • <strong>Level Progression:</strong> Higher levels offer better benefits and longer vesting periods
            </p>
            <p>
              • <strong>Status Tracking:</strong> Monitor your progress with real-time status updates
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
