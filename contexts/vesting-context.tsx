"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"

// Define the vesting schedule state - keeping it compatible with both old and new systems
export type VestingSlotData = {
  id: string
  user_uuid: string
  level: number
  slot_position?: string // For new system
  position?: string // For old system compatibility
  activated?: boolean // For new system
  invested?: boolean // For new system
  claimed?: boolean // For new system
  status?: "Unclaimed" | "Active" | "Completed" | "Claimed" // For old system
  shares_amount?: number
  progress?: number
  start_time?: string
  start_date?: string // For old system compatibility
  completion_date?: string
  level_rank?: number
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
  initializeUserSlots: () => Promise<void>
  loading: boolean
  error: string | null
}

// Create the context
const VestingContext = createContext<VestingContextType | undefined>(undefined)

// Provider component
export function VestingProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth()
  const [vestingSlots, setVestingSlots] = useState<VestingSlotData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingNewSystem, setUsingNewSystem] = useState(false)

  // Check which vesting system is available
  const checkVestingSystem = async () => {
    try {
      // Try to query the new pivot_vesting table
      const { error: newSystemError } = await supabase.from("pivot_vesting").select("id").limit(1)

      if (!newSystemError) {
        console.log("✅ Using new pivot_vesting system")
        setUsingNewSystem(true)
        return true
      }

      // Fall back to old vesting_schedules table
      const { error: oldSystemError } = await supabase.from("vesting_schedules").select("id").limit(1)

      if (!oldSystemError) {
        console.log("⚠️ Using legacy vesting_schedules system")
        setUsingNewSystem(false)
        return false
      }

      throw new Error("No vesting system available")
    } catch (err: any) {
      console.error("Error checking vesting system:", err)
      throw err
    }
  }

  // Initialize user vesting slots (new system only)
  const initializeUserSlots = async () => {
    if (!user || !usingNewSystem) return

    try {
      console.log("🔧 Initializing vesting slots for user:", user.id)
      const { error } = await supabase.rpc("initialize_user_vesting_slots", {
        p_user_uuid: user.id,
      })

      if (error) {
        console.error("Error initializing vesting slots:", error)
        throw error
      }

      console.log("✅ Vesting slots initialized successfully")
      await refreshVestingData()
    } catch (err: any) {
      console.error("Failed to initialize vesting slots:", err)
      setError(err.message)
    }
  }

  // Fetch vesting data from appropriate table
  const refreshVestingData = async () => {
    if (!user || !session) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Check which system to use
      const isNewSystem = await checkVestingSystem()

      if (isNewSystem) {
        // Use new pivot_vesting table
        console.log("🔄 Fetching vesting data from pivot_vesting table...")

        const { data, error: fetchError } = await supabase
          .from("pivot_vesting")
          .select("*")
          .eq("user_uuid", user.id)
          .order("level", { ascending: true })
          .order("level_rank", { ascending: true })

        if (fetchError) {
          throw new Error(`Failed to fetch vesting data: ${fetchError.message}`)
        }

        // If no slots exist, initialize them
        if (!data || data.length === 0) {
          console.log("No vesting slots found, initializing...")
          await initializeUserSlots()
          return
        }

        // Process the data for new system
        const processedData = data.map((slot) => {
          let progress = slot.progress || 0

          if (slot.activated && slot.invested && !slot.claimed && slot.start_time) {
            const startDate = new Date(slot.start_time)
            const now = new Date()
            const elapsed = now.getTime() - startDate.getTime()
            const holdDays = getHoldPeriodForLevel(slot.level)
            const totalTime = holdDays * 24 * 60 * 60 * 1000
            progress = Math.min(100, (elapsed / totalTime) * 100)
          }

          return {
            ...slot,
            progress: Math.floor(progress),
          }
        })

        setVestingSlots(processedData)
      } else {
        // Use legacy vesting_schedules table
        console.log("🔄 Fetching vesting data from vesting_schedules table...")

        const { data, error: fetchError } = await supabase
          .from("vesting_schedules")
          .select("*")
          .eq("user_uuid", user.id)
          .order("schedule_id", { ascending: true })

        if (fetchError) {
          throw new Error(`Failed to fetch vesting data: ${fetchError.message}`)
        }

        // Process the data for legacy system
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
            level: Number.parseInt(schedule.level),
            progress,
          }
        })

        setVestingSlots(processedData)
      }

      console.log("✅ Vesting data refreshed:", vestingSlots.length, "slots")
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
      setVestingSlots((prev) =>
        prev.map((slot) => {
          const isActive = usingNewSystem ? slot.activated && slot.invested && !slot.claimed : slot.status === "Active"

          const startTime = slot.start_time || slot.start_date

          if (isActive && startTime) {
            const startDate = new Date(startTime)
            const now = new Date()
            const elapsed = now.getTime() - startDate.getTime()
            const holdDays = getHoldPeriodForLevel(slot.level)
            const totalTime = holdDays * 24 * 60 * 60 * 1000
            const newProgress = Math.min(100, (elapsed / totalTime) * 100)

            return {
              ...slot,
              progress: Math.floor(newProgress),
            }
          }
          return slot
        }),
      )
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [usingNewSystem])

  // Get hold period for a specific level
  const getHoldPeriodForLevel = (level: number): number => {
    const levelConfig = VESTING_LEVELS[level as keyof typeof VESTING_LEVELS]
    return levelConfig ? levelConfig.holdDays : 5 // Default to 5 days
  }

  // Get slots for a specific level (6 slots per level)
  const getVestingSlotsForLevel = (level: number): VestingSlotData[] => {
    return vestingSlots.filter((slot) => slot.level === level).slice(0, 6) // Limit to 6 slots per level
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

  // Vest shares function - works with both systems
  const vestShares = async (level: number, slotIndex: number, amount: number) => {
    if (!user) return

    try {
      setLoading(true)

      // Validate amount for level
      const validation = validateVestingAmount(amount, level)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // Get the specific slot to update
      const levelSlots = getVestingSlotsForLevel(level)
      if (slotIndex >= levelSlots.length) {
        throw new Error("Invalid slot index")
      }

      const slot = levelSlots[slotIndex]

      if (usingNewSystem) {
        // New system logic
        if (slot.activated || slot.invested) {
          throw new Error("Slot is not available for vesting")
        }

        console.log(`🔄 Vesting ${amount} shares in level ${level} slot ${slot.slot_position}`)

        // Use the vest_shares_in_slot function
        const { error: vestError } = await supabase.rpc("vest_shares_in_slot", {
          p_user_uuid: user.id,
          p_level: level,
          p_slot_position: slot.slot_position,
          p_shares_amount: amount,
        })

        if (vestError) throw vestError
      } else {
        // Legacy system logic
        if (slot.status !== "Unclaimed") {
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
          .eq("id", slot.id)

        if (updateError) throw updateError
      }

      // Transfer shares from hold_pre to locked state (works for both systems)
      const { error: transferError } = await supabase.rpc("transfer_shares", {
        p_user_uuid: user.id,
        p_from_wallet: "hold_wallet_pre_hold",
        p_to_wallet: "vesting_locked",
        p_shares: amount,
        p_description: `Vested ${amount} shares in ${VESTING_LEVELS[level as keyof typeof VESTING_LEVELS].name} slot`,
      })

      if (transferError) throw transferError

      await refreshVestingData()
      console.log(`✅ Vested ${amount} shares in level ${level} slot ${slotIndex + 1}`)
    } catch (error: any) {
      console.error("Error vesting shares:", error)
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Claim shares function - works with both systems
  const claimShares = async (level: number, slotIndex: number) => {
    if (!user) return

    try {
      setLoading(true)

      const levelSlots = getVestingSlotsForLevel(level)
      if (slotIndex >= levelSlots.length) {
        throw new Error("Invalid slot index")
      }

      const slot = levelSlots[slotIndex]
      let sharesToClaim = 0

      if (usingNewSystem) {
        // New system logic
        if (!slot.activated || !slot.invested || slot.claimed || (slot.progress || 0) < 100) {
          throw new Error("Slot is not ready for claiming")
        }

        console.log(`🔄 Claiming shares from level ${level} slot ${slot.slot_position}`)

        // Use the claim_shares_from_slot function
        const { data: claimedShares, error: claimError } = await supabase.rpc("claim_shares_from_slot", {
          p_user_uuid: user.id,
          p_level: level,
          p_slot_position: slot.slot_position,
        })

        if (claimError) throw claimError
        sharesToClaim = claimedShares
      } else {
        // Legacy system logic
        if (slot.status !== "Completed" || !slot.shares_amount) {
          throw new Error("Slot is not ready for claiming")
        }

        sharesToClaim = slot.shares_amount

        // Update the vesting schedule status
        const { error: updateError } = await supabase
          .from("vesting_schedules")
          .update({
            status: "Claimed",
            completion_date: new Date().toISOString(),
          })
          .eq("id", slot.id)

        if (updateError) throw updateError
      }

      // Transfer shares to hold_post wallet (works for both systems)
      const { error: transferError } = await supabase.rpc("transfer_shares", {
        p_user_uuid: user.id,
        p_from_wallet: "vesting_locked",
        p_to_wallet: "hold_wallet_post_hold",
        p_shares: sharesToClaim,
        p_description: `Claimed ${sharesToClaim} shares from ${VESTING_LEVELS[level as keyof typeof VESTING_LEVELS].name} slot`,
      })

      if (transferError) throw transferError

      await refreshVestingData()
      console.log(`✅ Claimed ${sharesToClaim} shares from level ${level} slot ${slotIndex + 1}`)
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
    if (usingNewSystem) {
      return vestingSlots
        .filter((slot) => slot.activated && slot.invested && !slot.claimed)
        .reduce((total, slot) => total + (slot.shares_amount || 0), 0)
    } else {
      return vestingSlots
        .filter((slot) => slot.status === "Active")
        .reduce((total, slot) => total + (slot.shares_amount || 0), 0)
    }
  }

  // Get total claimable shares
  const getTotalClaimableShares = () => {
    if (usingNewSystem) {
      return vestingSlots
        .filter((slot) => slot.activated && slot.invested && !slot.claimed && (slot.progress || 0) >= 100)
        .reduce((total, slot) => total + (slot.shares_amount || 0), 0)
    } else {
      return vestingSlots
        .filter((slot) => slot.status === "Completed")
        .reduce((total, slot) => total + (slot.shares_amount || 0), 0)
    }
  }

  // Legacy helpers for backward compatibility
  const getSchedulesByLevel = (level: number) => getVestingSlotsForLevel(level)
  const getScheduleById = (id: string) => vestingSlots.find((s) => s.id === id)

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
    initializeUserSlots,
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
