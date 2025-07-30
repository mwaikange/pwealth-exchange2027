"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"

// Vesting slot data structure
type VestingSlot = {
  id: string
  user_uuid: string
  level: number
  slot_number: number
  amount: number
  status: "locked" | "claimable" | "claimed"
  start_time: string | null
  end_time: string | null
  claimed_at: string | null
  created_at: string
  updated_at: string
}

// Level configuration
type LevelConfig = {
  level: number
  name: string
  minShares: number
  maxShares: number
  vestingDays: number
  color: string
  description: string
}

// Context type
type VestingContextType = {
  vestingSlots: VestingSlot[]
  levelConfigs: LevelConfig[]
  loading: boolean
  error: string | null
  vestShares: (level: number, slotNumber: number, shares: number) => Promise<{ success: boolean; message: string }>
  claimShares: (level: number, slotNumber: number) => Promise<{ success: boolean; message: string }>
  refreshVestingData: () => Promise<void>
  getAvailableSlots: (level: number) => number[]
  getTotalVestedByLevel: (level: number) => number
  getTotalClaimableShares: () => number
  getSlotProgress: (slot: VestingSlot) => number
}

// Level configurations
const LEVEL_CONFIGS: LevelConfig[] = [
  {
    level: 1,
    name: "Retail",
    minShares: 1,
    maxShares: 50,
    vestingDays: 5,
    color: "bg-blue-500",
    description: "1-50 shares, 5 days vesting",
  },
  {
    level: 2,
    name: "Small Business",
    minShares: 51,
    maxShares: 500,
    vestingDays: 30,
    color: "bg-green-500",
    description: "51-500 shares, 30 days vesting",
  },
  {
    level: 3,
    name: "Corporate",
    minShares: 501,
    maxShares: 999999,
    vestingDays: 90,
    color: "bg-purple-500",
    description: "501+ shares, 90 days vesting",
  },
]

const VestingContext = createContext<VestingContextType | undefined>(undefined)

export function VestingProvider({ children }: { children: React.ReactNode }) {
  const [vestingSlots, setVestingSlots] = useState<VestingSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  // Fetch vesting data from database
  const fetchVestingData = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from("pivot_vesting")
        .select("*")
        .eq("user_uuid", user.id)
        .order("level", { ascending: true })
        .order("slot_number", { ascending: true })

      if (error) throw error

      setVestingSlots(data || [])
      console.log("Vesting data fetched:", data?.length || 0, "slots")
    } catch (err: any) {
      console.error("Error fetching vesting data:", err)
      setError(err.message || "Failed to fetch vesting data")
      setVestingSlots([])
    }
  }

  // Refresh vesting data
  const refreshVestingData = async () => {
    setLoading(true)
    setError(null)
    await fetchVestingData()
    setLoading(false)
  }

  // Vest shares using CORRECT function name
  const vestShares = async (
    level: number,
    slotNumber: number,
    shares: number,
  ): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: "User not authenticated" }
    }

    try {
      // Call CORRECT function: vest_shares (not vest_shares_in_slot)
      const { data, error } = await supabase.rpc("vest_shares", {
        p_user_uuid: user.id,
        p_level: level,
        p_slot_number: slotNumber,
        p_shares: shares,
      })

      if (error) throw error

      if (data?.success) {
        // Refresh data after successful vesting
        await refreshVestingData()
        return { success: true, message: data.message || "Shares vested successfully" }
      } else {
        return { success: false, message: data?.message || "Failed to vest shares" }
      }
    } catch (err: any) {
      console.error("Error vesting shares:", err)
      return { success: false, message: err.message || "Failed to vest shares" }
    }
  }

  // Claim shares
  const claimShares = async (level: number, slotNumber: number): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: "User not authenticated" }
    }

    try {
      const { data, error } = await supabase.rpc("claim_shares", {
        p_user_uuid: user.id,
        p_level: level,
        p_slot_number: slotNumber,
      })

      if (error) throw error

      if (data?.success) {
        // Refresh data after successful claiming
        await refreshVestingData()
        return { success: true, message: data.message || "Shares claimed successfully" }
      } else {
        return { success: false, message: data?.message || "Failed to claim shares" }
      }
    } catch (err: any) {
      console.error("Error claiming shares:", err)
      return { success: false, message: err.message || "Failed to claim shares" }
    }
  }

  // Get available slots for a level (slots 1-6 that are not occupied)
  const getAvailableSlots = (level: number): number[] => {
    const occupiedSlots = vestingSlots
      .filter((slot) => slot.level === level && slot.status !== "claimed")
      .map((slot) => slot.slot_number)

    const allSlots = [1, 2, 3, 4, 5, 6]
    return allSlots.filter((slotNum) => !occupiedSlots.includes(slotNum))
  }

  // Get total vested shares by level
  const getTotalVestedByLevel = (level: number): number => {
    return vestingSlots
      .filter((slot) => slot.level === level && slot.status !== "claimed")
      .reduce((total, slot) => total + slot.amount, 0)
  }

  // Get total claimable shares across all levels
  const getTotalClaimableShares = (): number => {
    const now = new Date()
    return vestingSlots
      .filter((slot) => {
        if (slot.status !== "locked" || !slot.end_time) return false
        return new Date(slot.end_time) <= now
      })
      .reduce((total, slot) => total + slot.amount, 0)
  }

  // Get vesting progress percentage for a slot
  const getSlotProgress = (slot: VestingSlot): number => {
    if (slot.status === "claimed") return 100
    if (slot.status === "claimable") return 100
    if (!slot.start_time || !slot.end_time) return 0

    const now = new Date()
    const start = new Date(slot.start_time)
    const end = new Date(slot.end_time)

    if (now >= end) return 100
    if (now <= start) return 0

    const totalDuration = end.getTime() - start.getTime()
    const elapsed = now.getTime() - start.getTime()

    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
  }

  // Load data when user changes
  useEffect(() => {
    if (user) {
      refreshVestingData()
    } else {
      setVestingSlots([])
      setLoading(false)
    }
  }, [user])

  // Set up real-time subscription for vesting updates
  useEffect(() => {
    if (!user) return

    const vestingSubscription = supabase
      .channel("pivot_vesting_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pivot_vesting",
          filter: `user_uuid=eq.${user.id}`,
        },
        () => {
          console.log("Vesting data updated")
          fetchVestingData()
        },
      )
      .subscribe()

    return () => {
      vestingSubscription.unsubscribe()
    }
  }, [user])

  const value = {
    vestingSlots,
    levelConfigs: LEVEL_CONFIGS,
    loading,
    error,
    vestShares,
    claimShares,
    refreshVestingData,
    getAvailableSlots,
    getTotalVestedByLevel,
    getTotalClaimableShares,
    getSlotProgress,
  }

  return <VestingContext.Provider value={value}>{children}</VestingContext.Provider>
}

export function useVesting() {
  const context = useContext(VestingContext)
  if (context === undefined) {
    throw new Error("useVesting must be used within a VestingProvider")
  }
  return context
}
