"use client"

import type React from "react"
import { createContext, useState, useEffect, useCallback, useMemo, useContext } from "react"
import { ethers } from "ethers"

// Define types
interface VestingSchedule {
  id: string
  start: number
  cliff: number
  duration: number
  slicePeriodSeconds: number
  amountTotal: string
  released: string
  revoked: boolean
  beneficiary: string
}

interface VestingContextType {
  schedules: VestingSchedule[]
  addSchedule: (schedule: VestingSchedule) => void
  updateSchedule: (schedule: VestingSchedule) => void
  deleteSchedule: (id: string) => void
  getReleasableShares: (schedule: VestingSchedule) => string
  validateSchedule: (schedule: VestingSchedule) => string | null
}

// Create context
const VestingContext = createContext<VestingContextType | undefined>(undefined)

// Provider component
interface VestingProviderProps {
  children: React.ReactNode
}

export const VestingProvider: React.FC<VestingProviderProps> = ({ children }) => {
  const [schedules, setSchedules] = useState<VestingSchedule[]>(() => {
    // Load from local storage on initial load
    try {
      const storedSchedules = localStorage.getItem("vestingSchedules")
      return storedSchedules
        ? JSON.parse(storedSchedules)
        : [
            {
              id: "1",
              start: Math.floor(Date.now() / 1000),
              cliff: Math.floor(Date.now() / 1000) + 3600,
              duration: 86400 * 30,
              slicePeriodSeconds: 3600,
              amountTotal: ethers.utils.parseEther("1000").toString(),
              released: ethers.utils.parseEther("100").toString(),
              revoked: false,
              beneficiary: "0xf39Fd6e51Ec89c3b2924B9eD336924B948e57391", // Example address
            },
            {
              id: "2",
              start: Math.floor(Date.now() / 1000) - 86400,
              cliff: Math.floor(Date.now() / 1000),
              duration: 86400 * 60,
              slicePeriodSeconds: 3600 * 6,
              amountTotal: ethers.utils.parseEther("500").toString(),
              released: ethers.utils.parseEther("250").toString(),
              revoked: false,
              beneficiary: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Example address
            },
          ]
    } catch (error) {
      console.error("Error loading schedules from local storage:", error)
      return []
    }
  })

  // Save to local storage whenever schedules change
  useEffect(() => {
    localStorage.setItem("vestingSchedules", JSON.stringify(schedules))
  }, [schedules])

  const addSchedule = useCallback((schedule: VestingSchedule) => {
    setSchedules((prevSchedules) => [...prevSchedules, schedule])
  }, [])

  const updateSchedule = useCallback((schedule: VestingSchedule) => {
    setSchedules((prevSchedules) => prevSchedules.map((s) => (s.id === schedule.id ? schedule : s)))
  }, [])

  const deleteSchedule = useCallback((id: string) => {
    setSchedules((prevSchedules) => prevSchedules.filter((s) => s.id !== id))
  }, [])

  const getReleasableShares = useCallback((schedule: VestingSchedule) => {
    // Mock implementation - replace with actual logic
    const now = Math.floor(Date.now() / 1000)
    if (now < schedule.cliff) {
      return "0"
    }

    const timeSinceCliff = now - schedule.cliff
    const vestedPortion = Math.min(timeSinceCliff / schedule.duration, 1)
    const totalVested = ethers.BigNumber.from(schedule.amountTotal)
      .mul(Math.floor(vestedPortion * 10000))
      .div(10000)
    const releasable = totalVested.sub(schedule.released)

    return releasable.lt(0) ? "0" : releasable.toString()
  }, [])

  const validateSchedule = useCallback((schedule: VestingSchedule) => {
    if (!schedule.beneficiary) {
      return "Beneficiary address is required."
    }

    if (!ethers.utils.isAddress(schedule.beneficiary)) {
      return "Beneficiary address is not a valid Ethereum address."
    }

    if (!schedule.amountTotal) {
      return "Total shares amount is required."
    }

    try {
      ethers.utils.parseEther(schedule.amountTotal)
    } catch (error) {
      return "Total shares amount is not a valid number."
    }

    if (Number(schedule.start) >= Number(schedule.cliff)) {
      return "Start time must be before cliff time."
    }

    if (Number(schedule.cliff) >= Number(schedule.start) + Number(schedule.duration)) {
      return "Cliff time must be before start + duration."
    }

    if (Number(schedule.slicePeriodSeconds) <= 0) {
      return "Slice period must be greater than 0."
    }

    return null
  }, [])

  const value = useMemo(
    () => ({
      schedules,
      addSchedule,
      updateSchedule,
      deleteSchedule,
      getReleasableShares,
      validateSchedule,
    }),
    [schedules, addSchedule, updateSchedule, deleteSchedule, getReleasableShares, validateSchedule],
  )

  return <VestingContext.Provider value={value}>{children}</VestingContext.Provider>
}

// Hook to use the context
export const useVesting = (): VestingContextType => {
  const context = useContext(VestingContext)
  if (!context) {
    throw new Error("useVesting must be used within a VestingProvider")
  }
  return context
}
