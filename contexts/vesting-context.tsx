"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"

// Define the simplified vesting schedule state
export type VestingSlotData = {
  id: string
  status: "empty" | "in_progress" | "claimable"
  startDate?: number
  amount?: number
  progress?: number
  level?: number
}

// Define vesting levels with their limits and hold periods
export const VESTING_LEVELS = {
  1: { name: "Retail", min: 1, max: 50, holdDays: 5 },
  2: { name: "Small Business", min: 51, max: 500, holdDays: 30 },
  3: { name: "Corporate", min: 501, max: Number.POSITIVE_INFINITY, holdDays: 90 },
}

// Define the context type
type VestingContextType = {
  vestingSlots: VestingSlotData[]
  vestShares: (slotIndex: number, amount: number, level: number) => Promise<void>
  claimShares: (slotIndex: number) => Promise<void>
  getTotalVestingInProgress: () => number
  getTotalClaimableShares: () => number
  getSchedulesByLevel: (level: number) => VestingSlotData[]
  getScheduleById: (id: string) => VestingSlotData | undefined
  validateVestingAmount: (amount: number, level: number) => { valid: boolean; error?: string }
  getHoldPeriodForLevel: (level: number) => number
  loading: boolean
}

// Create the context
const VestingContext = createContext<VestingContextType | undefined>(undefined)

// Static mock data for testing - now with 6 slots showing different levels
const mockVestingSlots: VestingSlotData[] = [
  {
    id: "slot-1",
    status: "in_progress",
    startDate: Date.now() - 2 * 24 * 60 * 60 * 1000, // Started 2 days ago
    amount: 25,
    progress: 40,
    level: 1, // Retail - 5 days
  },
  {
    id: "slot-2",
    status: "in_progress",
    startDate: Date.now() - 10 * 24 * 60 * 60 * 1000, // Started 10 days ago
    amount: 100,
    progress: 33,
    level: 2, // Small Business - 30 days
  },
  {
    id: "slot-3",
    status: "in_progress",
    startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // Started 30 days ago
    amount: 750,
    progress: 33,
    level: 3, // Corporate - 90 days
  },
  {
    id: "slot-4",
    status: "claimable",
    startDate: Date.now() - 5 * 24 * 60 * 60 * 1000, // Completed 5 days ago
    amount: 15,
    progress: 100,
    level: 1, // Retail - 5 days (completed)
  },
  {
    id: "slot-5",
    status: "claimable",
    startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // Completed 30 days ago
    amount: 200,
    progress: 100,
    level: 2, // Small Business - 30 days (completed)
  },
  {
    id: "slot-6",
    status: "empty",
  },
]

// Provider component
export function VestingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  // State for vesting slots (using mock data)
  const [vestingSlots, setVestingSlots] = useState<VestingSlotData[]>(mockVestingSlots)
  const [loading, setLoading] = useState(false)

  // Get hold period for a specific level
  const getHoldPeriodForLevel = (level: number): number => {
    const levelConfig = VESTING_LEVELS[level as keyof typeof VESTING_LEVELS]
    return levelConfig ? levelConfig.holdDays : 5 // Default to 5 days
  }

  // Update progress of active vesting slots
  useEffect(() => {
    const interval = setInterval(() => {
      setVestingSlots((prevSlots) => {
        return prevSlots.map((slot) => {
          if (slot.status === "in_progress" && slot.startDate && slot.level) {
            const elapsed = Date.now() - slot.startDate
            const holdDays = getHoldPeriodForLevel(slot.level)
            const totalTime = holdDays * 24 * 60 * 60 * 1000 // Convert days to milliseconds
            const newProgress = Math.min(100, (elapsed / totalTime) * 100)

            // If progress reaches 100%, mark as claimable
            if (newProgress >= 100) {
              return {
                ...slot,
                status: "claimable" as const,
                progress: 100,
              }
            }

            return {
              ...slot,
              progress: newProgress,
            }
          }
          return slot
        })
      })
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [])

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

  // Vest shares function (mock implementation)
  const vestShares = async (slotIndex: number, amount: number, level: number) => {
    if (!user || slotIndex < 0 || slotIndex >= 6) return

    try {
      setLoading(true)

      // Check if slot is empty
      if (vestingSlots[slotIndex].status !== "empty") {
        throw new Error("Slot is not empty")
      }

      // Validate amount for level
      const validation = validateVestingAmount(amount, level)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // Update the slot
      setVestingSlots((prevSlots) => {
        const newSlots = [...prevSlots]
        newSlots[slotIndex] = {
          id: `slot-${slotIndex + 1}`,
          status: "in_progress",
          startDate: Date.now(),
          amount: amount,
          progress: 0,
          level: level,
        }
        return newSlots
      })

      const levelConfig = VESTING_LEVELS[level as keyof typeof VESTING_LEVELS]
      console.log(
        `Mock: Vested ${amount} shares in slot ${slotIndex + 1} at ${levelConfig.name} level (${levelConfig.holdDays} days)`,
      )
    } catch (error) {
      console.error("Error vesting shares:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Claim shares function (mock implementation)
  const claimShares = async (slotIndex: number) => {
    if (!user || slotIndex < 0 || slotIndex >= 6) return

    try {
      setLoading(true)

      const slot = vestingSlots[slotIndex]
      if (slot.status !== "claimable" || !slot.amount) {
        throw new Error("Slot is not claimable")
      }

      // Reset the slot to empty
      setVestingSlots((prevSlots) => {
        const newSlots = [...prevSlots]
        newSlots[slotIndex] = {
          id: `slot-${slotIndex + 1}`,
          status: "empty",
        }
        return newSlots
      })

      console.log(`Mock: Claimed ${slot.amount} shares from slot ${slotIndex + 1}`)
    } catch (error) {
      console.error("Error claiming shares:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Get total shares currently vesting
  const getTotalVestingInProgress = () => {
    return vestingSlots
      .filter((slot) => slot.status === "in_progress")
      .reduce((total, slot) => total + (slot.amount || 0), 0)
  }

  // Get total claimable shares
  const getTotalClaimableShares = () => {
    return vestingSlots
      .filter((slot) => slot.status === "claimable")
      .reduce((total, slot) => total + (slot.amount || 0), 0)
  }

  // Legacy helpers kept for backward compatibility
  const getSchedulesByLevel = (_level: number) => []
  const getScheduleById = (_id: string) => undefined

  // Context value
  const value = {
    vestingSlots,
    vestShares,
    claimShares,
    getTotalVestingInProgress,
    getTotalClaimableShares,
    validateVestingAmount,
    getHoldPeriodForLevel,
    // legacy
    getSchedulesByLevel,
    getScheduleById,
    loading,
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
