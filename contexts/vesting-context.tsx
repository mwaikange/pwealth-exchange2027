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
  status: "locked" | "claimable" | "claimed"
  start_time: string | null
  end_time: string | null
  claimed_at: string | null
  created_at: string
  updated_at: string
}

// Legacy interface for backward compatibility with existing UI
interface LegacyVestingSlot {
  id: string
  status: "empty" | "in_progress" | "claimable" | "claimed"
  startDate?: number
  amount: number
  progress: number
  level: number
  start_time?: string | null
  end_time?: string | null
  shares?: number
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

  // Safe number conversion
  const safeNumber = (value: any): number => {
    const num = Number(value)
    return isNaN(num) ? 0 : num
  }

  // Calculate progress for a slot
  const calculateProgress = (slot: VestingSlot): number => {
    if (!slot.start_time || !slot.end_time) return 0

    const startTime = new Date(slot.start_time).getTime()
    const endTime = new Date(slot.end_time).getTime()
    const currentTime = Date.now()

    if (currentTime >= endTime) return 100
    if (currentTime <= startTime) return 0

    const totalDuration = endTime - startTime
    const elapsed = currentTime - startTime

    return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100)
  }

  // Convert database slot to legacy format
  const convertToLegacySlot = (slot: VestingSlot | null, level: number, slotIndex: number): LegacyVestingSlot => {
    if (!slot) {
      return {
        id: `empty-${level}-${slotIndex}`,
        status: "empty",
        amount: 0,
        progress: 0,
        level: level,
      }
    }

    let status: "empty" | "in_progress" | "claimable" | "claimed" = "empty"

    // Map database status to UI status
    switch (slot.status) {
      case "locked":
        status = "in_progress"
        break
      case "claimable":
        status = "claimable"
        break
      case "claimed":
        status = "claimed"
        break
      default:
        status = "empty"
    }

    // If slot is claimed, it becomes available again (empty)
    if (slot.status === "claimed") {
      status = "empty"
    }

    return {
      id: slot.id,
      status: status,
      amount: safeNumber(slot.amount),
      progress: calculateProgress(slot),
      level: safeNumber(slot.level),
      startDate: slot.start_time ? new Date(slot.start_time).getTime() : undefined,
      start_time: slot.start_time,
      end_time: slot.end_time,
      shares: safeNumber(slot.amount),
    }
  }

  // Refresh vesting data from database
  const refreshVestingData = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Refreshing vesting data for user:", user.id)

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
        amount: safeNumber(slot.amount),
        level: safeNumber(slot.level) || 1,
        slot_number: safeNumber(slot.slot_number) || 1,
      }))

      setVestingSlots(processedSlots)

      console.log("✅ Vesting data refreshed:", {
        totalSlots: processedSlots.length,
        slots: processedSlots,
        locked: processedSlots.filter((s) => s.status === "locked").length,
        claimable: processedSlots.filter((s) => s.status === "claimable").length,
        claimed: processedSlots.filter((s) => s.status === "claimed").length,
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
        // Find existing slot in database
        const existingSlot = vestingSlots.find(
          (slot) => safeNumber(slot.level) === level && safeNumber(slot.slot_number) === slotNumber,
        )

        // Convert to legacy format
        const legacySlot = convertToLegacySlot(existingSlot || null, level, slotNumber - 1)
        levelSlots.push(legacySlot)
      }

      console.log(`📊 Level ${level} slots:`, levelSlots)
      return levelSlots
    },
    [user, vestingSlots],
  )

  // Vest shares in a specific slot (UI uses 0-based index, converts to 1-based slot_number)
  const vestShares = async (level: number, slotIndex: number, amount: number) => {
    if (!user) throw new Error("User not authenticated")

    try {
      setError(null)

      // Convert 0-based UI index to 1-based slot_number for database
      const slotNumber = slotIndex + 1

      console.log(`📝 Vesting ${amount} shares in Level ${level}, Slot ${slotNumber} (UI index ${slotIndex})`)

      // Call the unified vest_shares function
      const { data, error } = await supabase.rpc("vest_shares", {
        p_user_uuid: user.id,
        p_level: level,
        p_slot_number: slotNumber,
        p_shares: amount,
      })

      if (error) {
        console.error("Error vesting shares:", error)
        throw new Error(`Failed to vest shares: ${error.message}`)
      }

      // Check if the function returned success
      if (data && !data.success) {
        console.error("Vesting failed:", data.message)
        throw new Error(data.message || "Failed to vest shares")
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
        p_slot_number: slotNumber,
      })

      if (error) {
        console.error("Error claiming shares:", error)
        throw new Error(`Failed to claim shares: ${error.message}`)
      }

      // Check if the function returned success
      if (data && !data.success) {
        console.error("Claiming failed:", data.message)
        throw new Error(data.message || "Failed to claim shares")
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
        p_slot_number: slotNumber,
        p_shares: amount,
      })

      if (error) {
        console.error("Error vesting shares:", error)
        throw new Error(`Failed to vest shares: ${error.message}`)
      }

      // Check if the function returned success
      if (data && !data.success) {
        console.error("Vesting failed:", data.message)
        throw new Error(data.message || "Failed to vest shares")
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
    return vestingSlots
      .filter((slot) => slot.status === "locked")
      .reduce((sum, slot) => sum + safeNumber(slot.amount), 0)
  }

  const getTotalClaimableShares = () => {
    return vestingSlots
      .filter((slot) => slot.status === "claimable")
      .reduce((sum, slot) => sum + safeNumber(slot.amount), 0)
  }

  const validateVestingAmount = (amount: number, level: number) => {
    if (amount <= 0) {
      return { valid: false, message: "Amount must be greater than 0" }
    }

    // Level-specific validation
    switch (level) {
      case 1: // Retail
        if (amount < 1 || amount > 50) {
          return { valid: false, message: "Retail level: 1-50 shares per slot" }
        }
        break
      case 2: // Small Business
        if (amount < 51 || amount > 500) {
          return { valid: false, message: "Small Business level: 51-500 shares per slot" }
        }
        break
      case 3: // Corporate
        if (amount < 501) {
          return { valid: false, message: "Corporate level: 501+ shares per slot" }
        }
        break
    }

    return { valid: true }
  }

  const getHoldPeriodForLevel = (level: number) => {
    return VESTING_LEVELS[level as keyof typeof VESTING_LEVELS]?.days || 5
  }

  const getAllVestingSlots = () => {
    return vestingSlots
  }

  const getClaimableSlots = () => {
    return vestingSlots.filter((slot) => slot.status === "claimable")
  }

  const claimSlot = async (slotId: string) => {
    if (!user) throw new Error("User not authenticated")

    try {
      setError(null)

      const slot = vestingSlots.find((s) => s.id === slotId)
      if (!slot) throw new Error("Slot not found")

      await claimShares(safeNumber(slot.level), safeNumber(slot.slot_number) - 1)
    } catch (err: any) {
      console.error("❌ Error claiming slot:", err)
      setError(err.message || "Failed to claim slot")
      throw err
    }
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
