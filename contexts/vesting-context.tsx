"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"

// Vesting levels configuration
export const VESTING_LEVELS = {
  1: { name: "Retail", days: 5 },
  2: { name: "Small Business", days: 30 },
  3: { name: "Corporate", days: 90 },
} as const

// Vesting slot interface with proper structure
interface VestingSlot {
  id: string
  user_uuid: string
  level: number
  slot_number: number
  amount: number // Fractional shares with 4 decimal precision
  status: "available" | "vesting" | "ready_to_claim" | "claimed"
  start_time: string | null
  end_time: string | null
  claimed_at: string | null
  created_at: string
  updated_at: string
}

interface VestingContextType {
  // Data
  vestingSlots: VestingSlot[]
  availableSlots: VestingSlot[]
  vestingSlots_active: VestingSlot[]
  readyToClaim: VestingSlot[]
  claimedSlots: VestingSlot[]

  // Totals
  totalVesting: number
  totalReadyToClaim: number
  totalClaimed: number

  // Actions
  vestShares: (level: number, slotNumber: number, amount: number) => Promise<void>
  claimShares: (slotId: string) => Promise<void>
  claimAllReady: () => Promise<void>

  // Data refresh
  refreshVestingData: (silent?: boolean) => Promise<void>

  // State
  loading: boolean
  error: string | null
  processing: boolean
}

const VestingContext = createContext<VestingContextType | undefined>(undefined)

