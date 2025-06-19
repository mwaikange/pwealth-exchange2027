"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@/contexts/wallet-context"
import { useVesting, VESTING_LEVELS } from "@/contexts/vesting-context"
import { useTransactions } from "@/contexts/transaction-context"
import Celebration from "@/components/celebration"
import { VestingSlot } from "@/components/vesting-slot"
import { VestConfirmationModal } from "@/components/vest-confirmation-modal"
import { AlertCircle, Clock } from "lucide-react"

export default function Vesting() {
  const [activeTab, setActiveTab] = useState("Retail")
  const [vestError, setVestError] = useState("")
  const [claimSuccess, setClaimSuccess] = useState("")
  const [activateError, setActivateError] = useState("")
  const [investError, setInvestError] = useState("")
  const [claimError, setClaimError] = useState("")

  const [showActivateConfirmation, setShowActivateConfirmation] = useState(false)
  const [showInvestConfirmation, setShowInvestConfirmation] = useState(false)
  const [showVestModal, setShowVestModal] = useState(false)
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null)
  const [pendingScheduleId, setPendingScheduleId] = useState<string | null>(null)

  // Add a new state variable to track when any action is being processed
  const [isProcessing, setIsProcessing] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  // Get wallet functions
  const { pwtInvestBalance, aftBalance, updateAftBalance, holdWalletBalance, holdWalletPreHold, holdWalletPostHold } =
    useWallet()

  // Get transaction functions directly from the transaction context
  const { addTransaction } = useTransactions()

  // Get vesting functions
  const {
    vestingSchedules,
    activateSchedule,
    investInSchedule,
    claimSchedule,
    getSchedulesByLevel,
    vestingSlots,
    vestShares,
    claimShares,
    getTotalVestingInProgress,
    getTotalClaimableShares,
    validateVestingAmount,
    getHoldPeriodForLevel,
    loading,
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

  // Get schedules for the active level
  const activeSchedules = getSchedulesByLevel(getActiveLevel())

  // Function to get the circle number based on active tab
  const getCircleNumber = () => {
    switch (activeTab) {
      case "Retail":
        return "2"
      case "Small Business":
        return "4"
      case "Corporate":
        return "8"
      default:
        return "2"
    }
  }

  // Function to get the activation cost based on active tab
  const getActivationCost = () => {
    switch (activeTab) {
      case "Retail":
        return 2
      case "Small Business":
        return 4
      case "Corporate":
        return 8
      default:
        return 2
    }
  }

  // Function to get the investment cost based on active tab
  const getInvestmentCost = () => {
    switch (activeTab) {
      case "Retail":
        return 2
      case "Small Business":
        return 4
      case "Corporate":
        return 8
      default:
        return 2
    }
  }

  // Function to get the yield amount based on active tab and progress
  const getYieldAmount = (level, progress) => {
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

  // Function to get the max yield amount based on level
  const getMaxYieldAmount = (level) => {
    switch (level) {
      case 1:
        return 10
      case 2:
        return 20
      case 3:
        return 40
      default:
        return 10
    }
  }

  // Update the handleActivate function to use the processing state
  const handleActivate = (scheduleId: string) => {
    // Prevent action if already processing something
    if (isProcessing) return

    const level = getActiveLevel()
    const cost = getActivationCost()

    if (aftBalance < cost) {
      setActivateError(`Insufficient AFT balance. Need ${cost} AFT.`)
      return
    }

    // Show confirmation dialog instead of activating immediately
    setPendingScheduleId(scheduleId)
    setShowActivateConfirmation(true)
  }

  // Update the confirmActivate function to ensure the transaction is properly recorded
  const confirmActivate = async () => {
    if (pendingScheduleId) {
      try {
        setIsProcessing(true) // Set processing to true at the start
        const level = getActiveLevel()
        const cost = getActivationCost()

        // First activate the schedule
        await activateSchedule(pendingScheduleId)
        console.log("Schedule activated successfully")

        try {
          // Update the AFT balance in a separate try/catch
          await updateAftBalance(cost, "subtract")
          console.log("AFT balance updated successfully")
        } catch (balanceError) {
          console.error("Error updating AFT balance:", balanceError)
          setActivateError(
            `Activation succeeded but failed to update balance: ${balanceError.message || "Unknown error"}`,
          )
          setShowActivateConfirmation(false)
          setPendingScheduleId(null)
          return
        }

        // Record the transaction - IMPORTANT: This must execute successfully
        try {
          // Make sure addTransaction is a function before calling it
          if (typeof addTransaction === "function") {
            await addTransaction({
              type: "ACTIVATE FEE",
              account: "AFT Wallet",
              amount: cost,
              amountUsd: cost,
              description: `Activation Fee for Schedule ${pendingScheduleId}`,
            })
            console.log("Activation fee transaction recorded successfully")
          } else {
            console.error("addTransaction is not a function or is undefined")
            // Don't show an error to the user since the activation and balance update succeeded
          }
        } catch (transactionError) {
          console.error("Error recording activation fee transaction:", transactionError)
          // Don't show an error to the user since the activation and balance update succeeded
        }

        setShowActivateConfirmation(false)
        setPendingScheduleId(null)
      } catch (error) {
        console.error("Activation failed:", error)
        setActivateError(`Activation failed: ${error.message || "Unknown error"}`)
        setShowActivateConfirmation(false)
        setPendingScheduleId(null)
      } finally {
        setIsProcessing(false) // Set processing to false when done
      }
    }
  }

  // Update the handleInvest function to use the processing state
  const handleInvest = (scheduleId: string) => {
    // Prevent action if already processing something
    if (isProcessing) return

    const level = getActiveLevel()
    const cost = getInvestmentCost()

    if (pwtInvestBalance < cost) {
      setInvestError(`Insufficient PWT Invest balance. Need ${cost} PWT.`)
      return
    }

    // Show confirmation dialog instead of investing immediately
    setPendingScheduleId(scheduleId)
    setShowInvestConfirmation(true)
  }

  // Update the confirmInvest function to use the processing state
  const confirmInvest = async () => {
    if (pendingScheduleId) {
      try {
        setIsProcessing(true) // Set processing to true at the start
        // Call the investInSchedule function and handle any errors
        await investInSchedule(pendingScheduleId)
        console.log("Schedule invested successfully")
        setShowInvestConfirmation(false)
        setPendingScheduleId(null)
      } catch (error) {
        console.error("Investment failed:", error)
        setInvestError(`Investment failed: ${error.message || "Unknown error"}`)
        setShowInvestConfirmation(false)
        setPendingScheduleId(null)
      } finally {
        setIsProcessing(false) // Set processing to false when done
      }
    }
  }

  // Handle claim action
  const handleClaimSlot = async (slotIndex: number) => {
    if (isProcessing) return

    try {
      setIsProcessing(true)
      const slot = vestingSlots[slotIndex]
      await claimShares(slotIndex)

      setClaimSuccess(`Successfully claimed ${slot.amount} shares from Slot ${slotIndex + 1}!`)

      // Show confetti for completed claims
      setShowConfetti(true)
    } catch (error) {
      console.error("Claim failed:", error)
      setVestError(`Claim failed: ${error.message || "Unknown error"}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle vest action - opens modal
  const handleVestSlot = (slotIndex: number) => {
    setSelectedSlotIndex(slotIndex)
    setShowVestModal(true)
  }

  // Handle vest confirmation from modal
  const handleVestConfirm = async (amount: number, level: number) => {
    if (selectedSlotIndex === null) return

    try {
      setIsProcessing(true)
      setVestError("")

      await vestShares(selectedSlotIndex, amount, level)

      // Record transaction
      if (typeof addTransaction === "function") {
        const holdDays = getHoldPeriodForLevel(level)
        await addTransaction({
          type: "VEST",
          account: "Hold Wallet (Pre-Hold)",
          amount: amount,
          amountUsd: amount * 100, // Assuming N$100 per share
          description: `Vested ${amount} shares in Slot ${selectedSlotIndex + 1} (${VESTING_LEVELS[level as keyof typeof VESTING_LEVELS].name}, ${holdDays} days)`,
        })
      }
    } catch (error) {
      console.error("Vest failed:", error)
      setVestError(`Vesting failed: ${error.message || "Unknown error"}`)
      throw error // Re-throw so modal can handle it
    } finally {
      setIsProcessing(false)
    }
  }

  const totalVesting = getTotalVestingInProgress()
  const totalClaimable = getTotalClaimableShares()

  return (
    <div className="h-[calc(100vh-130px)] bg-gray-900 overflow-auto">
      {/* Page Title */}
      <div className="px-6 mb-2">
        <h1 className="text-2xl font-bold text-slate-100">Vesting Schedules</h1>
        <p className="text-slate-400 text-sm">Lock shares with different hold periods based on investment level</p>
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
              <div className="text-xl font-bold text-blue-400">{holdWalletPreHold}</div>
              <div className="text-xs text-slate-500">shares</div>
            </div>
            <div>
              <div className="text-slate-400">Currently Vesting</div>
              <div className="text-xl font-bold text-yellow-400">{totalVesting}</div>
              <div className="text-xs text-slate-500">shares</div>
            </div>
            <div>
              <div className="text-slate-400">Ready to Claim</div>
              <div className="text-xl font-bold text-green-400">{totalClaimable}</div>
              <div className="text-xs text-slate-500">shares</div>
            </div>
            <div>
              <div className="text-slate-400">Post-Hold</div>
              <div className="text-xl font-bold text-purple-400">{holdWalletPostHold}</div>
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
              <span className="text-xs opacity-75">1-50 shares</span>
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
              <span className="text-xs opacity-75">51-500 shares</span>
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
              <span className="text-xs opacity-75">501+ shares</span>
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

      {/* Vesting Slots - Now 6 slots */}
      <div className="px-6 pb-6">
        <h3 className="text-lg font-medium mb-4 text-slate-100">Your Vesting Slots (6 Available)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vestingSlots.map((slot, index) => (
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
              • <strong>Vest:</strong> Lock shares from your Pre-Hold balance for 5 days (Retail), 30 days (Small
              Business), or 90 days (Corporate)
            </p>
            <p>
              • <strong>Hold Periods:</strong> Retail (5 days), Small Business (30 days), Corporate (90 days)
            </p>
            <p>
              • <strong>Levels:</strong> Choose based on amount - Retail (1-50), Small Business (51-500), Corporate
              (501+)
            </p>
            <p>
              • <strong>Progress:</strong> Watch your shares vest over the selected period
            </p>
            <p>
              • <strong>Claim:</strong> After the hold period, claim your shares to your Post-Hold balance
            </p>
            <p>
              • <strong>Slots:</strong> You can use up to 6 vesting slots simultaneously
            </p>
            <p>
              • <strong>Exchange:</strong> Only Post-Hold shares can be sold on the exchange
            </p>
          </div>
        </div>
      </div>

      {/* Vest Confirmation Modal */}
      <VestConfirmationModal
        isOpen={showVestModal}
        onClose={() => setShowVestModal(false)}
        onConfirm={handleVestConfirm}
        availableShares={holdWalletPreHold}
        slotIndex={selectedSlotIndex || 0}
      />

      {/* Legacy confirmation dialogs - keeping for backward compatibility */}
      {showActivateConfirmation && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-100">Confirm Activation</h3>
              <button
                onClick={() => setShowActivateConfirmation(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <p className="text-slate-100 mb-2">
                This transaction is irreversible. {getActivationCost()} AFT will be deducted from your wallet.
              </p>
              <p className="text-yellow-300 text-sm">Are you sure you want to proceed?</p>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setShowActivateConfirmation(false)}
                className="flex-1 bg-slate-600 hover:bg-slate-500 text-slate-100 py-2 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmActivate}
                disabled={isProcessing}
                className={`flex-1 py-2 rounded-md font-medium transition-colors ${
                  isProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {isProcessing ? "Processing..." : "Proceed"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invest Confirmation Dialog */}
      {showInvestConfirmation && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-100">Confirm Investment</h3>
              <button onClick={() => setShowInvestConfirmation(false)} className="text-slate-400 hover:text-slate-200">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <p className="text-slate-100 mb-2">
                This transaction is irreversible. {getInvestmentCost()} PWT will be deducted from your PWT Invest
                wallet.
              </p>
              <p className="text-yellow-300 text-sm">Are you sure you want to proceed?</p>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setShowInvestConfirmation(false)}
                className="flex-1 bg-slate-600 hover:bg-slate-500 text-slate-100 py-2 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmInvest}
                disabled={isProcessing}
                className={`flex-1 py-2 rounded-md font-medium transition-colors ${
                  isProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {isProcessing ? "Processing..." : "Proceed"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confetti Celebration */}
      {showConfetti && <Celebration onComplete={() => setShowConfetti(false)} />}
    </div>
  )
}
