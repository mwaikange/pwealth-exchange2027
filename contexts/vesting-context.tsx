"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"
import { useWallet } from "@/contexts/wallet-context"

// Vesting levels configuration
export const VESTING_LEVELS = {
  1: { name: "Retail", days: 5 },
  2: { name: "Small Business", days: 30 },
  3: { name: "Corporate", days: 90 },
} as const

// Vesting slot interface matching database schema
interface VestingSlot {
  id: string
  user_uuid: string
  level: number | null
  slot_number: number | null
  amount: number
  status: "vest" | "locked" | "claim"
  start_time: string | null
  end_time: string | null
  claimed_at: string | null
  created_at: string
  updated_at: string
}

// Legacy interface for backward compatibility with existing UI
interface LegacyVestingSlot {
  id: string
  status: "empty" | "in_progress" | "claimable"
  startDate?: number
  amount: number
  progress: number
  level: number
}

interface VestingContextType {
  // Legacy methods for existing UI compatibility
  getVestingSlotsForLevel: (level: number) => LegacyVestingSlot[]
  vestShares: (level: number, slotIndex: number, amount: number) => Promise<void>
  claimShares: (level: number, slotIndex: number) => Promise<void>
  getTotalVestingInProgress: () => number
  getTotalClaimableShares: () => number
  validateVestingAmount: (amount: number, level: number) => { valid: boolean; message?: string }
  getHoldPeriodForLevel: (level: number) => number

  // New simplified methods
  getAllVestingSlots: () => VestingSlot[]
  getClaimableSlots: () => VestingSlot[]
  claimSlot: (slotId: string) => Promise<void>
  vestInSlot: (level: number, slotNumber: number, amount: number) => Promise<void>

  // State
  loading: boolean
  error: string | null
}

const VestingContext = createContext<VestingContextType | undefined>(undefined)

