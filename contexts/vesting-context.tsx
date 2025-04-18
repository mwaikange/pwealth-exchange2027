"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useWallet } from "./wallet-context"
import { useTransactions } from "./transaction-context"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { v4 as uuidv4 } from "uuid"

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
  schedule_id?: string // Supabase ID
}

// Define the context type
type VestingContextType = {
  vestingSchedules: VestingScheduleState[]
  activateSchedule: (scheduleId: string) => Promise<void>
  investInSchedule: (scheduleId: string) => Promise<void>
  claimSchedule: (scheduleId: string) => Promise<void>
  getScheduleById: (scheduleId: string) => VestingScheduleState | undefined
  getSchedulesByLevel: (level: number) => VestingScheduleState[]
  resetAllSchedulesInLevel: (level: number) => Promise<void>
  loading: boolean
}

// Create the context
const VestingContext = createContext<VestingContextType | undefined>(undefined)

// Colors for vesting schedules
const scheduleColors = {
  A: "green-500",
  B: "blue-500",
  C: "pink-500",
  D: "yellow-500",
  E: "red-500",
}

// Provider component
export function VestingProvider({ children }: { children: React.ReactNode }) {
  const { updatePwtInvestBalance, updatePwtCashoutBalance, updateAftBalance } = useWallet()
  const { addTransaction } = useTransactions()
  const { user } = useAuth()

  // State for vesting schedules
  const [vestingSchedules, setVestingSchedules] = useState<VestingScheduleState[]>([])
  const [loading, setLoading] = useState(true)

  // Load vesting schedules from Supabase
  async function fetchVestingSchedules() {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // First, check if the user has any vesting schedules
      const { data: existingSchedules, error: checkError } = await supabase
        .from("vesting_schedules")
        .select("*")
        .eq("user_uuid", user.id)

      if (checkError) {
        console.error("Error checking vesting schedules:", checkError)
        return
      }

      // If no schedules exist, create default ones
      if (!existingSchedules || existingSchedules.length === 0) {
        await createDefaultVestingSchedules(user.id)
      }

      // Fetch all schedules
      const { data, error } = await supabase
        .from("vesting_schedules")
        .select("*")
        .eq("user_uuid", user.id)
        .order("level", { ascending: true })
        .order("position", { ascending: true })

      if (error) {
        console.error("Error fetching vesting schedules:", error)
        return
      }

      if (data) {
        // Transform the data to match our VestingScheduleState interface
        const formattedSchedules: VestingScheduleState[] = data.map((schedule) => ({
          id: `LEVEL${schedule.level}-${schedule.position}`,
          level: schedule.level,
          position: schedule.position,
          color: scheduleColors[schedule.position as keyof typeof scheduleColors] || "gray-500",
          activated: schedule.activated,
          invested: schedule.invested,
          claimed: schedule.claimed,
          progress: schedule.progress,
          startTime: schedule.start_time ? new Date(schedule.start_time).getTime() : null,
          lastClaimTime: schedule.last_claim_time ? new Date(schedule.last_claim_time).getTime() : null,
          lastClaimPercentage: schedule.last_claim_percentage,
          prematurelyClaimed: schedule.prematurely_claimed,
          schedule_id: schedule.schedule_id,
        }))

        setVestingSchedules(formattedSchedules)
      }
    } catch (error) {
      console.error("Error in fetchVestingSchedules:", error)
    } finally {
      setLoading(false)
    }
  }

  // Create default vesting schedules for a new user
  const createDefaultVestingSchedules = async (userId: string) => {
    try {
      // First, verify the user exists in app_users
      const { data: userData, error: userError } = await supabase
        .from("app_users")
        .select("user_uuid")
        .eq("user_uuid", userId)
        .maybeSingle()

      if (userError || !userData) {
        console.error("User not found in app_users, cannot create vesting schedules")
        return
      }

      // Get the current authenticated user to ensure RLS compliance
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user || authData.user.id !== userId) {
        console.error("Auth user ID doesn't match the requested user ID")
        return
      }

      const schedules = []

      // Create schedules for each level (1, 2, 3) and position (A, B, C, D, E)
      for (let level = 1; level <= 3; level++) {
        for (const position of ["A", "B", "C", "D", "E"]) {
          schedules.push({
            schedule_id: uuidv4(),
            user_uuid: userId, // This must match auth.uid() for RLS
            level,
            position,
            activated: false,
            invested: false,
            claimed: false,
            progress: 0,
            start_time: null,
            last_claim_time: null,
            last_claim_percentage: 0,
            prematurely_claimed: false,
            created_at: new Date().toISOString(),
          })
        }
      }

      // Insert all schedules one by one to better handle errors
      for (const schedule of schedules) {
        const { error } = await supabase.from("vesting_schedules").insert(schedule)
        if (error) {
          console.error(`Error creating vesting schedule: ${error.message}`, schedule)
        }
      }
    } catch (error) {
      console.error("Error in createDefaultVestingSchedules:", error)
    }
  }

  // Update progress of active schedules
  useEffect(() => {
    if (loading || vestingSchedules.length === 0) return

    const interval = setInterval(async () => {
      let updatedSchedules = false
      const schedulesToUpdate = []

      // Create a copy of the current schedules
      const updatedSchedulesList = [...vestingSchedules]

      for (let i = 0; i < updatedSchedulesList.length; i++) {
        const schedule = updatedSchedulesList[i]

        if (schedule.invested && schedule.startTime && !schedule.claimed) {
          const elapsedTime = Date.now() - schedule.startTime
          // For testing: 10 minutes to reach 100%
          const totalTime = 10 * 60 * 1000
          const newProgress = Math.min(100, Math.floor((elapsedTime / totalTime) * 100))

          if (newProgress !== schedule.progress) {
            // Update local state
            updatedSchedulesList[i] = {
              ...schedule,
              progress: newProgress,
            }

            // Add to list of schedules to update in Supabase
            schedulesToUpdate.push({
              schedule_id: schedule.schedule_id,
              progress: newProgress,
            })

            updatedSchedules = true
          }
        }
      }

      // Update state if any schedules changed
      if (updatedSchedules) {
        setVestingSchedules(updatedSchedulesList)

        // Update Supabase in batches
        if (schedulesToUpdate.length > 0 && user) {
          try {
            for (const schedule of schedulesToUpdate) {
              await supabase
                .from("vesting_schedules")
                .update({ progress: schedule.progress })
                .eq("schedule_id", schedule.schedule_id)
            }
          } catch (error) {
            console.error("Error updating schedule progress:", error)
          }
        }
      }
    }, 1000) // Check every second

    return () => clearInterval(interval)
  }, [loading, vestingSchedules, user])

  // Check if all schedules in a level are completed
  useEffect(() => {
    if (loading || vestingSchedules.length === 0) return

    const checkLevelCompletion = async () => {
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
  }, [vestingSchedules, loading])

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
  const activateSchedule = async (scheduleId: string) => {
    if (!user) return

    const scheduleIndex = vestingSchedules.findIndex((s) => s.id === scheduleId)
    if (scheduleIndex === -1) return

    const schedule = vestingSchedules[scheduleIndex]
    if (schedule.activated) return

    const activationCost = getActivationCost(schedule.level)

    try {
      // Update schedule in Supabase
      const { error } = await supabase
        .from("vesting_schedules")
        .update({ activated: true })
        .eq("schedule_id", schedule.schedule_id)

      if (error) throw error

      // Update local state
      setVestingSchedules((prevSchedules) => {
        const updatedSchedules = [...prevSchedules]
        updatedSchedules[scheduleIndex] = {
          ...schedule,
          activated: true,
        }
        return updatedSchedules
      })

      // Update wallet balance
      await updateAftBalance(activationCost, "subtract")

      // Add transaction
      await addTransaction({
        type: "ACTIVATE FEE",
        account: "AFT Wallet",
        amount: activationCost,
        amountUsd: activationCost,
        description: `ACTIVATE FEE -${scheduleId}`,
      })
    } catch (error) {
      console.error("Error activating schedule:", error)
    }
  }

  // Invest in a schedule
  const investInSchedule = async (scheduleId: string) => {
    if (!user) return

    const scheduleIndex = vestingSchedules.findIndex((s) => s.id === scheduleId)
    if (scheduleIndex === -1) return

    const schedule = vestingSchedules[scheduleIndex]
    if (!schedule.activated || schedule.invested) return

    const investmentCost = getInvestmentCost(schedule.level)
    const startTime = new Date()

    try {
      // Update schedule in Supabase
      const { error } = await supabase
        .from("vesting_schedules")
        .update({
          invested: true,
          start_time: startTime.toISOString(),
        })
        .eq("schedule_id", schedule.schedule_id)

      if (error) throw error

      // Update local state
      setVestingSchedules((prevSchedules) => {
        const updatedSchedules = [...prevSchedules]
        updatedSchedules[scheduleIndex] = {
          ...schedule,
          invested: true,
          startTime: startTime.getTime(),
        }
        return updatedSchedules
      })

      // Update wallet balance
      await updatePwtInvestBalance(investmentCost, "subtract")

      // Add transaction
      await addTransaction({
        type: "VESTING",
        account: "PWT Invest",
        amount: investmentCost,
        amountUsd: investmentCost * 10,
        description: `VESTING - ${scheduleId}`,
      })
    } catch (error) {
      console.error("Error investing in schedule:", error)
    }
  }

  // Claim rewards from a schedule
  const claimSchedule = async (scheduleId: string) => {
    if (!user) return

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
    const claimTime = new Date()

    try {
      // Update schedule in Supabase
      const { error } = await supabase
        .from("vesting_schedules")
        .update({
          claimed: true,
          last_claim_time: claimTime.toISOString(),
          last_claim_percentage: schedule.progress,
          prematurely_claimed: isPremature,
        })
        .eq("schedule_id", schedule.schedule_id)

      if (error) throw error

      // Update local state
      setVestingSchedules((prevSchedules) => {
        const updatedSchedules = [...prevSchedules]
        updatedSchedules[scheduleIndex] = {
          ...schedule,
          claimed: true,
          lastClaimTime: claimTime.getTime(),
          lastClaimPercentage: schedule.progress,
          prematurelyClaimed: isPremature,
        }
        return updatedSchedules
      })

      // Update wallet balance
      await updatePwtCashoutBalance(netReward, "add")

      // Add transaction
      await addTransaction({
        type: "CLAIM",
        account: "PWT Cashout",
        amount: netReward,
        amountUsd: netReward * 10,
        description: `CLAIM - ${scheduleId}`,
      })
    } catch (error) {
      console.error("Error claiming schedule:", error)
    }
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
  const resetAllSchedulesInLevel = async (level: number) => {
    if (!user) return

    try {
      // Update schedules in Supabase
      const { error } = await supabase
        .from("vesting_schedules")
        .update({
          activated: false,
          invested: false,
          claimed: false,
          progress: 0,
          start_time: null,
          last_claim_time: null,
          last_claim_percentage: 0,
          prematurely_claimed: false,
        })
        .eq("user_uuid", user.id)
        .eq("level", level)

      if (error) throw error

      // Update local state
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
    } catch (error) {
      console.error("Error resetting schedules:", error)
    }
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
    loading,
  }

  useEffect(() => {
    fetchVestingSchedules()
  }, [user])

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
