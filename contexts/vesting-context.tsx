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

// Simplified vesting slot interface matching your SQL structure
interface VestingSlot {
  id: string
  user_uuid: string
  level: number | null
  slot_number: number | null
  amount: number
  status: "locked" | "unlocked" | "claimed"
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
  const { updateHoldWallet } = useWallet()

  // State
  const [vestingSlots, setVestingSlots] = useState<VestingSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Helper function to safely convert to number with 4 decimal precision
  const safeNumber = (value: any): number => {
    const num = Number(value)
    return isNaN(num) ? 0 : Math.round(num * 10000) / 10000
  }

  // Refresh vesting data from pivot_vesting table
  const refreshVestingData = useCallback(
    async (silent = false) => {
      if (!user) return

      try {
        if (!silent) {
          setLoading(true)
          setError(null)
        }

        console.log("🔄 Refreshing vesting data...")

        // Fetch all vesting slots for user
        const { data: slots, error: fetchError } = await supabase
          .from("pivot_vesting")
          .select("*")
          .eq("user_uuid", user.id)
          .order("created_at", { ascending: true })

        if (fetchError) {
          throw new Error(`Failed to fetch vesting data: ${fetchError.message}`)
        }

        // Process slots with proper number formatting
        const processedSlots: VestingSlot[] = (slots || []).map((slot) => ({
          ...slot,
          amount: safeNumber(slot.amount),
          level: slot.level || 1,
          slot_number: slot.slot_number || 0,
        }))

        // Auto-update unlocked slots
        const now = new Date()
        const slotsToUpdate = processedSlots.filter(
          (slot) => slot.status === "locked" && slot.end_time && new Date(slot.end_time) <= now,
        )

        if (slotsToUpdate.length > 0) {
          console.log(`🔓 Auto-unlocking ${slotsToUpdate.length} matured slots`)

          for (const slot of slotsToUpdate) {
            await supabase.from("pivot_vesting").update({ status: "unlocked" }).eq("id", slot.id)
          }

          // Refetch after updates
          const { data: updatedSlots, error: refetchError } = await supabase
            .from("pivot_vesting")
            .select("*")
            .eq("user_uuid", user.id)
            .order("created_at", { ascending: true })

          if (!refetchError && updatedSlots) {
            const reprocessedSlots = updatedSlots.map((slot) => ({
              ...slot,
              amount: safeNumber(slot.amount),
              level: slot.level || 1,
              slot_number: slot.slot_number || 0,
            }))
            setVestingSlots(reprocessedSlots)
          }
        } else {
          setVestingSlots(processedSlots)
        }

        if (!silent) {
          console.log("✅ Vesting data refreshed:", {
            totalSlots: processedSlots.length,
            locked: processedSlots.filter((s) => s.status === "locked").length,
            unlocked: processedSlots.filter((s) => s.status === "unlocked").length,
            claimed: processedSlots.filter((s) => s.status === "claimed").length,
          })
        }
      } catch (err: any) {
        if (!silent) {
          console.error("❌ Error fetching vesting data:", err)
          setError(err.message || "Failed to fetch vesting data")
        }
      } finally {
        if (!silent) {
          setLoading(false)
        }
      }
    },
    [user],
  )

  // Legacy method: Get vesting slots for a specific level (for existing UI)
  const getVestingSlotsForLevel = (level: number): LegacyVestingSlot[] => {
    const levelSlots = vestingSlots.filter((slot) => slot.level === level)

    // Create 6 slots for the level (some may be empty)
    const legacySlots: LegacyVestingSlot[] = []

    for (let i = 0; i < 6; i++) {
      const existingSlot = levelSlots.find((slot) => slot.slot_number === i)

      if (existingSlot) {
        let status: "empty" | "in_progress" | "claimable" = "empty"
        let progress = 0

        if (existingSlot.status === "locked") {
          status = "in_progress"
          if (existingSlot.start_time && existingSlot.end_time) {
            const start = new Date(existingSlot.start_time).getTime()
            const end = new Date(existingSlot.end_time).getTime()
            const now = Date.now()
            progress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
          }
        } else if (existingSlot.status === "unlocked") {
          status = "claimable"
          progress = 100
        }

        legacySlots.push({
          id: existingSlot.id,
          status,
          startDate: existingSlot.start_time ? new Date(existingSlot.start_time).getTime() : undefined,
          amount: existingSlot.amount,
          progress,
          level: existingSlot.level || level,
        })
      } else {
        legacySlots.push({
          id: `empty-${level}-${i}`,
          status: "empty",
          amount: 0,
          progress: 0,
          level,
        })
      }
    }

    return legacySlots
  }

