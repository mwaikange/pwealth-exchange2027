"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"

// Define the vesting schedule state from Supabase
export type VestingSlotData = {
  id: string
  schedule_id: number
  level: string
  status: "Unclaimed" | "Active" | "Completed" | "Claimed"
  shares_amount?: number
  start_date?: string
  completion_date?: string
  progress?: number
  user_uuid: string
}

// Define vesting levels with their limits and hold periods
export const VESTING_LEVELS = {
  1: { name: "Retail", min: 1, max: 50, holdDays: 5 },
  2: { name: "Small Business", min: 51, max: 500, holdDays: 30 },
  3: { name: "Corporate", min: 501, max: Number.POSITIVE_INFINITY, holdDays: 90 },
}

// Define the context type
type VestingContextType = {
  getVestingSlotsForLevel: (level: number) => VestingSlotData[]
  vestShares: (level: number, slotIndex: number, amount: number) => Promise<void>
  claimShares: (level: number, slotIndex: number) => Promise<void>
  getTotalVestingInProgress: () => number
  getTotalClaimableShares: () => number
  getSchedulesByLevel: (level: number) => VestingSlotData[]
  getScheduleById: (id: string) => VestingSlotData | undefined
  validateVestingAmount: (amount: number, level: number) => { valid: boolean; error?: string }
  getHoldPeriodForLevel: (level: number) => number
  refreshVestingData: () => Promise<void>
  loading: boolean
  error: string | null
}

// Create the context
const VestingContext = createContext<VestingContextType | undefined>(undefined)

