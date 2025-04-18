// Create a new context file for vesting schedules

"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useWallet } from "./wallet-context"
import { useTransactions } from "./transaction-context"

// Define the vesting schedule state
export type VestingScheduleState = {
  id: string
  level: number
  position: string // A, B, C, D, E
  color: string
  activated: boolean
  invested: boolean
  claimed: boolean
  progress: number
  startTime: number | null
  lastClaimTime: number | null
  lastClaimPercentage: number
  prematurelyClaimed: boolean
}

// Define the context type
type VestingContextType = {
  vestingSchedules: VestingScheduleState[]
  activateSchedule: (scheduleId: string) => void
  investInSchedule: (scheduleId: string) => void
  claimSchedule: (scheduleId: string) => void
  getScheduleById: (scheduleId: string) => VestingScheduleState | undefined
  getSchedulesByLevel: (level: number) => VestingScheduleState[]
  resetAllSchedulesInLevel: (level: number) => void
}

// Create the context
const VestingContext = createContext<VestingContextType | undefined>(undefined)

// Initial vesting schedules
const createInitialVestingSchedules = (): VestingScheduleState[] => {
  const schedules: VestingScheduleState[] = []

  // Create schedules for each level (1, 2, 3) and position (A, B, C, D, E)
  for (let level = 1; level <= 3; level++) {
    for (const position of ["A", "B", "C", "D", "E"]) {
      const colors = {
        A: "green-500",
        B: "blue-500",
        C: "pink-500",
        D: "yellow-500",
        E: "red-500",
      }

      schedules.push({
        id: `LEVEL${level}-${position}`,
        level,
        position,
        color: colors[position as keyof typeof colors],
        activated: false,
        invested: false,
        claimed: false,
        progress: 0,
        startTime: null,
        lastClaimTime: null,
        lastClaimPercentage: 0,
        prematurelyClaimed: false,
      })
    }
  }

  return schedules
}