export function VestingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  // State
  const [vestingSlots, setVestingSlots] = useState<VestingSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  // Helper function to safely convert to number with 4 decimal precision
  const safeNumber = (value: any): number => {
    const num = Number(value)
    return isNaN(num) ? 0 : Math.round(num * 10000) / 10000
  }

  // Initialize vesting slots for user if they don't exist
  const initializeVestingSlots = async () => {
    if (!user) return

    try {
      console.log("🔧 Initializing vesting slots for user:", user.id)

      const { data, error } = await supabase.rpc("initialize_user_vesting_slots", {
        p_user_uuid: user.id,
      })

      if (error) {
        console.error("Error initializing vesting slots:", error)
        throw error
      }

      console.log("✅ Vesting slots initialized:", data)
    } catch (err: any) {
      console.error("Failed to initialize vesting slots:", err)
      setError(err.message)
    }
  }

  // Refresh vesting data
  const refreshVestingData = useCallback(
    async (silent = false) => {
      if (!user) return

      try {
        if (!silent) {
          setLoading(true)
          setError(null)
        }

        console.log("🔄 Refreshing vesting data...")

        // Check if pivot_vesting table exists and has data for user
        const { data: existingSlots, error: checkError } = await supabase
          .from("pivot_vesting")
          .select("*")
          .eq("user_uuid", user.id)
          .limit(1)

        if (checkError) {
          if (checkError.code === "42P01") {
            // Table doesn't exist, create it first
            console.log("⚠️ pivot_vesting table doesn't exist, creating...")
            throw new Error("Vesting system not initialized. Please contact support.")
          }
          throw checkError
        }

        // If no slots exist, initialize them
        if (!existingSlots || existingSlots.length === 0) {
          await initializeVestingSlots()
        }

        // Fetch all vesting slots for user
        const { data: slots, error: fetchError } = await supabase
          .from("pivot_vesting")
          .select("*")
          .eq("user_uuid", user.id)
          .order("level", { ascending: true })
          .order("slot_number", { ascending: true })

        if (fetchError) {
          throw new Error(`Failed to fetch vesting data: ${fetchError.message}`)
        }

        // Process slots with proper number formatting
        const processedSlots: VestingSlot[] = (slots || []).map((slot) => ({
          ...slot,
          amount: safeNumber(slot.amount),
        }))

        // Update slot statuses based on time
        const now = new Date()
        const updatedSlots = processedSlots.map((slot) => {
          if (slot.status === "vesting" && slot.end_time) {
            const endTime = new Date(slot.end_time)
            if (now >= endTime) {
              // Auto-transition to ready_to_claim
              return { ...slot, status: "ready_to_claim" as const }
            }
          }
          return slot
        })

        setVestingSlots(updatedSlots)

        if (!silent) {
          console.log("✅ Vesting data refreshed:", {
            totalSlots: updatedSlots.length,
            available: updatedSlots.filter((s) => s.status === "available").length,
            vesting: updatedSlots.filter((s) => s.status === "vesting").length,
            readyToClaim: updatedSlots.filter((s) => s.status === "ready_to_claim").length,
            claimed: updatedSlots.filter((s) => s.status === "claimed").length,
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

  // Vest shares in a specific slot
  const vestShares = async (level: number, slotNumber: number, amount: number) => {
    if (!user) throw new Error("User not authenticated")

    try {
      setProcessing(true)
      setError(null)

      // Ensure 4 decimal precision
      const preciseAmount = safeNumber(amount)

      console.log("🔒 Vesting shares:", { level, slotNumber, amount: preciseAmount })

      const { data, error } = await supabase.rpc("vest_shares_in_slot", {
        p_user_uuid: user.id,
        p_level: level,
        p_slot_number: slotNumber,
        p_amount: preciseAmount,
      })

      if (error) {
        console.error("Error vesting shares:", error)
        throw new Error(`Failed to vest shares: ${error.message}`)
      }

      console.log("✅ Shares vested successfully:", data)

      // Refresh vesting data
      await refreshVestingData(true)
    } catch (err: any) {
      console.error("❌ Error vesting shares:", err)
      setError(err.message || "Failed to vest shares")
      throw err
    } finally {
      setProcessing(false)
    }
  }

  // Claim shares from a specific slot
  const claimShares = async (slotId: string) => {
    if (!user) throw new Error("User not authenticated")

    try {
      setProcessing(true)
      setError(null)

      console.log("💰 Claiming shares from slot:", slotId)

      const { data, error } = await supabase.rpc("claim_vested_shares", {
        p_slot_id: slotId,
        p_user_uuid: user.id,
      })

      if (error) {
        console.error("Error claiming shares:", error)
        throw new Error(`Failed to claim shares: ${error.message}`)
      }

      console.log("✅ Shares claimed successfully:", data)

      // Refresh vesting data
      await refreshVestingData(true)
    } catch (err: any) {
      console.error("❌ Error claiming shares:", err)
      setError(err.message || "Failed to claim shares")
      throw err
    } finally {
      setProcessing(false)
    }
  }

  // Claim all ready shares
  const claimAllReady = async () => {
    if (!user) throw new Error("User not authenticated")

    try {
      setProcessing(true)
      setError(null)

      const readySlots = vestingSlots.filter((slot) => slot.status === "ready_to_claim")

      console.log("💰 Claiming all ready shares:", readySlots.length, "slots")

      for (const slot of readySlots) {
        await claimShares(slot.id)
      }

      console.log("✅ All ready shares claimed successfully")
    } catch (err: any) {
      console.error("❌ Error claiming all shares:", err)
      setError(err.message || "Failed to claim all shares")
      throw err
    } finally {
      setProcessing(false)
    }
  }

  // Computed values
  const availableSlots = vestingSlots.filter((slot) => slot.status === "available")
  const vestingSlots_active = vestingSlots.filter((slot) => slot.status === "vesting")
  const readyToClaim = vestingSlots.filter((slot) => slot.status === "ready_to_claim")
  const claimedSlots = vestingSlots.filter((slot) => slot.status === "claimed")

  const totalVesting = vestingSlots_active.reduce((sum, slot) => sum + slot.amount, 0)
  const totalReadyToClaim = readyToClaim.reduce((sum, slot) => sum + slot.amount, 0)
  const totalClaimed = claimedSlots.reduce((sum, slot) => sum + slot.amount, 0)

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

  // Auto-update vesting statuses every minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (vestingSlots_active.length > 0) {
        refreshVestingData(true)
      }
    }, 60000) // Every minute

    return () => clearInterval(interval)
  }, [vestingSlots_active.length, refreshVestingData])

  const value = {
    // Data
    vestingSlots,
    availableSlots,
    vestingSlots_active,
    readyToClaim,
    claimedSlots,

    // Totals
    totalVesting,
    totalReadyToClaim,
    totalClaimed,

    // Actions
    vestShares,
    claimShares,
    claimAllReady,

    // Data refresh
    refreshVestingData,

    // State
    loading,
    error,
    processing,
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
