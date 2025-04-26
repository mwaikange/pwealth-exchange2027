"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useWallet } from "./wallet-context"
import { useTransactions } from "./transaction-context"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"
import { v4 as uuidv4 } from "uuid"

// Define the vesting schedule state
export type VestingScheduleState = {
  id: string
  level: number
  position: string // A, B, C, D, E
  level_rank: number // 1-15
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
  schedule_id_text?: string // Text representation of UUID
}

// Define the context type
type VestingContextType = {
  vestingSchedules: VestingScheduleState[]
  activateSchedule: (scheduleId: string) => Promise<void>
  investInSchedule: (scheduleId: string) => Promise<void>
  claimSchedule: (scheduleId: string) => Promise<void>
  getScheduleById: (scheduleId: string) => VestingScheduleState | undefined
  getSchedulesByLevel: (level: number) => VestingScheduleState[]
  getScheduleByRank: (rank: number) => VestingScheduleState | undefined
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

// Map level and position to rank (1-15)
const getLevelRank = (level: number, position: string): number => {
  const positions = ["A", "B", "C", "D", "E"]
  const positionIndex = positions.indexOf(position)
  if (positionIndex === -1) return 0
  return (level - 1) * 5 + positionIndex + 1
}

// Map rank to level and position
const getLevelAndPosition = (rank: number): { level: number; position: string } => {
  if (rank < 1 || rank > 15) {
    return { level: 1, position: "A" }
  }

  const level = Math.ceil(rank / 5)
  const positionIndex = (rank - 1) % 5
  const positions = ["A", "B", "C", "D", "E"]
  const position = positions[positionIndex]

  return { level, position }
}

// Provider component
export function VestingProvider({ children }: { children: React.ReactNode }) {
  const { updatePwtInvestBalance, updatePwtCashoutBalance, updateAftBalance } = useWallet()
  const { addTransaction } = useTransactions()
  const { user } = useAuth()

  // State for vesting schedules
  const [vestingSchedules, setVestingSchedules] = useState<VestingScheduleState[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionChecked, setSessionChecked] = useState(false)

  // Check for active session first
  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        setSessionChecked(!!session)
      } catch (error) {
        console.error("Error checking session:", error)
      }
    }

    checkSession()
  }, [])

  // Load vesting schedules from Supabase
  useEffect(() => {
    async function fetchVestingSchedules() {
      if (!user || !sessionChecked) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        // Ensure we have an active session before proceeding
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
          console.error("No active session when fetching vesting schedules")
          setLoading(false)
          return
        }

        // First, check if the user has any vesting schedules
        const { data: existingSchedules, error: checkError } = await supabase
          .from("vesting_schedules")
          .select("*")
          .eq("user_uuid", user.id)

        if (checkError) {
          console.error("Error checking vesting schedules:", checkError)
          setLoading(false)
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
          .order("level_rank", { ascending: true }) // Use level_rank for ordering

        if (error) {
          console.error("Error fetching vesting schedules:", error)
          setLoading(false)
          return
        }

        if (data) {
          // Transform the data to match our VestingScheduleState interface
          const formattedSchedules: VestingScheduleState[] = data.map((schedule) => ({
            id: `LEVEL${schedule.level}-${schedule.position}`,
            level: schedule.level,
            position: schedule.position,
            level_rank: schedule.level_rank,
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
            schedule_id_text: schedule.schedule_id_text, // Add the text representation
          }))

          setVestingSchedules(formattedSchedules)
        }
      } catch (error) {
        console.error("Error in fetchVestingSchedules:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchVestingSchedules()
  }, [user, sessionChecked])

  // Create default vesting schedules for a new user
  const createDefaultVestingSchedules = async (userId: string) => {
    try {
      // First, verify we have an active session
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session || session.user.id !== userId) {
        console.error("User not authenticated or session user ID doesn't match")
        return
      }

      // Check if user exists in app_users
      const { data: userData, error: userError } = await supabase
        .from("app_users")
        .select("user_uuid")
        .eq("user_uuid", userId)
        .maybeSingle()

      if (userError || !userData) {
        console.error("User not found in app_users, cannot create vesting schedules")
        return
      }

      const schedules = []

      // Create schedules for each level (1, 2, 3) and position (A, B, C, D, E)
      for (let level = 1; level <= 3; level++) {
        for (const position of ["A", "B", "C", "D", "E"]) {
          const level_rank = getLevelRank(level, position)
          const scheduleId = uuidv4()
          schedules.push({
            schedule_id: scheduleId,
            schedule_id_text: scheduleId, // Add the text representation
            user_uuid: userId, // This must match auth.uid() for RLS
            level,
            position,
            level_rank, // Add the level_rank
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

      // Insert schedules one by one to better handle errors
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
        if (schedulesToUpdate.length > 0 && user && sessionChecked) {
          try {
            // Verify session is still active
            const {
              data: { session },
            } = await supabase.auth.getSession()
            if (!session) return

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
  }, [loading, vestingSchedules, user, sessionChecked])

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
    if (!user || !sessionChecked) return

    // Verify session is still active
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return

    const scheduleIndex = vestingSchedules.findIndex((s) => s.id === scheduleId)
    if (scheduleIndex === -1) return

    const schedule = vestingSchedules[scheduleIndex]
    if (schedule.activated) return

    try {
      console.log("Activating schedule:", {
        scheduleId: schedule.id,
        schedule_id: schedule.schedule_id,
        schedule_id_text: schedule.schedule_id_text,
        userId: user.id,
      })

      // Use the schedule_id directly without validation or casting
      const params = {
        p_schedule_id: schedule.schedule_id_text || schedule.schedule_id, // Use text version if available
        p_user_uuid: user.id,
      }

      console.log("RPC parameters:", JSON.stringify(params))

      // Call the stored procedure using rpc with the correct parameter names
      const { data, error } = await supabase.rpc("activate_schedule_final", params)

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }

      if (!data?.success) {
        console.error("Activation failed:", data?.error || "Unknown error")
        throw new Error(data?.error || "Activation failed")
      }

      console.log("Activation successful:", data)

      // Update local state
      setVestingSchedules((prevSchedules) => {
        const updatedSchedules = [...prevSchedules]
        updatedSchedules[scheduleIndex] = {
          ...schedule,
          activated: true,
        }
        return updatedSchedules
      })

      // Deduct AFT tokens upon successful activation
      const activationCost = getActivationCost(schedule.level)
      await updateAftBalance(activationCost, "subtract")

      // Add transaction record
      await addTransaction({
        type: "ACTIVATION",
        account: "AFT",
        amount: activationCost,
        amountUsd: activationCost * 10, // Assuming 1 AFT = $10 USD
        description: `ACTIVATION - ${scheduleId}`,
      })

      return data
    } catch (error) {
      console.error("Activation error:", {
        error,
        scheduleId: schedule.schedule_id,
        userId: user.id,
        timestamp: new Date().toISOString(),
      })
      throw error
    }
  }

  // Invest in a schedule
  const investInSchedule = async (scheduleId: string) => {
    if (!user || !sessionChecked) return

    // Verify session is still active
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return

    const scheduleIndex = vestingSchedules.findIndex((s) => s.id === scheduleId)
    if (scheduleIndex === -1) return

    const schedule = vestingSchedules[scheduleIndex]
    if (!schedule.activated || schedule.invested) return

    const investmentCost = getInvestmentCost(schedule.level)
    const startTime = new Date()

    try {
      console.log(
        "Investing in schedule:",
        schedule.id,
        "with schedule_id:",
        schedule.schedule_id_text || schedule.schedule_id,
      )

      // Use the schedule_id directly without validation or casting
      const params = {
        p_schedule_id: schedule.schedule_id_text || schedule.schedule_id, // Use text version if available
        p_start_time: startTime.toISOString(),
      }

      console.log("RPC parameters:", JSON.stringify(params))

      // Use the invest_schedule function with correct parameter names
      const { data, error } = await supabase.rpc("invest_schedule", params)

      if (error) {
        console.error("Error investing in schedule:", error)
        throw error
      }

      console.log("Investment result:", data)

      // Check if the operation was successful
      if (data && data.success === false) {
        console.error("Failed to invest in schedule:", data.error)
        throw new Error(data.error)
      }

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
    if (!user || !sessionChecked) return

    // Verify session is still active
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return

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
      console.log(
        "Claiming schedule:",
        schedule.id,
        "with schedule_id:",
        schedule.schedule_id_text || schedule.schedule_id,
      )

      // Use the schedule_id directly without validation or casting
      const params = {
        p_schedule_id: schedule.schedule_id_text || schedule.schedule_id, // Use text version if available
        p_claim_time: claimTime.toISOString(),
        p_claim_percentage: schedule.progress,
        p_is_premature: isPremature,
      }

      console.log("RPC parameters:", JSON.stringify(params))

      // Call the claim_schedule function with correct parameter names
      const { data, error } = await supabase.rpc("claim_schedule", params)

      if (error) {
        console.error("Error claiming schedule:", error)
        throw error
      }

      console.log("Claim result:", data)

      // Check if the operation was successful
      if (data && data.success === false) {
        console.error("Failed to claim schedule:", data.error)
        throw new Error(data.error)
      }

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

  // Get a schedule by rank
  const getScheduleByRank = (rank: number) => {
    return vestingSchedules.find((s) => s.level_rank === rank)
  }

  // Get schedules by level
  const getSchedulesByLevel = (level: number) => {
    return vestingSchedules.filter((s) => s.level === level)
  }

  // Reset all schedules in a level
  const resetAllSchedulesInLevel = async (level: number) => {
    if (!user || !sessionChecked) return

    // Verify session is still active
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return

    try {
      console.log("Resetting schedules for level:", level)

      // Create the parameters object and log it
      const params = {
        p_level: level,
      }

      console.log("RPC parameters:", JSON.stringify(params))

      // Use the reset_schedules_by_level function with correct parameter name
      const { data, error } = await supabase.rpc("reset_schedules_by_level", params)

      if (error) {
        console.error("Error resetting schedules:", error)
        throw error
      }

      console.log("Reset result:", data)

      // Check if the operation was successful
      if (data && data.success === false) {
        console.error("Failed to reset schedules:", data.error)
        throw new Error(data.error)
      }

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
    getScheduleByRank,
    resetAllSchedulesInLevel,
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
