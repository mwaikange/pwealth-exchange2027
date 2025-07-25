"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@/contexts/wallet-context"
import { useVesting, VESTING_LEVELS } from "@/contexts/vesting-context"
import { useTransactions } from "@/contexts/transaction-context"
import Celebration from "@/components/celebration"
import { VestingSlot } from "@/components/vesting-slot"
import { VestConfirmationModal } from "@/components/vest-confirmation-modal"
import { SlidingNotification, useNotification } from "@/components/sliding-notification"
import { AlertCircle, Clock, Loader2 } from "lucide-react"

export default function Vesting() {
  const [activeTab, setActiveTab] = useState("Retail")
  const [vestError, setVestError] = useState("")
  const [claimSuccess, setClaimSuccess] = useState("")
  const [activateError, setActivateError] = useState("")
  const [investError, setInvestError] = useState("")
  const [claimError, setClaimError] = useState("")

  const [showVestModal, setShowVestModal] = useState(false)
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<number>(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  // Notification system
  const { notification, showNotification, hideNotification } = useNotification()

  // Get wallet functions
  const { holdWalletPreHold, holdWalletPostHold, loading: walletLoading, error: walletError } = useWallet()

  // Get transaction functions directly from the transaction context
  const { addTransaction } = useTransactions()

  // Get vesting functions
  const {
    getVestingSlotsForLevel,
    vestShares,
    claimShares,
    getTotalVestingInProgress,
    getTotalClaimableShares,
    validateVestingAmount,
    getHoldPeriodForLevel,
    loading: vestingLoading,
    error: vestingError,
  } = useVesting()

  // Clear messages after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (vestError) setVestError("")
      if (claimSuccess) setClaimSuccess("")
      if (activateError) setActivateError("")
      if (investError) setInvestError("")
      if (claimError) setClaimError("")
    }, 5000)

    return () => clearTimeout(timer)
  }, [vestError, claimSuccess, activateError, investError, claimError])

  // Get active level number
  const getActiveLevel = () => {
    switch (activeTab) {
      case "Retail":
        return 1
      case "Small Business":
        return 2
      case "Corporate":
        return 3
      default:
        return 1
    }
  }

  // Get slots for the current active level
  const currentLevelSlots = getVestingSlotsForLevel(getActiveLevel())

  // Handle claim action
  const handleClaimSlot = async (slotIndex: number) => {
    if (isProcessing) return

    try {
      setIsProcessing(true)
      const currentLevel = getActiveLevel()
      const slot = currentLevelSlots[slotIndex]
      await claimShares(currentLevel, slotIndex)

      const levelName = VESTING_LEVELS[currentLevel as keyof typeof VESTING_LEVELS].name
      const message = `Successfully claimed ${slot.amount.toFixed(4)} shares from ${levelName} Slot ${slotIndex + 1}!`

      showNotification(message, "success")
      setShowConfetti(true)
    } catch (error: any) {
      console.error("Claim failed:", error)
      showNotification(`Claim failed: ${error.message || "Unknown error"}`, "error")
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle vest action - opens modal with fixed level
  const handleVestSlot = (slotIndex: number) => {
    setSelectedSlotIndex(slotIndex)
    setSelectedLevel(getActiveLevel()) // Fix the level to the current tab
    setShowVestModal(true)
  }

  // Handle vest confirmation from modal
  const handleVestConfirm = async (amount: number) => {
    if (selectedSlotIndex === null) return

    try {
      setIsProcessing(true)
      setVestError("")

      await vestShares(selectedLevel, selectedSlotIndex, amount)

      // Record transaction
      if (typeof addTransaction === "function") {
        const holdDays = getHoldPeriodForLevel(selectedLevel)
        const levelName = VESTING_LEVELS[selectedLevel as keyof typeof VESTING_LEVELS].name
        await addTransaction({
          transaction_type: "vesting",
          shares: amount,
          total_amount: amount * 108.2, // Current share price
          from_wallet: "hold_pre",
          to_wallet: "vesting_locked",
          status: "completed",
          description: `Vested ${amount.toFixed(4)} shares in ${levelName} Slot ${selectedSlotIndex + 1} (${holdDays} days)`,
        })
      }

      // Show success notification
      const levelName = VESTING_LEVELS[selectedLevel as keyof typeof VESTING_LEVELS].name
      const message = `Successfully vested ${amount.toFixed(4)} shares in ${levelName} Slot ${selectedSlotIndex + 1}!`
      showNotification(message, "success")
    } catch (error: any) {
      console.error("Vest failed:", error)
      showNotification(`Vesting failed: ${error.message || "Unknown error"}`, "error")
      throw error // Re-throw so modal can handle it
    } finally {
      setIsProcessing(false)
    }
  }

  const totalVesting = getTotalVestingInProgress()
  const totalClaimable = getTotalClaimableShares()

  if (walletLoading || vestingLoading) {
    return (
      <div className="h-[calc(100vh-130px)] bg-gray-900 overflow-auto">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <span className="ml-2 text-white">Loading vesting data...</span>
        </div>
      </div>
    )
  }

  if (walletError || vestingError) {
    return (
      <div className="h-[calc(100vh-130px)] bg-gray-900 overflow-auto">
        <div className="px-6 py-4">
          <div className="bg-red-600 text-white p-4 rounded-lg">
            <h3 className="font-bold">Error Loading Data</h3>
            <p>{walletError || vestingError}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-130px)] bg-gray-900 overflow-auto">
      {/* Sliding Notification */}
      <SlidingNotification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />

      {/* Page Title */}
      <div className="px-6 mb-2">
        <h1 className="text-2xl font-bold text-slate-100">Vesting Schedules</h1>
        <p className="text-slate-400 text-sm">Each level has its own dedicated 6 slots (18 total slots)</p>
      </div>

      {/* Success and error messages */}
      {claimSuccess && <div className="mx-6 mb-2 p-2 bg-green-500 text-white text-sm rounded">{claimSuccess}</div>}
      {activateError && <div className="mx-6 mb-2 p-2 bg-red-500 text-white text-sm rounded">{activateError}</div>}
      {investError && <div className="mx-6 mb-2 p-2 bg-red-500 text-white text-sm rounded">{investError}</div>}
      {claimError && <div className="mx-6 mb-2 p-2 bg-red-500 text-white text-sm rounded">{claimError}</div>}
      {vestError && (
        <div className="mx-6 mb-4 p-3 bg-red-600 text-white text-sm rounded-lg flex items-center">
          <AlertCircle className="w-4 h-4 mr-2" />
          {vestError}
        </div>
      )}

      {/* Wallet Summary */}
      <div className="px-6 mb-6">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 className="text-lg font-medium mb-3 text-slate-100">Hold Wallet Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-slate-400">Available (Pre-Hold)</div>
              <div className="text-xl font-bold text-blue-400">{holdWalletPreHold.toFixed(4)}</div>
              <div className="text-xs text-slate-500">shares</div>
            </div>
            <div>
              <div className="text-slate-400">Currently Vesting</div>
              <div className="text-xl font-bold text-yellow-400">{totalVesting.toFixed(4)}</div>
              <div className="text-xs text-slate-500">shares</div>
            </div>
            <div>
              <div className="text-slate-400">Ready to Claim</div>
              <div className="text-xl font-bold text-green-400">{totalClaimable.toFixed(4)}</div>
              <div className="text-xs text-slate-500">shares</div>
            </div>
            <div>
              <div className="text-slate-400">Post-Hold</div>
              <div className="text-xl font-bold text-purple-400">{holdWalletPostHold.toFixed(4)}</div>
              <div className="text-xs text-slate-500">shares</div>
            </div>
          </div>
        </div>
      </div>

      {/* Level Tabs with Hold Periods */}
      <div className="px-6 mb-6">
        <div className="flex mb-4">
          <button
            className={`flex-1 py-3 px-4 font-medium text-sm rounded-t-lg ${
              activeTab === "Retail" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-400"
            }`}
            onClick={() => setActiveTab("Retail")}
          >
            <div className="flex flex-col items-center">
              <span>Retail</span>
              <div className="flex items-center text-xs opacity-75 mt-1">
                <Clock className="w-3 h-3 mr-1" />5 days
              </div>
            </div>
          </button>
          <button
            className={`flex-1 py-3 px-4 font-medium text-sm rounded-t-lg ${
              activeTab === "Small Business" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-400"
            }`}
            onClick={() => setActiveTab("Small Business")}
          >
            <div className="flex flex-col items-center">
              <span>Small Business</span>
              <div className="flex items-center text-xs opacity-75 mt-1">
                <Clock className="w-3 h-3 mr-1" />
                30 days
              </div>
            </div>
          </button>
          <button
            className={`flex-1 py-3 px-4 font-medium text-sm rounded-t-lg ${
              activeTab === "Corporate" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-400"
            }`}
            onClick={() => setActiveTab("Corporate")}
          >
            <div className="flex flex-col items-center">
              <span>Corporate</span>
              <div className="flex items-center text-xs opacity-75 mt-1">
                <Clock className="w-3 h-3 mr-1" />
                90 days
              </div>
            </div>
          </button>
        </div>

        {/* Level Info */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 mb-6">
          <h3 className="text-lg font-medium mb-2 text-slate-100">{activeTab} Level</h3>
          <div className="flex items-center text-slate-300 text-sm mb-2">
            <Clock className="w-4 h-4 mr-2 text-blue-400" />
            <span className="font-medium">Hold Period: {getHoldPeriodForLevel(getActiveLevel())} days</span>
          </div>
          <p className="text-slate-300 text-sm">
            {activeTab === "Retail" && "Perfect for individual investors. Vest 1-50 shares per slot for 5 days."}
            {activeTab === "Small Business" &&
              "Ideal for small business investments. Vest 51-500 shares per slot for 30 days."}
            {activeTab === "Corporate" &&
              "For large-scale corporate investments. Vest 501+ shares per slot for 90 days."}
          </p>
        </div>
      </div>

      {/* Vesting Slots - Real data from Supabase */}
      <div className="px-6 pb-6">
        <h3 className="text-lg font-medium mb-4 text-slate-100">Your {activeTab} Vesting Slots (6 Available)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentLevelSlots.map((slot, index) => (
            <VestingSlot
              key={slot.id}
              slot={slot}
              slotIndex={index}
              onVest={handleVestSlot}
              onClaim={handleClaimSlot}
            />
          ))}
        </div>
      </div>

      {/* Info Section */}
      <div className="px-6 pb-6">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 className="text-lg font-medium mb-3 text-slate-100">How Vesting Works</h3>
          <div className="space-y-2 text-sm text-slate-300">
            <p>
              • <strong>Dedicated Slots:</strong> Each level has its own 6 slots (18 total slots across all levels)
            </p>
            <p>
              • <strong>Vest:</strong> Lock shares from your Pre-Hold balance for the specified hold period
            </p>
            <p>
              • <strong>Level Limits:</strong> Retail (1-50), Small Business (51-500), Corporate (501+) shares per slot
            </p>
            <p>
              • <strong>Hold Periods:</strong> Retail (5 days), Small Business (30 days), Corporate (90 days)
            </p>
            <p>
              • <strong>Progress:</strong> Watch your shares vest over the selected period
            </p>
            <p>
              • <strong>Claim:</strong> After the hold period, claim your shares to your Post-Hold balance
            </p>
            <p>
              • <strong>Exchange:</strong> Only Post-Hold shares can be sold on the exchange
            </p>
          </div>
        </div>
      </div>

      {/* Vest Confirmation Modal - Now with fixed level */}
      <VestConfirmationModal
        isOpen={showVestModal}
        onClose={() => setShowVestModal(false)}
        onConfirm={handleVestConfirm}
        availableShares={holdWalletPreHold}
        slotIndex={selectedSlotIndex || 0}
        fixedLevel={selectedLevel}
      />

      {/* Confetti Celebration */}
      {showConfetti && <Celebration onComplete={() => setShowConfetti(false)} />}
    </div>
  )
}