export function VestingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { refreshWalletBalances } = useWallet()

  // State
  const [vestingSlots, setVestingSlots] = useState<VestingSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Computed values
  const totalLockedShares = vestingSlots
    .filter((slot) => slot.status === "locked")
    .reduce((sum, slot) => sum + slot.amount, 0)

  const totalClaimableShares = vestingSlots
    .filter((slot) => slot.status === "claim")
    .reduce((sum, slot) => sum + slot.amount, 0)

  const totalClaimedShares = vestingSlots
    .filter((slot) => slot.status === "claim") // This might need adjustment based on actual logic
    .reduce((sum, slot) => sum + slot.amount, 0)

  // Refresh vesting data from database
  const refreshVestingData = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Refreshing vesting data...")

      const { data, error } = await supabase
        .from("pivot_vesting")
        .select("*")
        .eq("user_uuid", user.id)
        .order("level", { ascending: true })
        .order("slot_number", { ascending: true })

      if (error) {
        console.error("Error fetching vesting data:", error)
        throw new Error(`Failed to fetch vesting data: ${error.message}`)
      }

      // Process and set data with safe number conversion
      const processedSlots = (data || []).map((slot) => ({
        ...slot,
        amount: Number(slot.amount) || 0,
        slot_number: Number(slot.slot_number) || 1, // Ensure 1-based indexing
      }))

      setVestingSlots(processedSlots)

      console.log("✅ Vesting data refreshed:", {
        totalSlots: processedSlots.length,
        locked: processedSlots.filter((s) => s.status === "locked").length,
        claimable: processedSlots.filter((s) => s.status === "claim").length,
        claimed: processedSlots.filter((s) => s.status === "claim").length,
      })
    } catch (err: any) {
      console.error("❌ Error refreshing vesting data:", err)
      setError(err.message || "Failed to refresh vesting data")
    } finally {
      setLoading(false)
    }
  }, [user])

  // Get vesting slots for a specific level (creates empty slots if needed)
  const getVestingSlotsForLevel = useCallback(
    (level: number): LegacyVestingSlot[] => {
      if (!user) return []

      const levelSlots: LegacyVestingSlot[] = []

      // Create slots 1-6 for the level (1-based indexing)
      for (let slotNumber = 1; slotNumber <= 6; slotNumber++) {
        // TODO: Implement the logic to convert VestingSlot to LegacyVestingSlot
        // This is a placeholder, replace with actual conversion logic
        levelSlots.push({
          id: "temp",
          status: "empty",
          amount: 0,
          progress: 0,
          level: level,
        })
      }

      return levelSlots
    },
    [user],
  )

  // Vest shares in a specific slot (UI uses 0-based index, converts to 1-based slot_number)
  const vestShares = async (level: number, slotIndex: number, amount: number) => {
    if (!user) throw new Error("User not authenticated")

    try {
      setError(null)

      // Convert 0-based UI index to 1-based slot_number for database
      const slotNumber = slotIndex + 1

      console.log(`📝 Vesting ${amount} shares in Level ${level}, Slot ${slotNumber} (UI index ${slotIndex})`)

      const { data, error } = await supabase.rpc("vest_shares", {
        p_user_uuid: user.id,
        p_level: level,
        p_slot_number: slotNumber, // Use 1-based slot_number
        p_shares: amount,
      })

      if (error) {
        console.error("Error vesting shares:", error)
        throw new Error(`Failed to vest shares: ${error.message}`)
      }

      console.log("✅ Shares vested successfully:", data)

      // Refresh data
      await Promise.all([refreshVestingData(), refreshWalletBalances()])
    } catch (err: any) {
      console.error("❌ Error vesting shares:", err)
      setError(err.message || "Failed to vest shares")
      throw err
    }
  }

  // Claim shares from a specific slot (UI uses 0-based index, converts to 1-based slot_number)
  const claimShares = async (level: number, slotIndex: number) => {
    if (!user) throw new Error("User not authenticated")

    try {
      setError(null)

      // Convert 0-based UI index to 1-based slot_number for database
      const slotNumber = slotIndex + 1

      console.log(`💰 Claiming shares from Level ${level}, Slot ${slotNumber} (UI index ${slotIndex})`)

      const { data, error } = await supabase.rpc("claim_shares", {
        p_user_uuid: user.id,
        p_level: level,
        p_slot_number: slotNumber, // Use 1-based slot_number
      })

      if (error) {
        console.error("Error claiming shares:", error)
        throw new Error(`Failed to claim shares: ${error.message}`)
      }

      console.log("✅ Shares claimed successfully:", data)

      // Refresh data
      await Promise.all([refreshVestingData(), refreshWalletBalances()])

      return data
    } catch (err: any) {
      console.error("❌ Error claiming shares:", err)
      setError(err.message || "Failed to claim shares")
      throw err
    }
  }

  // Vest shares directly using 1-based slot number (for direct API usage)
  const vestInSlot = async (level: number, slotNumber: number, amount: number) => {
    if (!user) throw new Error("User not authenticated")

    try {
      setError(null)

      console.log(`📝 Vesting ${amount} shares in Level ${level}, Slot ${slotNumber} (direct)`)

      const { data, error } = await supabase.rpc("vest_shares", {
        p_user_uuid: user.id,
        p_level: level,
        p_slot_number: slotNumber, // Already 1-based
        p_shares: amount,
      })

      if (error) {
        console.error("Error vesting shares:", error)
        throw new Error(`Failed to vest shares: ${error.message}`)
      }

      console.log("✅ Shares vested successfully:", data)

      // Refresh data
      await Promise.all([refreshVestingData(), refreshWalletBalances()])
    } catch (err: any) {
      console.error("❌ Error vesting shares:", err)
      setError(err.message || "Failed to vest shares")
      throw err
    }
  }

  const getTotalVestingInProgress = () => {
    return 0
  }

  const getTotalClaimableShares = () => {
    return 0
  }

  const validateVestingAmount = (amount: number, level: number) => {
    return { valid: true }
  }

  const getHoldPeriodForLevel = (level: number) => {
    return 0
  }

  const getAllVestingSlots = () => {
    return vestingSlots
  }

  const getClaimableSlots = () => {
    return vestingSlots.filter((slot) => slot.status === "claim")
  }

  const claimSlot = async (slotId: string) => {
    console.log("claiming slot")
  }

  // Load vesting data when user changes
  useEffect(() => {
    if (user) {
      refreshVestingData()
    }
  }, [user, refreshVestingData])

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return

    console.log("🔔 Setting up vesting real-time subscription")

    const subscription = supabase
      .channel("vesting_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pivot_vesting",
          filter: `user_uuid=eq.${user.id}`,
        },
        (payload) => {
          console.log("📡 Vesting change detected:", payload)
          refreshVestingData()
        },
      )
      .subscribe()

    return () => {
      console.log("🔕 Cleaning up vesting subscription")
      subscription.unsubscribe()
    }
  }, [user, refreshVestingData])

  const value = {
    // Vesting data
    vestingSlots,
    totalLockedShares,
    totalClaimableShares,
    totalClaimedShares,

    // Actions
    vestShares,
    claimShares,
    vestInSlot,

    // Utilities
    getVestingSlotsForLevel,
    refreshVestingData,

    // State
    loading,
    error,
    getTotalVestingInProgress,
    getTotalClaimableShares,
    validateVestingAmount,
    getHoldPeriodForLevel,
    getAllVestingSlots,
    getClaimableSlots,
    claimSlot,
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