// Provider component
export function VestingProvider({ children }: { children: React.ReactNode }) {
  const { updatePwtInvestBalance, updatePwtCashoutBalance, updateAftBalance } = useWallet()
  const { addTransaction } = useTransactions()

  // State for vesting schedules
  const [vestingSchedules, setVestingSchedules] = useState<VestingScheduleState[]>(() => {
    // Try to load from localStorage first
    if (typeof window !== "undefined") {
      const savedSchedules = localStorage.getItem("vestingSchedules")
      if (savedSchedules) {
        try {
          return JSON.parse(savedSchedules)
        } catch (error) {
          console.error("Failed to parse saved vesting schedules:", error)
        }
      }
    }
    return createInitialVestingSchedules()
  })

  // Save to localStorage whenever schedules change
  useEffect(() => {
    localStorage.setItem("vestingSchedules", JSON.stringify(vestingSchedules))
  }, [vestingSchedules])

  // Update progress of active schedules
  useEffect(() => {
    const interval = setInterval(() => {
      setVestingSchedules((prevSchedules) => {
        const updatedSchedules = [...prevSchedules]
        let changed = false

        updatedSchedules.forEach((schedule) => {
          if (schedule.invested && schedule.startTime && !schedule.claimed) {
            const elapsedTime = Date.now() - schedule.startTime
            // For testing: 10 minutes to reach 100%
            const totalTime = 10 * 60 * 1000
            const newProgress = Math.min(100, Math.floor((elapsedTime / totalTime) * 100))

            if (newProgress !== schedule.progress) {
              schedule.progress = newProgress
              changed = true
            }
          }
        })

        return changed ? updatedSchedules : prevSchedules
      })
    }, 1000) // Check every second

    return () => clearInterval(interval)
  }, [])

  // Check if all schedules in a level are completed
  useEffect(() => {
    const checkLevelCompletion = () => {
      for (let level = 1; level <= 3; level++) {
        const levelSchedules = vestingSchedules.filter((s) => s.level === level)
        const allCompleted = levelSchedules.every((s) => s.claimed)

        if (allCompleted && levelSchedules.length > 0) {
          // Set a timeout to reset all schedules in this level
          setTimeout(() => {
            resetAllSchedulesInLevel(level)
          }, 5000) // 5 seconds
        }
      }
    }

    checkLevelCompletion()
  }, [vestingSchedules])

  // Get activation cost based on level
  const getActivationCost = (level: number): number => {
    switch (level) {
      case 1:
        return 2
      case 2:
        return 4
      case 3:
        return 8
      default:
        return 2
    }
  }

  // Get investment cost based on level
  const getInvestmentCost = (level: number): number => {
    switch (level) {
      case 1:
        return 2
      case 2:
        return 4
      case 3:
        return 8
      default:
        return 2
    }
  }

  // Calculate reward based on level and progress
  const calculateReward = (level: number, progress: number): number => {
    let baseReward = 0

    if (progress >= 20) baseReward = 2
    if (progress >= 40) baseReward = 4
    if (progress >= 60) baseReward = 6
    if (progress >= 80) baseReward = 8
    if (progress >= 100) baseReward = 10

    // Multiply by level factor
    const levelMultiplier = level === 1 ? 1 : level === 2 ? 2 : 4
    return baseReward * levelMultiplier
  }

  // Activate a schedule
  const activateSchedule = (scheduleId: string) => {
    const scheduleIndex = vestingSchedules.findIndex((s) => s.id === scheduleId)
    if (scheduleIndex === -1) return

    const schedule = vestingSchedules[scheduleIndex]
    if (schedule.activated) return

    const activationCost = getActivationCost(schedule.level)

    // Update schedule first
    setVestingSchedules((prevSchedules) => {
      const updatedSchedules = [...prevSchedules]
      updatedSchedules[scheduleIndex] = {
        ...schedule,
        activated: true,
      }
      return updatedSchedules
    })

    // Then update wallet and add transaction
    setTimeout(() => {
      updateAftBalance(activationCost, "subtract")
      addTransaction({
        type: "ACTIVATE FEE",
        account: "AFT Wallet",
        amount: activationCost,
        amountUsd: activationCost,
        description: `ACTIVATE FEE -${scheduleId}`,
      })
    }, 0)
  }

  // Invest in a schedule
  const investInSchedule = (scheduleId: string) => {
    const scheduleIndex = vestingSchedules.findIndex((s) => s.id === scheduleId)
    if (scheduleIndex === -1) return

    const schedule = vestingSchedules[scheduleIndex]
    if (!schedule.activated || schedule.invested) return

    const investmentCost = getInvestmentCost(schedule.level)

    // Update schedule first
    setVestingSchedules((prevSchedules) => {
      const updatedSchedules = [...prevSchedules]
      updatedSchedules[scheduleIndex] = {
        ...schedule,
        invested: true,
        startTime: Date.now(),
      }
      return updatedSchedules
    })

    // Then update wallet and add transaction
    setTimeout(() => {
      updatePwtInvestBalance(investmentCost, "subtract")
      addTransaction({
        type: "VESTING",
        account: "PWT Invest",
        amount: investmentCost,
        amountUsd: investmentCost * 10,
        description: `VESTING - ${scheduleId}`,
      })
    }, 0)
  }

  // Claim rewards from a schedule
  const claimSchedule = (scheduleId: string) => {
    const scheduleIndex = vestingSchedules.findIndex((s) => s.id === scheduleId)
    if (scheduleIndex === -1) return

    const schedule = vestingSchedules[scheduleIndex]
    if (!schedule.invested || schedule.claimed) return

    // Check if progress is at least 20%
    if (schedule.progress < 20) return

    // Calculate reward based on progress and level
    const reward = calculateReward(schedule.level, schedule.progress)
    const previousClaim = calculateReward(schedule.level, schedule.lastClaimPercentage)
    const netReward = reward - previousClaim

    // Check if this is a premature claim (before 100%)
    const isPremature = schedule.progress < 100

    // Update schedule first
    setVestingSchedules((prevSchedules) => {
      const updatedSchedules = [...prevSchedules]
      updatedSchedules[scheduleIndex] = {
        ...schedule,
        claimed: true,
        lastClaimTime: Date.now(),
        lastClaimPercentage: schedule.progress,
        prematurelyClaimed: isPremature,
      }
      return updatedSchedules
    })

    // Then update wallet and add transaction
    setTimeout(() => {
      updatePwtCashoutBalance(netReward, "add")
      addTransaction({
        type: "CLAIM",
        account: "PWT Cashout",
        amount: netReward,
        amountUsd: netReward * 10,
        description: `CLAIM - ${scheduleId}`,
      })
    }, 0)
  }

  // Get a schedule by ID
  const getScheduleById = (scheduleId: string) => {
    return vestingSchedules.find((s) => s.id === scheduleId)
  }

  // Get schedules by level
  const getSchedulesByLevel = (level: number) => {
    return vestingSchedules.filter((s) => s.level === level)
  }

  // Reset all schedules in a level
  const resetAllSchedulesInLevel = (level: number) => {
    setVestingSchedules((prevSchedules) => {
      return prevSchedules.map((schedule) => {
        if (schedule.level === level) {
          return {
            ...schedule,
            activated: false,
            invested: false,
            claimed: false,
            progress: 0,
            startTime: null,
            lastClaimTime: null,
            lastClaimPercentage: 0,
            prematurelyClaimed: false,
          }
        }
        return schedule
      })
    })
  }

  // Context value
  const value = {
    vestingSchedules,
    activateSchedule,
    investInSchedule,
    claimSchedule,
    getScheduleById,
    getSchedulesByLevel,
    resetAllSchedulesInLevel,
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
