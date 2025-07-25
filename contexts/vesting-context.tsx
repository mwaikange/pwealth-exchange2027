"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"

interface VestingSlot {
  id: string
  user_uuid: string
  level: number
  slot_number: number
  shares_locked: number
  shares_vested: number
  shares_claimed: number
  lock_date: string
  vest_date: string
  status: "locked" | "vesting" | "vested" | "claimed"
  created_at: string
  updated_at: string
}

interface VestingContextType {
  // Data
  vestingSlots: VestingSlot[]
  totalLocked: number
  totalVested: number
  totalClaimed: number
  availableToClaim: number

  // Actions
  lockShares: (level: number, shares: number) => Promise<void>
  claimVestedShares: (slotId: string) => Promise<void>
  claimAllVested: () => Promise<void>

  // Data refresh
  refreshVestingData: (silent?: boolean) => Promise<void>

  // State
  loading: boolean
  error: string | null
  claiming: boolean
}

const VestingContext = createContext<VestingContextType | undefined>(undefined)

export function VestingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  // State
  const [vestingSlots, setVestingSlots] = useState<VestingSlot[]>([])
  const [totalLocked, setTotalLocked] = useState(0)
  const [totalVested, setTotalVested] = useState(0)
  const [totalClaimed, setTotalClaimed] = useState(0)
  const [availableToClaim, setAvailableToClaim] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [claiming, setClaiming] = useState(false)

  // Helper function to safely convert to number
  const safeNumber = (value: any): number => {
    const num = Number(value)
    return isNaN(num) ? 0 : num
  }

  // Check if pivot_vesting table exists and initialize if needed
  const initializePivotVesting = async () => {
    if (!user) return false

    try {
      // Check if user has pivot vesting data
      const { data: existingData, error: checkError } = await supabase
        .from("pivot_vesting")
        .select("id")
        .eq("user_uuid", user.id)
        .limit(1)

      if (checkError) {
        if (checkError.code === "42P01") {
          // Table doesn't exist, fall back to legacy system
          console.log("⚠️ pivot_vesting table doesn't exist, using legacy vesting_schedules")
          return false
        }
        throw checkError
      }

      if (!existingData || existingData.length === 0) {
        // Initialize pivot vesting for user
        console.log("🔧 Initializing pivot vesting for user:", user.id)

        const { error: initError } = await supabase.rpc("initialize_user_vesting", {
          p_user_uuid: user.id,
        })

        if (initError) {
          console.error("Error initializing pivot vesting:", initError)
          return false
        }

        console.log("✅ Pivot vesting initialized successfully")
      }

      return true
    } catch (err) {
      console.error("Error checking/initializing pivot vesting:", err)
      return false
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

        // Try to use pivot_vesting first
        const usePivotSystem = await initializePivotVesting()

        if (usePivotSystem) {
          // Use new pivot system
          const { data: pivotData, error: pivotError } = await supabase
            .from("pivot_vesting")
            .select("*")
            .eq("user_uuid", user.id)
            .order("level", { ascending: true })
            .order("slot_number", { ascending: true })

          if (pivotError) {
            throw new Error(`Failed to fetch pivot vesting data: ${pivotError.message}`)
          }

          const processedSlots = (pivotData || []).map((slot) => ({
            ...slot,
            shares_locked: safeNumber(slot.shares_locked),
            shares_vested: safeNumber(slot.shares_vested),
            shares_claimed: safeNumber(slot.shares_claimed),
          }))

          setVestingSlots(processedSlots)

          // Calculate totals
          const locked = processedSlots.reduce((sum, slot) => sum + slot.shares_locked, 0)
          const vested = processedSlots.reduce((sum, slot) => sum + slot.shares_vested, 0)
          const claimed = processedSlots.reduce((sum, slot) => sum + slot.shares_claimed, 0)
          const availableForClaim = processedSlots
            .filter((slot) => slot.status === "vested")
            .reduce((sum, slot) => sum + (slot.shares_vested - slot.shares_claimed), 0)

          setTotalLocked(locked)
          setTotalVested(vested)
          setTotalClaimed(claimed)
          setAvailableToClaim(availableForClaim)

          if (!silent) {
            console.log("✅ Pivot vesting data refreshed:", {
              slots: processedSlots.length,
              totalLocked: locked,
              totalVested: vested,
              totalClaimed: claimed,
              availableToClaim: availableForClaim,
            })
          }
        } else {
          // Fall back to legacy vesting_schedules system
          console.log("📊 Using legacy vesting_schedules system")

          const { data: legacyData, error: legacyError } = await supabase
            .from("vesting_schedules")
            .select("*")
            .eq("user_uuid", user.id)
            .order("created_at", { ascending: true })

          if (legacyError) {
            throw new Error(`Failed to fetch legacy vesting data: ${legacyError.message}`)
          }

          // Convert legacy data to pivot format
          const convertedSlots: VestingSlot[] = (legacyData || []).map((schedule, index) => ({
            id: schedule.id,
            user_uuid: schedule.user_uuid,
            level: 1, // Default to level 1 for legacy data
            slot_number: index + 1,
            shares_locked: safeNumber(schedule.shares_locked),
            shares_vested: safeNumber(schedule.shares_vested),
            shares_claimed: safeNumber(schedule.shares_claimed),
            lock_date: schedule.lock_date,
            vest_date: schedule.vest_date,
            status: schedule.status as "locked" | "vesting" | "vested" | "claimed",
            created_at: schedule.created_at,
            updated_at: schedule.updated_at,
          }))

          setVestingSlots(convertedSlots)

          // Calculate totals from legacy data
          const locked = convertedSlots.reduce((sum, slot) => sum + slot.shares_locked, 0)
          const vested = convertedSlots.reduce((sum, slot) => sum + slot.shares_vested, 0)
          const claimed = convertedSlots.reduce((sum, slot) => sum + slot.shares_claimed, 0)
          const availableForClaim = convertedSlots
            .filter((slot) => slot.status === "vested")
            .reduce((sum, slot) => sum + (slot.shares_vested - slot.shares_claimed), 0)

          setTotalLocked(locked)
          setTotalVested(vested)
          setTotalClaimed(claimed)
          setAvailableToClaim(availableForClaim)

          if (!silent) {
            console.log("✅ Legacy vesting data refreshed:", {
              slots: convertedSlots.length,
              totalLocked: locked,
              totalVested: vested,
              totalClaimed: claimed,
              availableToClaim: availableForClaim,
            })
          }
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

  // Lock shares in vesting
  const lockShares = async (level: number, shares: number) => {
    if (!user) throw new Error("User not authenticated")

    try {
      setClaiming(true)
      setError(null)

      console.log("🔒 Locking shares in vesting:", { level, shares })

      const { data, error } = await supabase.rpc("add_shares_to_vesting", {
        p_user_uuid: user.id,
        p_level: level,
        p_shares: shares,
      })

      if (error) {
        console.error("Error locking shares:", error)
        throw new Error(`Failed to lock shares: ${error.message}`)
      }

      console.log("✅ Shares locked successfully:", data)

      // Refresh vesting data
      await refreshVestingData(true)
    } catch (err: any) {
      console.error("❌ Error locking shares:", err)
      setError(err.message || "Failed to lock shares")
      throw err
    } finally {
      setClaiming(false)
    }
  }

  // Claim vested shares from a specific slot
  const claimVestedShares = async (slotId: string) => {
    if (!user) throw new Error("User not authenticated")

    try {
      setClaiming(true)
      setError(null)

      console.log("💰 Claiming vested shares from slot:", slotId)

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
      setClaiming(false)
    }
  }

  // Claim all vested shares
  const claimAllVested = async () => {
    if (!user) throw new Error("User not authenticated")

    try {
      setClaiming(true)
      setError(null)

      console.log("💰 Claiming all vested shares")

      const vestedSlots = vestingSlots.filter(
        (slot) => slot.status === "vested" && slot.shares_vested - slot.shares_claimed > 0,
      )

      for (const slot of vestedSlots) {
        await claimVestedShares(slot.id)
      }

      console.log("✅ All vested shares claimed successfully")
    } catch (err: any) {
      console.error("❌ Error claiming all shares:", err)
      setError(err.message || "Failed to claim all shares")
      throw err
    } finally {
      setClaiming(false)
    }
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

    // Subscribe to pivot_vesting changes
    const pivotSubscription = supabase
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
          console.log("📡 Pivot vesting change detected:", payload)
          refreshVestingData(true)
        },
      )
      .subscribe()

    // Subscribe to legacy vesting_schedules changes (fallback)
    const legacySubscription = supabase
      .channel("vesting_schedules_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vesting_schedules",
          filter: `user_uuid=eq.${user.id}`,
        },
        (payload) => {
          console.log("📡 Legacy vesting change detected:", payload)
          refreshVestingData(true)
        },
      )
      .subscribe()

    return () => {
      console.log("🔕 Cleaning up vesting subscriptions")
      pivotSubscription.unsubscribe()
      legacySubscription.unsubscribe()
    }
  }, [user, refreshVestingData])

  const value = {
    // Data
    vestingSlots,
    totalLocked,
    totalVested,
    totalClaimed,
    availableToClaim,

    // Actions
    lockShares,
    claimVestedShares,
    claimAllVested,

    // Data refresh
    refreshVestingData,

    // State
    loading,
    error,
    claiming,
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
