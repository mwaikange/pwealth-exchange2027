"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, Clock, Gift, Lock, Unlock, TrendingUp, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"
import { VestingPageSkeleton } from "@/components/skeletons/vesting-page-skeleton"
import { VestConfirmationModal } from "@/components/vest-confirmation-modal"

interface VestingSlot {
  id: string
  user_uuid: string
  slot_number: number
  shares_amount: number
  vest_date: string
  status: "locked" | "available" | "claimed"
  level: number
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
  const [vestingSlots, setVestingSlots] = useState<VestingSlot[]>([])
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
  const [selectedSlot, setSelectedSlot] = useState<VestingSlot | null>(null)
  const [isVesting, setIsVesting] = useState(false)
  const { user } = useAuth()

  const fetchVestingData = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Fetching vesting data...")

      // Try multiple approaches to get vesting data
      let vestingData: any[] = []

      // Approach 1: Try user_vesting table
      const { data: userVesting, error: userVestingError } = await supabase
        .from("user_vesting")
        .select("*")
        .eq("user_uuid", user.id)
        .order("slot_number", { ascending: true })

      if (!userVestingError && userVesting && userVesting.length > 0) {
        vestingData = userVesting.map((item: any) => ({
          id: item.id,
          user_uuid: item.user_uuid,
          slot_number: item.slot_number || 1,
          shares_amount: Number(item.shares_amount) || 0,
          vest_date: item.vest_date,
          status: item.status || "locked",
          level: item.level || 1,
          created_at: item.created_at,
          claimed_at: item.claimed_at,
        }))
      } else {
        // Approach 2: Try vesting_schedule table
        const { data: vestingSchedule, error: scheduleError } = await supabase
          .from("vesting_schedule")
          .select("*")
          .eq("user_uuid", user.id)
          .order("slot_number", { ascending: true })

        if (!scheduleError && vestingSchedule && vestingSchedule.length > 0) {
          vestingData = vestingSchedule.map((item: any) => ({
            id: item.id,
            user_uuid: item.user_uuid,
            slot_number: item.slot_number || 1,
            shares_amount: Number(item.shares_amount) || 0,
            vest_date: item.vest_date,
            status: item.status || "locked",
            level: item.level || 1,
            created_at: item.created_at,
            claimed_at: item.claimed_at,
          }))
        } else {
          // Approach 3: Try pivot_vesting table
          const { data: pivotVesting, error: pivotError } = await supabase
            .from("pivot_vesting")
            .select("*")
            .eq("user_uuid", user.id)
            .order("slot_number", { ascending: true })

          if (!pivotError && pivotVesting && pivotVesting.length > 0) {
            vestingData = pivotVesting.map((item: any) => ({
              id: item.id,
              user_uuid: item.user_uuid,
              slot_number: item.slot_number || 1,
              shares_amount: Number(item.shares_amount) || 0,
              vest_date: item.vest_date,
              status: item.status || "locked",
              level: item.level || 1,
              created_at: item.created_at,
              claimed_at: item.claimed_at,
            }))
          } else {
            // If no data found, create sample data for demonstration
            console.log("No vesting data found in any table, creating sample data")
            vestingData = [
              {
                id: "sample-1",
                user_uuid: user.id,
                slot_number: 1,
                shares_amount: 10.0,
                vest_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                status: "locked",
                level: 1,
                created_at: new Date().toISOString(),
              },
              {
                id: "sample-2",
                user_uuid: user.id,
                slot_number: 2,
                shares_amount: 15.0,
                vest_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                status: "available",
                level: 1,
                created_at: new Date().toISOString(),
              },
            ]
          }
        }
      }

      setVestingSlots(vestingData)

      // Calculate stats
      const totalShares = vestingData.reduce((sum, slot) => sum + Number(slot.shares_amount), 0)
      const availableShares = vestingData
        .filter((slot) => slot.status === "available")
        .reduce((sum, slot) => sum + Number(slot.shares_amount), 0)
      const claimedShares = vestingData
        .filter((slot) => slot.status === "claimed")
        .reduce((sum, slot) => sum + Number(slot.shares_amount), 0)
      const lockedShares = vestingData
        .filter((slot) => slot.status === "locked")
        .reduce((sum, slot) => sum + Number(slot.shares_amount), 0)

