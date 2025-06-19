"use client"

import { useState, useEffect } from "react"
import { Check } from "lucide-react"
import { useWallet } from "@/contexts/wallet-context"
import { useVesting } from "@/contexts/vesting-context"
import { useTransactions } from "@/contexts/transaction-context" // Import useTransactions directly
import Celebration from "@/components/celebration"
import { VestingSlot } from "@/components/vesting-slot"
import { AlertCircle } from "lucide-react"

export default function Vesting() {
  const [activeTab, setActiveTab] = useState("LEVEL 1")
  const [vestError, setVestError] = useState("")
  const [claimSuccess, setClaimSuccess] = useState("")
  const [activateError, setActivateError] = useState("")
  const [investError, setInvestError] = useState("")
  const [claimError, setClaimError] = useState("")

  const [showActivateConfirmation, setShowActivateConfirmation] = useState(false)
  const [showInvestConfirmation, setShowInvestConfirmation] = useState(false)
  const [pendingScheduleId, setPendingScheduleId] = useState<string | null>(null)
  const [slotIndex, setSlotIndex] = useState<number | null>(null) // Declare slotIndex variable

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
    return Number.parseInt(activeTab.split(" ")[1])
  }

  // Get schedules for the active level
  const activeSchedules = getSchedulesByLevel(getActiveLevel())

  // Function to get the circle number based on active tab
  const getCircleNumber = () => {
    switch (activeTab) {
      case "LEVEL 1":
        return "2"
      case "LEVEL 2":
        return "4"
      case "LEVEL 3":
        return "8"
      default:
        return "2"
    }
  }

  // Function to get the activation cost based on active tab
  const getActivationCost = () => {
    switch (activeTab) {
      case "LEVEL 1":
        return 2
      case "LEVEL 2":
        return 4
      case "LEVEL 3":
        return 8
      default:
        return 2
    }
  }

  // Function to get the investment cost based on active tab
  const getInvestmentCost = () => {
    switch (activeTab) {
      case "LEVEL 1":
        return 2
      case "LEVEL 2":
        return 4
      case "LEVEL 3":
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

  // Update the handleClaim function to only show confetti at 100% maturity
  // Find the handleClaim function and replace it with this updated version:

  const handleClaimSlot = async (slotIndex: number) => {
    if (isProcessing) return

    try {
      setIsProcessing(true) // Set processing to true at the start
      const slot = vestingSlots[slotIndex]
      await claimShares(slotIndex)

      setClaimSuccess(`Successfully claimed ${slot.amount} shares from Slot ${slotIndex + 1}!`)
    } catch (error) {
      console.error("Claim failed:", error)
      setVestError(`Claim failed: ${error.message || "Unknown error"}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle vest action
  const handleVestSlot = async (slotIndex: number, amount: number) => {
    if (isProcessing) return

    try {
      setIsProcessing(true)
      setVestError("")

      // Check if user has enough shares in pre-hold
      const availableShares = holdWalletPreHold
      if (amount > availableShares) {
        setVestError(`Insufficient shares. You have ${availableShares} shares available in your Hold Wallet.`)
        return
      }

      await vestShares(slotIndex, amount)
    } catch (error) {
      console.error("Vest failed:", error)
      setVestError(`Vesting failed: ${error.message || "Unknown error"}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const totalVesting = getTotalVestingInProgress()
  const totalClaimable = getTotalClaimableShares()

  return (
    <div className="h-[calc(100vh-130px)] bg-[#1c1e26] overflow-auto">
      {/* Page Title - adjusted to match other pages */}
      <div className="px-6 mb-2">
        <h1 className="text-2xl font-bold">Vesting Schedules</h1>
        <p className="text-gray-400 text-sm">Manage your investment schedules</p>
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
        <div className="bg-[#2a2d3a] rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-medium mb-3">Hold Wallet Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Available (Pre-Hold)</div>
              <div className="text-xl font-bold text-blue-400">{holdWalletPreHold}</div>
              <div className="text-xs text-gray-500">shares</div>
            </div>
            <div>
              <div className="text-gray-400">Currently Vesting</div>
              <div className="text-xl font-bold text-yellow-400">{totalVesting}</div>
              <div className="text-xs text-gray-500">shares</div>
            </div>
            <div>
              <div className="text-gray-400">Ready to Claim</div>
              <div className="text-xl font-bold text-green-400">{totalClaimable}</div>
              <div className="text-xs text-gray-500">shares</div>
            </div>
            <div>
              <div className="text-gray-400">Post-Hold</div>
              <div className="text-xl font-bold text-purple-400">{holdWalletPostHold}</div>
              <div className="text-xs text-gray-500">shares</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 mt-2">
        <div
          className="bg-[#1c1e26] rounded-lg overflow-hidden"
          style={{ transform: "scale(0.95)", transformOrigin: "top left", width: "105%" }}
        >
          <div className="flex mb-px">
            <button
              className={`flex-1 py-0 px-4 font-medium text-sm rounded-t-lg ${
                activeTab === "LEVEL 1" ? "bg-[#4285f4] text-white" : "bg-[#1e1e21] text-gray-400"
              }`}
              onClick={() => setActiveTab("LEVEL 1")}
            >
              LEVEL 1
            </button>
            <button
              className={`flex-1 py-0 px-4 font-medium text-sm rounded-t-lg ${
                activeTab === "LEVEL 2" ? "bg-[#4285f4] text-white" : "bg-[#1e1e21] text-gray-400"
              }`}
              onClick={() => setActiveTab("LEVEL 2")}
            >
              LEVEL 2
            </button>
            <button
              className={`flex-1 py-0 px-4 font-medium text-sm rounded-t-lg ${
                activeTab === "LEVEL 3" ? "bg-[#4285f4] text-white" : "bg-[#1e1e21] text-gray-400"
              }`}
              onClick={() => setActiveTab("LEVEL 3")}
            >
              LEVEL 3
            </button>
          </div>

          {/* Vesting Schedule Cards - with left alignment adjusted */}
          <div className="space-y-[6px] pl-0">
            {activeSchedules.map((schedule, index) => (
              <div
                key={schedule.id}
                className={`border-l-4 ${
                  schedule.color === "green-500"
                    ? "border-green-500 border-b-green-500"
                    : schedule.color === "blue-500"
                      ? "border-blue-500 border-b-blue-500"
                      : schedule.color === "pink-500"
                        ? "border-pink-500 border-b-pink-500"
                        : schedule.color === "yellow-500"
                          ? "border-yellow-500 border-b-yellow-500"
                          : schedule.color === "red-500"
                            ? "border-red-500 border-b-red-500"
                            : "border-gray-500 border-b-gray-500"
                } bg-[#1c1e26] relative border-b-2`}
              >
                <div className="flex py-2 px-4">
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-600"></div>
                  <div className="absolute left-[10px] top-1/2 transform -translate-y-1/2">
                    {/* Vertical line running through the circle */}
                    <div className="absolute left-[21px] top-[-10px] w-[1px] h-[60px] bg-gray-600 z-0"></div>
                    {/* Circle with number */}
                    <div className="relative w-[42px] h-[42px] rounded-full bg-gray-300 text-black flex items-center justify-center font-bold text-2xl z-10">
                      {getCircleNumber()}
                    </div>
                  </div>

                  <div className="ml-20 flex-1">
                    <div className="flex justify-between items-start">
                      <div className="text-xs text-gray-300">
                        {schedule.invested
                          ? `Maturity Date -${formatMaturityDate(schedule.startTime)} | Expected Yield ${getMaxYieldAmount(schedule.level)} PWT-Cashout`
                          : "| Maturity Date -Not set | Not Set | No expectation"}
                      </div>
                      <div className="text-xs font-medium">|{schedule.id}</div>
                    </div>

                    <div className="mt-1.5 w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={
                          schedule.progress > 0 ? "bg-green-500 h-2 rounded-full" : "bg-white h-2 rounded-full"
                        }
                        style={{ width: `${schedule.progress}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between mt-0.5">
                      {schedule.progress > 0 && (
                        <div className="text-xs">
                          {schedule.claimed ? (
                            <>
                              Maturity Yield: {getYieldAmount(schedule.level, schedule.progress)} tokens |{" "}
                              {schedule.prematurelyClaimed ? (
                                <span className="text-red-400">(Claimed before maturity)</span>
                              ) : (
                                <span className="text-green-500">(Claimed on maturity)</span>
                              )}
                            </>
                          ) : (
                            <>Maturity Yield: {getYieldAmount(schedule.level, schedule.progress)} tokens |</>
                          )}
                        </div>
                      )}
                      {schedule.progress === 0 && <div className="text-xs">&nbsp;</div>}
                      <div className="text-xs font-bold text-green-500">
                        {schedule.progress > 0 ? `${schedule.progress}%` : ""}
                      </div>
                    </div>

                    <div className="text-[10px] text-gray-300 mt-0.5">
                      Earn {getCircleNumber()} PWT tokens every 24 hours for 5 days | Claim anytime | Premature claims
                      end vesting schedule | Vesting Schedule Activation Fee is {getActivationCost()} USD in AFT Tokens
                    </div>
                  </div>

                  <div className="ml-4 flex flex-col justify-between items-end">
                    {/* Activate Fee Button */}
                    <div className="flex items-center mb-1">
                      {schedule.activated ? (
                        <>
                          <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center mr-1.5">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                          <button className="w-20 py-0.5 rounded text-[10px] bg-gray-500 text-green-300">
                            Fee Paid
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="w-4 mr-1.5"></div>
                          <button
                            onClick={() => handleActivate(schedule.id)}
                            disabled={isProcessing}
                            className={`w-20 py-0.5 rounded text-[10px] ${
                              isProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-white text-black"
                            }`}
                          >
                            {isProcessing ? "Wait..." : "Activate"}
                          </button>
                        </>
                      )}
                    </div>

                    {/* Invest Button */}
                    <div className="flex items-center mb-1">
                      {schedule.invested ? (
                        <>
                          <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center mr-1.5">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                          <button className="w-20 py-0.5 rounded text-[10px] bg-gray-500 text-green-300">
                            Invested
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="w-4 mr-1.5"></div>
                          <button
                            onClick={() => handleInvest(schedule.id)}
                            disabled={!schedule.activated || isProcessing}
                            className={`w-20 py-0.5 rounded text-[10px] ${
                              !schedule.activated || isProcessing
                                ? "bg-gray-600 text-white cursor-not-allowed"
                                : "bg-white text-black"
                            }`}
                          >
                            {isProcessing ? "Wait..." : "Invest"}
                          </button>
                        </>
                      )}
                    </div>

                    {/* Claim Button */}
                    <div className="flex items-center">
                      {schedule.claimed ? (
                        <>
                          <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center mr-1.5">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                          <button className="w-20 py-0.5 rounded text-[10px] bg-gray-500 text-green-300">
                            Claimed
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="w-4 mr-1.5"></div>
                          <button
                            onClick={() => {
                              setSlotIndex(index)
                              handleClaimSlot(index)
                            }}
                            disabled={!schedule.invested || schedule.progress < 20 || isProcessing}
                            className={`w-20 py-0.5 rounded text-[10px] ${
                              !schedule.invested || schedule.progress < 20 || isProcessing
                                ? "bg-gray-600 text-white cursor-not-allowed"
                                : "bg-white text-black"
                            }`}
                          >
                            {isProcessing ? "Wait..." : "Claim"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Vesting Slots */}
      <div className="px-6 pb-6">
        <h3 className="text-lg font-medium mb-4">Your Vesting Slots (5 Available)</h3>
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
        <div className="bg-[#2a2d3a] rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-medium mb-3">How Vesting Works</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <p>
              • <strong>Vest:</strong> Lock shares from your Pre-Hold balance for exactly 5 days
            </p>
            <p>
              • <strong>Progress:</strong> Watch your shares vest over the 5-day period
            </p>
            <p>
              • <strong>Claim:</strong> After 5 days, claim your shares to your Post-Hold balance
            </p>
            <p>
              • <strong>Slots:</strong> You can use up to 5 vesting slots simultaneously
            </p>
            <p>
              • <strong>Exchange:</strong> Only Post-Hold shares can be sold on the exchange
            </p>
          </div>
        </div>
      </div>

      {/* Activate Confirmation Dialog */}
      {showActivateConfirmation && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
          <div className="bg-[#2a2d3a] border border-gray-700 rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Confirm Activation</h3>
              <button onClick={() => setShowActivateConfirmation(false)} className="text-gray-400 hover:text-white">
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
              <p className="text-white mb-2">
                This transaction is irreversible. {getActivationCost()} AFT will be deducted from your wallet.
              </p>
              <p className="text-yellow-300 text-sm">Are you sure you want to proceed?</p>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setShowActivateConfirmation(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmActivate}
                disabled={isProcessing}
                className={`flex-1 py-2 rounded-md font-medium transition-colors ${
                  isProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-[#34a853] hover:bg-green-600 text-white"
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
          <div className="bg-[#2a2d3a] border border-gray-700 rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Confirm Investment</h3>
              <button onClick={() => setShowInvestConfirmation(false)} className="text-gray-400 hover:text-white">
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
              <p className="text-white mb-2">
                This transaction is irreversible. {getInvestmentCost()} PWT will be deducted from your PWT Invest
                wallet.
              </p>
              <p className="text-yellow-300 text-sm">Are you sure you want to proceed?</p>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setShowInvestConfirmation(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmInvest}
                disabled={isProcessing}
                className={`flex-1 py-2 rounded-md font-medium transition-colors ${
                  isProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-[#34a853] hover:bg-green-600 text-white"
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

// Function to format maturity date
const formatMaturityDate = (startTime) => {
  if (!startTime) return "Not set | Not Set"

  // Add 5 days (for live production)
  const maturityTime = new Date(startTime + 5 * 24 * 60 * 60 * 1000)

  // Format as DD/MM/YYYY | HH:MM:SS am/pm
  const day = maturityTime.getDate().toString().padStart(2, "0")
  const month = (maturityTime.getMonth() + 1).toString().padStart(2, "0")
  const year = maturityTime.getFullYear()

  const hours = maturityTime.getHours() % 12 || 12
  const minutes = maturityTime.getMinutes().toString().padStart(2, "0")
  const seconds = maturityTime.getSeconds().toString().padStart(2, "0")
  const ampm = maturityTime.getHours() >= 12 ? "pm" : "am"

  return `${day}/${month}/${year} | ${hours}:${minutes}:${seconds} ${ampm}`
}
