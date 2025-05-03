"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useWallet } from "./wallet-context"
import { useTransactions } from "./transaction-context"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"
import { v4 as uuidv4 } from "uuid"
import { resetVestingSchedulesAndProcessClaims } from "@/actions/vesting-actions"
import { toast } from "react-hot-toast"

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
  resetAllSchedulesInLevel: (userUuid: string, level: number) => Promise<void>
  forceResetLevel: (level: number) => Promise<void> // New function to force reset
  loading: boolean
  refreshVestingSchedules: () => Promise<void> // New function to refresh schedules
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

// Helper function to ensure valid UUID or null
const ensureValidUuidOrNull = (id: string | null | undefined): string | null => {
  if (!id) return null
  return id
}

// Provider component
export function VestingProvider({ children }: { children: React.ReactNode }) {
  const { updatePwtInvestBalance, updatePwtCashoutBalance, updateAftBalance, refreshBalances } = useWallet()
  const { addTransaction, refreshTransactions } = useTransactions()
  const { user } = useAuth()

  // State for vesting schedules
  const [vestingSchedules, setVestingSchedules] = useState<VestingScheduleState[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [resetAttempted, setResetAttempted] = useState<{ [key: number]: boolean }>({})

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

  // Function to fetch vesting schedules
  const fetchVestingSchedules = async () => {
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

  // Load vesting schedules from Supabase
  useEffect(() => {
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
          // For live: 5 days to reach 100%
          const totalTime = 5 * 24 * 60 * 60 * 1000
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
    }, 60000) // Check every minute instead of every second for production

    return () => clearInterval(interval)
  }, [loading, vestingSchedules, user, sessionChecked])

  // Check if all schedules in a level are completed
  useEffect(() => {
    if (loading || vestingSchedules.length === 0 || !user) return

    const checkLevelCompletion = async () => {
      for (let level = 1; level <= 3; level++) {
        const levelSchedules = vestingSchedules.filter((s) => s.level === level)

        // Debug logging to see what's happening
        console.log(
          `Level ${level} schedules:`,
          levelSchedules.map((s) => ({
            id: s.id,
            claimed: s.claimed,
            activated: s.activated,
            invested: s.invested,
          })),
        )

        // Check if we have all 5 schedules for this level
        if (levelSchedules.length !== 5) {
          console.log(`Level ${level} has ${levelSchedules.length} schedules instead of 5`)
          continue
        }

        const allCompleted = levelSchedules.every((s) => s.claimed)
        console.log(`Level ${level} all completed: ${allCompleted}`)

        // Only attempt to reset once per level per session
        if (allCompleted && !resetAttempted[level] && !isResetting) {
          console.log(`All schedules in Level ${level} are claimed. Triggering reset in 5 seconds...`)

          // Mark that we've attempted a reset for this level
          setResetAttempted((prev) => ({ ...prev, [level]: true }))

          // Set a timeout to reset all schedules in this level
          setTimeout(() => {
            console.log(`Executing reset for Level ${level}...`)
            resetAllSchedulesInLevel(user.id, level)
              .then(() => console.log(`Reset for Level ${level} completed successfully`))
              .catch((err) => console.error(`Reset for Level ${level} failed:`, err))
          }, 5000) // 5 seconds
        }
      }
    }

    checkLevelCompletion()
  }, [vestingSchedules, loading, user, resetAttempted, isResetting])

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
        p_schedule_id: ensureValidUuidOrNull(schedule.schedule_id_text || schedule.schedule_id), // Use text version if available
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

      // Note: AFT balance update and transaction recording are now handled in the page component
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

      // Create a new Supabase client to clear any cached schema information
      const freshSupabase = supabase

      // Use the schedule_id directly without validation or casting
      const params = {
        p_schedule_id: ensureValidUuidOrNull(schedule.schedule_id_text || schedule.schedule_id), // Use text version if available
        p_start_time: startTime.toISOString(),
      }

      console.log("RPC parameters for invest_schedule:", JSON.stringify(params))

      // Use the invest_schedule function with correct parameter names
      const { data, error } = await freshSupabase.rpc("invest_schedule", params)

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

      // Add transaction - Ensure this is properly recorded
      try {
        await addTransaction({
          type: "VESTING",
          account: "PWT Invest",
          amount: investmentCost,
          amountUsd: investmentCost * 10,
          description: `Vesting investment for Schedule ${scheduleId}`,
        })
        console.log("Vesting transaction recorded successfully")
      } catch (transactionError) {
        console.error("Error recording vesting transaction:", transactionError)
        // Don't throw here as the investment was successful, but log the error
      }
    } catch (error) {
      console.error("Error investing in schedule:", error)
      throw error // Re-throw the error so it can be caught by the UI
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
        p_schedule_id: ensureValidUuidOrNull(schedule.schedule_id_text || schedule.schedule_id), // Use text version if available
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

      // Add transaction - Ensure this is properly recorded
      try {
        await addTransaction({
          type: "CLAIM",
          account: "PWT Cashout",
          amount: netReward,
          amountUsd: netReward * 10,
          description: `Claim from Schedule ${scheduleId} (${isPremature ? "Premature" : "Mature"})`,
        })
        console.log("Claim transaction recorded successfully")
      } catch (transactionError) {
        console.error("Error recording claim transaction:", transactionError)
        // Don't throw here as the claim was successful, but log the error
      }

      // After claiming, check if all schedules in this level are now claimed
      // and reset the resetAttempted flag for this level to allow a new reset attempt
      const level = schedule.level
      const levelSchedules = vestingSchedules.filter((s) => s.level === level)
      const updatedSchedule = { ...schedule, claimed: true }
      const updatedLevelSchedules = levelSchedules.map((s) => (s.id === updatedSchedule.id ? updatedSchedule : s))

      const allClaimedAfterUpdate = updatedLevelSchedules.every((s) => s.claimed)
      if (allClaimedAfterUpdate) {
        console.log(`All schedules in Level ${level} are now claimed after this claim. Resetting resetAttempted flag.`)
        setResetAttempted((prev) => ({ ...prev, [level]: false }))
      }
    } catch (error) {
      console.error("Error claiming schedule:", error)
      throw error // Re-throw the error so it can be caught by the UI
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

  // Refresh vesting schedules
  const refreshVestingSchedules = async () => {
    await fetchVestingSchedules()
  }

  // Reset all schedules in a level
  const resetAllSchedulesInLevel = async (userUuid: string, level: number) => {
    if (!userUuid) {
      console.error("Cannot reset schedules: No user UUID provided")
      return
    }

    setIsResetting(true)
    try {
      console.log(`Starting reset for Level ${level}, User ${userUuid}`)

      // Use the server action to reset schedules
      const result = await resetVestingSchedulesAndProcessClaims(userUuid, level)

      if (result.success) {
        console.log(`Reset successful for Level ${level}`)

        // Refresh vesting schedules  {
        console.log(`Reset successful for Level ${level}`)

        // Refresh vesting schedules
        await refreshVestingSchedules()

        // Refresh balances and transactions to reflect any auto-claims
        refreshBalances()
        refreshTransactions()

        // Reset the resetAttempted flag for this level
        setResetAttempted((prev) => ({ ...prev, [level]: false }))

        console.log(`Reset process completed for Level ${level}`)
      } else {
        console.error(`Reset failed for Level ${level}:`, result.error)
        throw new Error("Failed to reset schedules")
      }
    } catch (error) {
      console.error("Error in resetAllSchedulesInLevel:", error)
      toast({
        title: "Reset Failed",
        description: "There was an error resetting the schedules. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsResetting(false)
    }
  }

  // Force reset a level (for manual intervention)
  const forceResetLevel = async (level: number) => {
    if (!user) {
      console.error("Cannot force reset: No user in context")
      return
    }

    console.log(`Force resetting Level ${level} for user ${user.id}`)
    await resetAllSchedulesInLevel(user.id, level)
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
    forceResetLevel,
    loading,
    refreshVestingSchedules,
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