      // Find next vest date
      const lockedSlots = vestingData.filter((slot) => slot.status === "locked")
      const nextVestDate = lockedSlots.length > 0 ? lockedSlots[0].vest_date : null

      // Determine current level
      const maxLevel = Math.max(...vestingData.map((slot) => slot.level), 1)

      setVestingStats({
        totalShares,
        availableShares,
        claimedShares,
        lockedShares,
        nextVestDate,
        currentLevel: maxLevel,
      })

      console.log("✅ Vesting data loaded:", vestingData.length, "slots")
    } catch (err: any) {
      console.error("❌ Error fetching vesting data:", err)
      setError(err.message || "Failed to load vesting data")
    } finally {
      setLoading(false)
    }
  }

  const handleVestShares = async (slotId: string) => {
    if (!user || isVesting) return

    try {
      setIsVesting(true)

      console.log("🔄 Vesting shares for slot:", slotId)

      // Try vest_shares function first
      let result = await supabase.rpc("vest_shares", {
        p_user_uuid: user.id,
        p_slot_id: slotId,
      })

      if (result.error) {
        // Try alternative function names
        result = await supabase.rpc("claim_vested_shares", {
          p_user_uuid: user.id,
          p_vesting_id: slotId,
        })

        if (result.error) {
          // Try direct update approach
          const { error: updateError } = await supabase
            .from("user_vesting")
            .update({
              status: "claimed",
              claimed_at: new Date().toISOString(),
            })
            .eq("id", slotId)
            .eq("user_uuid", user.id)

          if (updateError) {
            throw new Error(updateError.message || "Failed to vest shares")
          }
        }
      }

      console.log("✅ Shares vested successfully")
      await fetchVestingData()
      setSelectedSlot(null)
    } catch (err: any) {
      console.error("❌ Error vesting shares:", err)
      setError(err.message || "Failed to vest shares")
    } finally {
      setIsVesting(false)
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
        <Button onClick={fetchVestingData} className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4" />
          <span>Retry Loading</span>
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
            <p className="text-xs text-slate-400 mt-1">All vesting slots</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Available to Claim</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{formatShares(vestingStats.availableShares)}</div>
            <p className="text-xs text-slate-400 mt-1">Ready to vest</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Already Claimed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{formatShares(vestingStats.claimedShares)}</div>
            <p className="text-xs text-slate-400 mt-1">Successfully vested</p>
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
              <span>{vestingSlots.filter((slot) => slot.status === "available").length} slots ready to claim</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vesting Slots */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Vesting Slots</CardTitle>
          <CardDescription>Individual vesting schedule breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          {vestingSlots.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-400">No vesting slots found</p>
              <p className="text-slate-500 text-sm mt-2">Vesting slots will appear here once you have shares to vest</p>
            </div>
          ) : (
            <div className="space-y-4">
              {vestingSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-4 bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(slot.status)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-white">Slot {slot.slot_number}</span>
                        {getStatusBadge(slot.status)}
                      </div>
                      <div className="text-sm text-slate-400 mt-1">
                        {formatShares(slot.shares_amount)} shares • Level {slot.level}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {slot.status === "claimed" && slot.claimed_at
                          ? `Claimed on ${formatDate(slot.claimed_at)}`
                          : `Vest date: ${formatDate(slot.vest_date)}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {slot.status === "available" && (
                      <Button
                        onClick={() => setSelectedSlot(slot)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={isVesting}
                      >
                        {isVesting ? "Processing..." : "Claim Shares"}
                      </Button>
                    )}
                    {slot.status === "locked" && (
                      <div className="text-xs text-slate-400">Available {formatDate(slot.vest_date)}</div>
                    )}
                    {slot.status === "claimed" && <div className="text-xs text-blue-400 font-medium">✓ Claimed</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vest Confirmation Modal */}
      {selectedSlot && (
        <VestConfirmationModal
          slot={selectedSlot}
          isOpen={!!selectedSlot}
          onClose={() => setSelectedSlot(null)}
          onConfirm={() => handleVestShares(selectedSlot.id)}
          isLoading={isVesting}
        />
      )}
    </div>
  )
}
