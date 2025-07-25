"use client"

import { useState } from "react"
import { useVesting } from "@/contexts/vesting-context"
import { useWallet } from "@/contexts/wallet-context"
import { useNotification } from "@/hooks/use-notification"
import { VestingSlot } from "@/components/vesting-slot"
import { VestConfirmationModal } from "@/components/vest-confirmation-modal"
import { SlidingNotification } from "@/components/sliding-notification"
import { Celebration } from "@/components/celebration"

export default function VestingPage() {
  const {
    getVestingSlotsForLevel,
    vestShares,
    claimShares,
    getTotalVestingInProgress,
    getTotalClaimableShares,
    loading,
    error,
  } = useVesting()
  const { preHoldBalance } = useWallet()
  const { notifications, showNotification, hideNotification } = useNotification()

  const [selectedLevel, setSelectedLevel] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0)
  const [showCelebration, setShowCelebration] = useState(false)

  const levels = [
    {
      id: 1,
      name: "Retail",
      days: 5,
      description: "Perfect for individual investors. Vest 1-50 shares per slot for 5 days.",
    },
    {
      id: 2,
      name: "Small Business",
      days: 30,
      description: "Ideal for small business investments. Vest 51-500 shares per slot for 30 days.",
    },
    {
      id: 3,
      name: "Corporate",
      days: 90,
      description: "For large-scale corporate investments. Vest 501+ shares per slot for 90 days.",
    },
  ]

  const currentLevel = levels.find((level) => level.id === selectedLevel)
  const vestingSlots = getVestingSlotsForLevel(selectedLevel)
  const totalVesting = getTotalVestingInProgress()
  const totalClaimable = getTotalClaimableShares()

  const handleVest = (slotIndex: number) => {
    setSelectedSlotIndex(slotIndex)
    setIsModalOpen(true)
  }

  const handleConfirmVest = async (amount: number) => {
    try {
      await vestShares(selectedLevel, selectedSlotIndex, amount)
      showNotification("success", `Successfully vested ${amount.toFixed(4)} shares in Slot ${selectedSlotIndex + 1}`)
    } catch (err: any) {
      showNotification("error", err.message || "Failed to vest shares")
    }
  }

  const handleClaim = async (slotIndex: number) => {
    try {
      const slot = vestingSlots[slotIndex]
      await claimShares(selectedLevel, slotIndex)
      setShowCelebration(true)
      showNotification("success", `Successfully claimed ${slot.amount.toFixed(4)} shares from Slot ${slotIndex + 1}`)
      setTimeout(() => setShowCelebration(false), 3000)
    } catch (err: any) {
      showNotification("error", err.message || "Failed to claim shares")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading vesting data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Vesting Schedules</h1>
          <p className="text-slate-400">Lock shares for 5 days</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-slate-400 text-sm font-medium mb-2">Pre-Hold Balance</h3>
            <p className="text-2xl font-bold text-blue-400">{preHoldBalance.toFixed(4)} shares</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-slate-400 text-sm font-medium mb-2">Currently Vesting</h3>
            <p className="text-2xl font-bold text-yellow-400">{totalVesting.toFixed(4)} shares</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-slate-400 text-sm font-medium mb-2">Ready to Claim</h3>
            <p className="text-2xl font-bold text-green-400">{totalClaimable.toFixed(4)} shares</p>
          </div>
        </div>

        {/* Level Selector */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4">
            {levels.map((level) => (
              <button
                key={level.id}
                onClick={() => setSelectedLevel(level.id)}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  selectedLevel === level.id
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {level.name} Level
                <span className="block text-xs opacity-75">{level.days} days</span>
              </button>
            ))}
          </div>
        </div>

        {/* Level Description */}
        {currentLevel && (
          <div className="mb-8 bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-xl font-semibold text-white mb-2">{currentLevel.name} Level</h3>
            <div className="text-slate-300 mb-2">
              <strong>Hold Period:</strong> {currentLevel.days} days
            </div>
            <p className="text-slate-400">{currentLevel.description}</p>
          </div>
        )}

        {/* Vesting Slots */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            Your {currentLevel?.name} Vesting Slots (6 Available)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vestingSlots.map((slot, index) => (
              <VestingSlot
                key={`${selectedLevel}-${index}`}
                slot={slot}
                slotIndex={index}
                onVest={handleVest}
                onClaim={handleClaim}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-600/30 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Modals and Notifications */}
      <VestConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmVest}
        level={selectedLevel}
        slotIndex={selectedSlotIndex}
        maxAmount={preHoldBalance}
      />

      {notifications.map((notification) => (
        <SlidingNotification
          key={notification.id}
          type={notification.type}
          message={notification.message}
          isVisible={notification.isVisible}
          onClose={() => hideNotification(notification.id)}
        />
      ))}

      {showCelebration && <Celebration />}
    </div>
  )
}