  // Legacy method: Vest shares (for existing UI)
  const vestShares = async (level: number, slotIndex: number, amount: number) => {
    if (!user) throw new Error("User not authenticated")

    try {
      setError(null)
      const preciseAmount = safeNumber(amount)

      console.log("🔒 Vesting shares:", { level, slotIndex, amount: preciseAmount })

      const startTime = new Date()
      const endTime = new Date(
        startTime.getTime() + VESTING_LEVELS[level as keyof typeof VESTING_LEVELS].days * 24 * 60 * 60 * 1000,
      )

      // Insert or update the vesting slot
      const { data, error } = await supabase
        .from("pivot_vesting")
        .upsert({
          user_uuid: user.id,
          level,
          slot_number: slotIndex,
          amount: preciseAmount,
          status: "locked",
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()

      if (error) {
        console.error("Error vesting shares:", error)
        throw new Error(`Failed to vest shares: ${error.message}`)
      }

      console.log("✅ Shares vested successfully:", data)

      // Update wallet balances
      await updateHoldWallet(preciseAmount, "subtract", "pre")

      // Refresh vesting data
      await refreshVestingData(true)
    } catch (err: any) {
      console.error("❌ Error vesting shares:", err)
      setError(err.message || "Failed to vest shares")
      throw err
    }
  }

  // Legacy method: Claim shares (for existing UI)
  const claimShares = async (level: number, slotIndex: number) => {
    if (!user) throw new Error("User not authenticated")

    try {
      setError(null)

      // Find the slot to claim
      const slot = vestingSlots.find((s) => s.level === level && s.slot_number === slotIndex && s.status === "unlocked")

      if (!slot) {
        throw new Error("No claimable slot found")
      }

      await claimSlot(slot.id)
    } catch (err: any) {
      console.error("❌ Error claiming shares:", err)
      setError(err.message || "Failed to claim shares")
      throw err
    }
  }

  // New method: Claim a specific slot by ID
  const claimSlot = async (slotId: string) => {
    if (!user) throw new Error("User not authenticated")

    try {
      setError(null)

      console.log("💰 Claiming slot:", slotId)

      // Get the slot details
      const slot = vestingSlots.find((s) => s.id === slotId && s.status === "unlocked")
      if (!slot) {
        throw new Error("Slot not found or not claimable")
      }

      // Update slot status to claimed
      const { error: updateError } = await supabase
        .from("pivot_vesting")
        .update({
          status: "claimed",
          claimed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", slotId)

      if (updateError) {
        throw new Error(`Failed to claim slot: ${updateError.message}`)
      }

      // Credit user's post-hold wallet
      await updateHoldWallet(slot.amount, "add", "post")

      console.log("✅ Slot claimed successfully:", { slotId, amount: slot.amount })

      // Refresh vesting data
      await refreshVestingData(true)
    } catch (err: any) {
      console.error("❌ Error claiming slot:", err)
      setError(err.message || "Failed to claim slot")
      throw err
    }
  }

  // New method: Vest in a specific slot
  const vestInSlot = async (level: number, slotNumber: number, amount: number) => {
    await vestShares(level, slotNumber, amount)
  }

  // Helper methods for existing UI
  const getTotalVestingInProgress = (): number => {
    return vestingSlots.filter((slot) => slot.status === "locked").reduce((sum, slot) => sum + slot.amount, 0)
  }

  const getTotalClaimableShares = (): number => {
    return vestingSlots.filter((slot) => slot.status === "unlocked").reduce((sum, slot) => sum + slot.amount, 0)
  }

  const validateVestingAmount = (amount: number, level: number) => {
    const preciseAmount = safeNumber(amount)

    if (preciseAmount <= 0) {
      return { valid: false, message: "Amount must be greater than 0" }
    }

    // Level-based validation
    if (level === 1 && (preciseAmount < 1 || preciseAmount > 50)) {
      return { valid: false, message: "Retail level: 1-50 shares" }
    }
    if (level === 2 && (preciseAmount < 51 || preciseAmount > 500)) {
      return { valid: false, message: "Small Business level: 51-500 shares" }
    }
    if (level === 3 && preciseAmount < 501) {
      return { valid: false, message: "Corporate level: 501+ shares" }
    }

    return { valid: true }
  }

  const getHoldPeriodForLevel = (level: number): number => {
    return VESTING_LEVELS[level as keyof typeof VESTING_LEVELS]?.days || 5
  }

  // New helper methods
  const getAllVestingSlots = (): VestingSlot[] => {
    return vestingSlots
  }

  const getClaimableSlots = (): VestingSlot[] => {
    return vestingSlots.filter((slot) => slot.status === "unlocked")
  }

  // Load vesting data when user changes
  useEffect(() => {
    if (user) {
      refreshVestingData()
    }
  }, [user, refreshVestingData])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return

    console.log("🔔 Setting up vesting real-time subscriptions")

    const subscription = supabase
      .channel("pivot_vesting_changes")
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
          refreshVestingData(true)
        },
      )
      .subscribe()

    return () => {
      console.log("🔕 Cleaning up vesting subscriptions")
      subscription.unsubscribe()
    }
  }, [user, refreshVestingData])

  // Auto-check for unlocked slots every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const lockedSlots = vestingSlots.filter((slot) => slot.status === "locked")
      if (lockedSlots.length > 0) {
        refreshVestingData(true)
      }
    }, 60000) // Every minute

    return () => clearInterval(interval)
  }, [vestingSlots, refreshVestingData])

  const value = {
    // Legacy methods for existing UI
    getVestingSlotsForLevel,
    vestShares,
    claimShares,
    getTotalVestingInProgress,
    getTotalClaimableShares,
    validateVestingAmount,
    getHoldPeriodForLevel,

    // New simplified methods
    getAllVestingSlots,
    getClaimableSlots,
    claimSlot,
    vestInSlot,

    // State
    loading,
    error,
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
