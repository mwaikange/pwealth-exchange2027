"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"

export interface VestingSlot {
  id: string
  user_uuid: string
  slot_number: number
  level: number
  shares: number
  vested_at: string | null
  claimed_at: string | null
  expires_at: string
  status: "active" | "vested" | "claimed" | "expired"
  created_at: string
}

export interface VestingStats {
  totalSlots: number
  activeSlots: number
  vestedSlots: number
  claimedSlots: number
  expiredSlots: number
  totalShares: number
  vestedShares: number
  claimedShares: number
  availableToClaimShares: number
}

interface VestingContextType {
  vestingSlots: VestingSlot[]
  vestingStats: VestingStats
  loading: boolean
  error: string | null
  refreshVestingData: () => Promise<void>
  claimVestedShares: (slotId: string) => Promise<{ success: boolean; message: string }>
  initializeVestingSlots: () => Promise<{ success: boolean; message: string }>
}

const VestingContext = createContext<VestingContextType | undefined>(undefined)

export function VestingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [vestingSlots, setVestingSlots] = useState<VestingSlot[]>([])
  const [vestingStats, setVestingStats] = useState<VestingStats>({
    totalSlots: 0,
    activeSlots: 0,
    vestedSlots: 0,
    claimedSlots: 0,
    expiredSlots: 0,
    totalShares: 0,
    vestedShares: 0,
    claimedShares: 0,
    availableToClaimShares: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshVestingData = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Refreshing vesting data...")

      // Try to fetch from pivot_vesting table first (new system)
      const { data: pivotData, error: pivotError } = await supabase
        .from("pivot_vesting")
        .select("*")
        .eq("user_uuid", user.id)
        .order("level", { ascending: true })
        .order("slot_number", { ascending: true })

      if (pivotError) {
        console.log("⚠️ pivot_vesting table not found, trying legacy vesting_schedules...")

        // Fallback to legacy vesting_schedules table
        const { data: legacyData, error: legacyError } = await supabase
          .from("vesting_schedules")
          .select("*")
          .eq("user_uuid", user.id)
          .order("created_at", { ascending: true })

        if (legacyError) {
          console.error("❌ Error fetching from both vesting tables:", legacyError)
          throw new Error("Failed to fetch vesting data: " + legacyError.message)
        }

        // Convert legacy data to new format
        const convertedData = (legacyData || []).map((item: any, index: number) => ({
          id: item.id,
          user_uuid: item.user_uuid,
          slot_number: (index % 6) + 1, // Distribute across 6 slots
          level: Math.floor(index / 6) + 1, // Group by levels
          shares: Number(item.shares || 0),
          vested_at: item.vested_at,
          claimed_at: item.claimed_at,
          expires_at: item.expires_at,
          status: item.claimed_at ? "claimed" : item.vested_at ? "vested" : "active",
          created_at: item.created_at,
        }))

        setVestingSlots(convertedData)
        console.log("✅ Using legacy vesting data:", convertedData.length, "slots")
      } else {
        // Use pivot_vesting data
        const formattedData = (pivotData || []).map((item: any) => ({
          ...item,
          shares: Number(item.shares || 0),
          status: item.claimed_at ? "claimed" : item.vested_at ? "vested" : "active",
        }))

        setVestingSlots(formattedData)
        console.log("✅ Using pivot vesting data:", formattedData.length, "slots")
      }

      // Calculate stats
      const slots = pivotError
        ? vestingSlots
        : (pivotData || []).map((item: any) => ({
            ...item,
            shares: Number(item.shares || 0),
            status: item.claimed_at ? "claimed" : item.vested_at ? "vested" : "active",
          }))

      const stats: VestingStats = {
        totalSlots: slots.length,
        activeSlots: slots.filter((s) => s.status === "active").length,
        vestedSlots: slots.filter((s) => s.status === "vested").length,
        claimedSlots: slots.filter((s) => s.status === "claimed").length,
        expiredSlots: slots.filter((s) => s.status === "expired").length,
        totalShares: slots.reduce((sum, s) => sum + s.shares, 0),
        vestedShares: slots.filter((s) => s.status === "vested").reduce((sum, s) => sum + s.shares, 0),
        claimedShares: slots.filter((s) => s.status === "claimed").reduce((sum, s) => sum + s.shares, 0),
        availableToClaimShares: slots.filter((s) => s.status === "vested").reduce((sum, s) => sum + s.shares, 0),
      }

      setVestingStats(stats)
      console.log("📊 Vesting stats calculated:", stats)
    } catch (err: any) {
      console.error("❌ Error refreshing vesting data:", err)
      setError(err.message || "Failed to fetch vesting data")
    } finally {
      setLoading(false)
    }
  }, [user])

  const claimVestedShares = async (slotId: string): Promise<{ success: boolean; message: string }> => {
    if (!user) return { success: false, message: "Not authenticated" }

    try {
      setLoading(true)
      setError(null)

      console.log("🎯 Claiming vested shares for slot:", slotId)

      // Try pivot_vesting first
      const { data, error } = await supabase.rpc("claim_vested_shares_pivot", {
        p_user_uuid: user.id,
        p_slot_id: slotId,
      })

      if (error) {
        // Fallback to legacy function
        const legacyResult = await supabase.rpc("claim_vested_shares", {
          p_user_uuid: user.id,
          p_vesting_id: slotId,
        })

        if (legacyResult.error) {
          throw legacyResult.error
        }

        console.log("✅ Claimed using legacy system:", legacyResult.data)
      } else {
        console.log("✅ Claimed using pivot system:", data)
      }

      // Refresh data
      await refreshVestingData()

      return { success: true, message: "Shares claimed successfully!" }
    } catch (err: any) {
      console.error("❌ Error claiming shares:", err)
      setError(err.message)
      return { success: false, message: err.message || "Failed to claim shares" }
    } finally {
      setLoading(false)
    }
  }

  const initializeVestingSlots = async (): Promise<{ success: boolean; message: string }> => {
    if (!user) return { success: false, message: "Not authenticated" }

    try {
      setLoading(true)
      setError(null)

      console.log("🚀 Initializing vesting slots...")

      const { data, error } = await supabase.rpc("initialize_user_vesting_slots", {
        p_user_uuid: user.id,
      })

      if (error) {
        throw error
      }

      console.log("✅ Vesting slots initialized:", data)

      // Refresh data
      await refreshVestingData()

      return { success: true, message: "Vesting slots initialized successfully!" }
    } catch (err: any) {
      console.error("❌ Error initializing vesting slots:", err)
      setError(err.message)
      return { success: false, message: err.message || "Failed to initialize vesting slots" }
    } finally {
      setLoading(false)
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
          refreshVestingData()
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
          refreshVestingData()
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
    vestingSlots,
    vestingStats,
    loading,
    error,
    refreshVestingData,
    claimVestedShares,
    initializeVestingSlots,
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