// Provider component
export function VestingProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth()
  const [vestingSchedules, setVestingSchedules] = useState<VestingSlotData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch vesting data from Supabase
  const refreshVestingData = async () => {
    if (!user || !session) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from("vesting_schedules")
        .select("*")
        .eq("user_uuid", user.id)
        .order("schedule_id", { ascending: true })

      if (fetchError) {
        throw new Error(`Failed to fetch vesting data: ${fetchError.message}`)
      }

      // Process the data and calculate progress for active schedules
      const processedData = (data || []).map((schedule) => {
        let progress = 0
        if (schedule.status === "Active" && schedule.start_date) {
          const startDate = new Date(schedule.start_date)
          const now = new Date()
          const elapsed = now.getTime() - startDate.getTime()
          const level = Number.parseInt(schedule.level)
          const holdDays = getHoldPeriodForLevel(level)
          const totalTime = holdDays * 24 * 60 * 60 * 1000
          progress = Math.min(100, (elapsed / totalTime) * 100)

          // If progress reaches 100%, mark as completed
          if (progress >= 100) {
            schedule.status = "Completed"
          }
        } else if (schedule.status === "Completed" || schedule.status === "Claimed") {
          progress = 100
        }

        return {
          ...schedule,
          progress,
        }
      })

      setVestingSchedules(processedData)
      console.log("Vesting data refreshed:", processedData.length, "schedules")
    } catch (err: any) {
      console.error("Error fetching vesting data:", err)
      setError(err.message || "Failed to load vesting data")
    } finally {
      setLoading(false)
    }
  }

  // Load vesting data when user changes
  useEffect(() => {
    refreshVestingData()
  }, [user, session])

  // Update progress of active vesting slots
  useEffect(() => {
    const interval = setInterval(() => {
      setVestingSchedules((prev) =>
        prev.map((schedule) => {
          if (schedule.status === "Active" && schedule.start_date) {
            const startDate = new Date(schedule.start_date)
            const now = new Date()
            const elapsed = now.getTime() - startDate.getTime()
            const level = Number.parseInt(schedule.level)
            const holdDays = getHoldPeriodForLevel(level)
            const totalTime = holdDays * 24 * 60 * 60 * 1000
            const newProgress = Math.min(100, (elapsed / totalTime) * 100)

            // If progress reaches 100%, mark as completed
            if (newProgress >= 100 && schedule.status !== "Completed") {
              // Update in Supabase
              supabase
                .from("vesting_schedules")
                .update({ status: "Completed" })
                .eq("id", schedule.id)
                .then(() => {
                  console.log("Vesting schedule completed:", schedule.id)
                })

              return {
                ...schedule,
                status: "Completed" as const,
                progress: 100,
              }
            }

            return {
              ...schedule,
              progress: newProgress,
            }
          }
          return schedule
        }),
      )
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [])

  // Get hold period for a specific level
  const getHoldPeriodForLevel = (level: number): number => {
    const levelConfig = VESTING_LEVELS[level as keyof typeof VESTING_LEVELS]
    return levelConfig ? levelConfig.holdDays : 5 // Default to 5 days
  }

  // Get slots for a specific level (6 slots per level)
  const getVestingSlotsForLevel = (level: number): VestingSlotData[] => {
    return vestingSchedules.filter((schedule) => Number.parseInt(schedule.level) === level).slice(0, 6) // Limit to 6 slots per level
  }

  // Validate vesting amount based on level
  const validateVestingAmount = (amount: number, level: number) => {
    const levelConfig = VESTING_LEVELS[level as keyof typeof VESTING_LEVELS]
    if (!levelConfig) {
      return { valid: false, error: "Invalid vesting level" }
    }

    if (amount < levelConfig.min) {
      return { valid: false, error: `Minimum ${levelConfig.min} shares required for ${levelConfig.name} level` }
    }

    if (amount > levelConfig.max) {
      return { valid: false, error: `Maximum ${levelConfig.max} shares allowed for ${levelConfig.name} level` }
    }

    return { valid: true }
  }

  // Vest shares function (real Supabase implementation)
  const vestShares = async (level: number, slotIndex: number, amount: number) => {
    if (!user) return

    try {
      setLoading(true)

      // Validate amount for level
      const validation = validateVestingAmount(amount, level)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // Get the specific schedule to update
      const levelSchedules = getVestingSlotsForLevel(level)
      if (slotIndex >= levelSchedules.length) {
        throw new Error("Invalid slot index")
      }

      const schedule = levelSchedules[slotIndex]
      if (schedule.status !== "Unclaimed") {
        throw new Error("Slot is not available for vesting")
      }

      // Update the vesting schedule in Supabase
      const { error: updateError } = await supabase
        .from("vesting_schedules")
        .update({
          status: "Active",
          shares_amount: amount,
          start_date: new Date().toISOString(),
        })
        .eq("id", schedule.id)

      if (updateError) throw updateError

      // Transfer shares from hold_pre to locked state (handled by vesting system)
      const { error: transferError } = await supabase.rpc("transfer_shares", {
        p_user_uuid: user.id,
        p_from_wallet: "hold_pre",
        p_to_wallet: "vesting_locked",
        p_shares: amount,
        p_description: `Vested ${amount} shares in ${VESTING_LEVELS[level as keyof typeof VESTING_LEVELS].name} slot`,
      })

      if (transferError) throw transferError

      await refreshVestingData()
      console.log(`Vested ${amount} shares in level ${level} slot ${slotIndex + 1}`)
    } catch (error: any) {
      console.error("Error vesting shares:", error)
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Claim shares function (real Supabase implementation)
  const claimShares = async (level: number, slotIndex: number) => {
    if (!user) return

    try {
      setLoading(true)

      const levelSchedules = getVestingSlotsForLevel(level)
      if (slotIndex >= levelSchedules.length) {
        throw new Error("Invalid slot index")
      }

      const schedule = levelSchedules[slotIndex]
      if (schedule.status !== "Completed" || !schedule.shares_amount) {
        throw new Error("Slot is not ready for claiming")
      }

      // Update the vesting schedule status
      const { error: updateError } = await supabase
        .from("vesting_schedules")
        .update({
          status: "Claimed",
          completion_date: new Date().toISOString(),
        })
        .eq("id", schedule.id)

      if (updateError) throw updateError

      // Transfer shares to hold_post wallet
      const { error: transferError } = await supabase.rpc("transfer_shares", {
        p_user_uuid: user.id,
        p_from_wallet: "vesting_locked",
        p_to_wallet: "hold_post",
        p_shares: schedule.shares_amount,
        p_description: `Claimed ${schedule.shares_amount} shares from ${VESTING_LEVELS[level as keyof typeof VESTING_LEVELS].name} slot`,
      })

      if (transferError) throw transferError

      await refreshVestingData()
      console.log(`Claimed ${schedule.shares_amount} shares from level ${level} slot ${slotIndex + 1}`)
    } catch (error: any) {
      console.error("Error claiming shares:", error)
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Get total shares currently vesting
  const getTotalVestingInProgress = () => {
    return vestingSchedules
      .filter((schedule) => schedule.status === "Active")
      .reduce((total, schedule) => total + (schedule.shares_amount || 0), 0)
  }

  // Get total claimable shares
  const getTotalClaimableShares = () => {
    return vestingSchedules
      .filter((schedule) => schedule.status === "Completed")
      .reduce((total, schedule) => total + (schedule.shares_amount || 0), 0)
  }

  // Legacy helpers for backward compatibility
  const getSchedulesByLevel = (level: number) => getVestingSlotsForLevel(level)
  const getScheduleById = (id: string) => vestingSchedules.find((s) => s.id === id)

  // Context value
  const value = {
    getVestingSlotsForLevel,
    vestShares,
    claimShares,
    getTotalVestingInProgress,
    getTotalClaimableShares,
    validateVestingAmount,
    getHoldPeriodForLevel,
    refreshVestingData,
    // legacy
    getSchedulesByLevel,
    getScheduleById,
    loading,
    error,
  }

  return <VestingContext.Provider value={value}>{children}</VestingContext.Provider>
}

// Custom hook to use the vesting context
export function useVesting() {
  const context = useContext(VestingContext)
  if (context === undefined) {
    throw new Error("useVesting must be used within a VestingProvider")
  }
  return context
}
