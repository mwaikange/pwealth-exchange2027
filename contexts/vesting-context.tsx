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
  getVestingSlotsForLevel: (level: number) => VestingSlotData[]
  vestShares: (level: number, slotIndex: number, amount: number) => Promise<void>
  claimShares: (level: number, slotIndex: number) => Promise<void>
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

// Provider component
export function VestingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  // Separate slots for each level - 6 slots per level = 18 total
  const [retailSlots, setRetailSlots] = useState<VestingSlotData[]>([])
  const [smallBusinessSlots, setSmallBusinessSlots] = useState<VestingSlotData[]>([])
  const [corporateSlots, setCorporateSlots] = useState<VestingSlotData[]>([])
  const [loading, setLoading] = useState(false)

  // Initialize slots for each level
  useEffect(() => {
    // Retail slots (Level 1) - 6 slots
    const initRetailSlots: VestingSlotData[] = [
      {
        id: "retail-slot-1",
        status: "in_progress",
        startDate: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
        amount: 25,
        progress: 40,
        level: 1,
      },
      {
        id: "retail-slot-2",
        status: "claimable",
        startDate: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago (completed)
        amount: 15,
        progress: 100,
        level: 1,
      },
      { id: "retail-slot-3", status: "empty", level: 1 },
      { id: "retail-slot-4", status: "empty", level: 1 },
      { id: "retail-slot-5", status: "empty", level: 1 },
      { id: "retail-slot-6", status: "empty", level: 1 },
    ]

    // Small Business slots (Level 2) - 6 slots
    const initSmallBusinessSlots: VestingSlotData[] = [
      {
        id: "smallbiz-slot-1",
        status: "in_progress",
        startDate: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
        amount: 100,
        progress: 33,
        level: 2,
      },
      {
        id: "smallbiz-slot-2",
        status: "claimable",
        startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago (completed)
        amount: 200,
        progress: 100,
        level: 2,
      },
      { id: "smallbiz-slot-3", status: "empty", level: 2 },
      { id: "smallbiz-slot-4", status: "empty", level: 2 },
      { id: "smallbiz-slot-5", status: "empty", level: 2 },
      { id: "smallbiz-slot-6", status: "empty", level: 2 },
    ]

    // Corporate slots (Level 3) - 6 slots
    const initCorporateSlots: VestingSlotData[] = [
      {
        id: "corporate-slot-1",
        status: "in_progress",
        startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
        amount: 750,
        progress: 33,
        level: 3,
      },
      { id: "corporate-slot-2", status: "empty", level: 3 },
      { id: "corporate-slot-3", status: "empty", level: 3 },
      { id: "corporate-slot-4", status: "empty", level: 3 },
      { id: "corporate-slot-5", status: "empty", level: 3 },
      { id: "corporate-slot-6", status: "empty", level: 3 },
    ]

    setRetailSlots(initRetailSlots)
    setSmallBusinessSlots(initSmallBusinessSlots)
    setCorporateSlots(initCorporateSlots)
  }, [])

  // Get hold period for a specific level
  const getHoldPeriodForLevel = (level: number): number => {
    const levelConfig = VESTING_LEVELS[level as keyof typeof VESTING_LEVELS]
    return levelConfig ? levelConfig.holdDays : 5 // Default to 5 days
  }

  // Get slots for a specific level
  const getVestingSlotsForLevel = (level: number): VestingSlotData[] => {
    switch (level) {
      case 1:
        return retailSlots
      case 2:
        return smallBusinessSlots
      case 3:
        return corporateSlots
      default:
        return []
    }
  }

  // Get setter function for a specific level
  const getSlotSetter = (level: number) => {
    switch (level) {
      case 1:
        return setRetailSlots
      case 2:
        return setSmallBusinessSlots
      case 3:
        return setCorporateSlots
      default:
        return setRetailSlots
    }
  }

  // Update progress of active vesting slots for all levels
  useEffect(() => {
    const interval = setInterval(() => {
      const updateSlots = (slots: VestingSlotData[], level: number) => {
        return slots.map((slot) => {
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
      }

      setRetailSlots((prev) => updateSlots(prev, 1))
      setSmallBusinessSlots((prev) => updateSlots(prev, 2))
      setCorporateSlots((prev) => updateSlots(prev, 3))
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
  const vestShares = async (level: number, slotIndex: number, amount: number) => {
    if (!user || slotIndex < 0 || slotIndex >= 6) return

    try {
      setLoading(true)

      const slots = getVestingSlotsForLevel(level)
      const setSlots = getSlotSetter(level)

      // Check if slot is empty
      if (slots[slotIndex].status !== "empty") {
        throw new Error("Slot is not empty")
      }

      // Validate amount for level
      const validation = validateVestingAmount(amount, level)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // Update the slot
      setSlots((prevSlots) => {
        const newSlots = [...prevSlots]
        newSlots[slotIndex] = {
          id: `${level === 1 ? "retail" : level === 2 ? "smallbiz" : "corporate"}-slot-${slotIndex + 1}`,
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
        `Mock: Vested ${amount} shares in ${levelConfig.name} slot ${slotIndex + 1} (${levelConfig.holdDays} days)`,
      )
    } catch (error) {
      console.error("Error vesting shares:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Claim shares function (mock implementation)
  const claimShares = async (level: number, slotIndex: number) => {
    if (!user || slotIndex < 0 || slotIndex >= 6) return

    try {
      setLoading(true)

      const slots = getVestingSlotsForLevel(level)
      const setSlots = getSlotSetter(level)
      const slot = slots[slotIndex]

      if (slot.status !== "claimable" || !slot.amount) {
        throw new Error("Slot is not claimable")
      }

      // Reset the slot to empty
      setSlots((prevSlots) => {
        const newSlots = [...prevSlots]
        newSlots[slotIndex] = {
          id: `${level === 1 ? "retail" : level === 2 ? "smallbiz" : "corporate"}-slot-${slotIndex + 1}`,
          status: "empty",
          level: level,
        }
        return newSlots
      })

      console.log(
        `Mock: Claimed ${slot.amount} shares from ${VESTING_LEVELS[level as keyof typeof VESTING_LEVELS].name} slot ${slotIndex + 1}`,
      )
    } catch (error) {
      console.error("Error claiming shares:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Get total shares currently vesting across all levels
  const getTotalVestingInProgress = () => {
    const allSlots = [...retailSlots, ...smallBusinessSlots, ...corporateSlots]
    return allSlots
      .filter((slot) => slot.status === "in_progress")
      .reduce((total, slot) => total + (slot.amount || 0), 0)
  }

  // Get total claimable shares across all levels
  const getTotalClaimableShares = () => {
    const allSlots = [...retailSlots, ...smallBusinessSlots, ...corporateSlots]
    return allSlots.filter((slot) => slot.status === "claimable").reduce((total, slot) => total + (slot.amount || 0), 0)
  }

  // Legacy helpers kept for backward compatibility
  const getSchedulesByLevel = (_level: number) => []
  const getScheduleById = (_id: string) => undefined

  // Context value
  const value = {
    getVestingSlotsForLevel,
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
