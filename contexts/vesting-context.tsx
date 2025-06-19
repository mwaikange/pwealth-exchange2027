"use client"

import type React from "react"
import { createContext, useState, useEffect, useContext, type Dispatch, type SetStateAction } from "react"

// Define the structure for vesting slot data
export interface VestingSlotData {
  id: string
  status: "empty" | "in_progress" | "claimable" | "claimed"
  startDate?: number
  amount?: number
  progress?: number
  level?: number
}

// Define the structure for the vesting context
interface VestingContextType {
  vestingSlots: VestingSlotData[]
  setVestingSlots: Dispatch<SetStateAction<VestingSlotData[]>>
  // Add other context values and functions as needed
}

// Create the vesting context with a default value
const VestingContext = createContext<VestingContextType>({
  vestingSlots: [],
  setVestingSlots: () => {}, // Provide an empty function as a default
})

// Create a provider component for the vesting context
interface VestingProviderProps {
  children: React.ReactNode
}

export const VestingProvider: React.FC<VestingProviderProps> = ({ children }) => {
  const [vestingSlots, setVestingSlots] = useState<VestingSlotData[]>([])

  useEffect(() => {
    // Mock vesting slots data - 6 slots with different levels and hold periods
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

    setVestingSlots(mockVestingSlots)
  }, [])

  const value: VestingContextType = {
    vestingSlots,
    setVestingSlots,
  }

  return <VestingContext.Provider value={value}>{children}</VestingContext.Provider>
}

// Create a custom hook to use the vesting context
export const useVesting = () => {
  return useContext(VestingContext)
}
