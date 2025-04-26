"use client"

import { useState, useEffect } from "react"
import { Check } from "lucide-react"
import { useWallet } from "@/contexts/wallet-context"
import { useVesting } from "@/contexts/vesting-context"
import { useTransactions } from "@/contexts/transaction-context"

export default function Vesting() {
  const [activeTab, setActiveTab] = useState("LEVEL 1")
  const [claimSuccess, setClaimSuccess] = useState("")
  const [activateSuccess, setActivateSuccess] = useState("")
  const [investSuccess, setInvestSuccess] = useState("")
  const [activateError, setActivateError] = useState("")
  const [investError, setInvestError] = useState("")
  const [claimError, setClaimError] = useState("")
  const [isActivating, setIsActivating] = useState(false)
  const [isInvesting, setIsInvesting] = useState(false)

  const [showActivateConfirmation, setShowActivateConfirmation] = useState(false)
  const [showInvestConfirmation, setShowInvestConfirmation] = useState(false)
  const [pendingScheduleId, setPendingScheduleId] = useState<string | null>(null)

  const { pwtInvestBalance, aftBalance, updateAftBalance, updatePwtInvestBalance } = useWallet()
  const { vestingSchedules, activateSchedule, investInSchedule, claimSchedule, getSchedulesByLevel } = useVesting()
  const { addTransaction } = useTransactions()

  // Clear messages after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (claimSuccess) setClaimSuccess("")
      if (activateSuccess) setActivateSuccess("")
      if (investSuccess) setInvestSuccess("")
      if (activateError) setActivateError("")
      if (investError) setInvestError("")
      if (claimError) setClaimError("")
    }, 5000)

    return () => clearTimeout(timer)
  }, [claimSuccess, activateSuccess, investSuccess, activateError, investError, claimError])

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

  // Handle activate button click
  const handleActivate = (scheduleId: string) => {
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

  // New function to handle confirmation
  const confirmActivate = async () => {
    if (!pendingScheduleId) return

    setIsActivating(true)
    try {
      const level = getActiveLevel()
      const cost = getActivationCost()

      console.log("Starting activation process for schedule:", pendingScheduleId)
      console.log("Activation cost:", cost)

      // First activate the schedule
      await activateSchedule(pendingScheduleId)
      console.log("Schedule activated successfully")

      // Update the AFT balance
      await updateAftBalance(cost, "subtract")
      console.log("AFT balance updated successfully")

      // Record the transaction
      const transactionData = {
        type: "ACTIVATE FEE",
        account: "AFT Wallet",
        amount: cost,
        amountUsd: cost,
        description: `ACTIVATE FEE -${pendingScheduleId}`,
      }
      console.log("Recording transaction:", transactionData)

      await addTransaction(transactionData)
      console.log("Transaction recorded successfully")

      // Show success message
      setActivateSuccess(`Successfully activated schedule ${pendingScheduleId}`)

      // Close the confirmation dialog
      setShowActivateConfirmation(false)
      setPendingScheduleId(null)
    } catch (error) {
      console.error("Activation process failed:", error)
      setActivateError(`Activation failed: ${error.message || "Unknown error"}`)
    } finally {
      setIsActivating(false)
    }
  }

  // Handle invest button click
  const handleInvest = (scheduleId: string) => {
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

  // New function to handle confirmation
  const confirmInvest = async () => {
    if (!pendingScheduleId) return

    setIsInvesting(true)
    try {
      const level = getActiveLevel()
      const cost = getInvestmentCost()

      console.log("Starting investment process for schedule:", pendingScheduleId)
      console.log("Investment cost:", cost)

      // First invest in the schedule
      await investInSchedule(pendingScheduleId)
      console.log("Schedule invested successfully")

      // Update the PWT Invest balance
      await updatePwtInvestBalance(cost, "subtract")
      console.log("PWT Invest balance updated successfully")

      // Record the transaction
      const transactionData = {
        type: "VESTING",
        account: "PWT Invest",
        amount: cost,
        amountUsd: cost * 10,
        description: `VESTING - ${pendingScheduleId}`,
      }
      console.log("Recording transaction:", transactionData)

      await addTransaction(transactionData)
      console.log("Transaction recorded successfully")

      // Show success message
      setInvestSuccess(`Successfully invested in schedule ${pendingScheduleId}`)

      // Close the confirmation dialog
      setShowInvestConfirmation(false)
      setPendingScheduleId(null)
    } catch (error) {
      console.error("Investment process failed:", error)
      setInvestError(`Investment failed: ${error.message || "Unknown error"}`)
    } finally {
      setIsInvesting(false)
    }
  }

  // Handle claim button click
  const handleClaim = (scheduleId, progress) => {
    const level = getActiveLevel()

    if (progress < 20) {
      setClaimError("Cannot claim until progress reaches 20%")
      return
    }

    claimSchedule(scheduleId)

    // Show success message
    const yieldAmount = getYieldAmount(level, progress)
    setClaimSuccess(`Successfully claimed ${yieldAmount} PWT from ${scheduleId}`)
  }

  // Format maturity date
  const formatMaturityDate = (startTime) => {
    if (!startTime) return "Not set | Not Set"

    // Add 10 minutes (for testing)
    const maturityTime = new Date(startTime + 10 * 60 * 1000)

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

  return (
    <div className="h-[calc(100vh-130px)] bg-[#1c1e26] overflow-hidden">
      {/* Page Title - adjusted to match other pages */}
      <div className="px-6 mb-2">
        <h1 className="text-2xl font-bold">Vesting Schedules</h1>
        <p className="text-gray-400 text-sm">Manage your investment schedules</p>
      </div>

      {/* Success and error messages */}
      {claimSuccess && <div className="mx-6 mb-2 p-2 bg-green-500 text-white text-sm rounded">{claimSuccess}</div>}
      {activateSuccess && (
        <div className="mx-6 mb-2 p-2 bg-green-500 text-white text-sm rounded">{activateSuccess}</div>
      )}
      {investSuccess && <div className="mx-6 mb-2 p-2 bg-green-500 text-white text-sm rounded">{investSuccess}</div>}
      {activateError && <div className="mx-6 mb-2 p-2 bg-red-500 text-white text-sm rounded">{activateError}</div>}
      {investError && <div className="mx-6 mb-2 p-2 bg-red-500 text-white text-sm rounded">{investError}</div>}
      {claimError && <div className="mx-6 mb-2 p-2 bg-red-500 text-white text-sm rounded">{claimError}</div>}

      <div className="px-6 mt-2">
        <div
          className="bg-[#1c1e26] rounded-lg overflow-hidden"
          style={{ transform: "scale(0.95)", transformOrigin: "top left", width: "105%" }}
        >
          {/* Tabs */}
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
            {activeSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className={`border-l-4 border-${schedule.color} bg-[#1c1e26] relative border-b-2 border-b-${schedule.color}`}
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
                        className={`bg-${schedule.progress > 0 ? "green-500" : "white"} h-2 rounded-full`}
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
                      Earn {getCircleNumber()} PWT tokens every 2 minutes for 10 minutes | Claim anytime | Premature
                      claims end vesting schedule | Vesting Schedule Activation Fee is {getActivationCost()} USD in AFT
                      Tokens
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
                            className="w-20 py-0.5 rounded text-[10px] bg-white text-black"
                          >
                            Activate
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
                            disabled={!schedule.activated}
                            className={`w-20 py-0.5 rounded text-[10px] ${
                              schedule.activated ? "bg-white text-black" : "bg-gray-600 text-white cursor-not-allowed"
                            }`}
                          >
                            Invest
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
                            onClick={() => handleClaim(schedule.id, schedule.progress)}
                            disabled={!schedule.invested || schedule.progress < 20}
                            className={`w-20 py-0.5 rounded text-[10px] ${
                              schedule.invested && schedule.progress >= 20
                                ? "bg-white text-black"
                                : "bg-gray-600 text-white cursor-not-allowed"
                            }`}
                          >
                            Claim
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

      {/* Activate Confirmation Dialog */}
      {showActivateConfirmation && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
          <div className="bg-[#2a2d3a] border border-gray-700 rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Confirm Activation</h3>
              <button
                onClick={() => setShowActivateConfirmation(false)}
                className="text-gray-400 hover:text-white"
                disabled={isActivating}
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
              <p className="text-white mb-2">
                This transaction is irreversible. {getActivationCost()} AFT will be deducted from your wallet.
              </p>
              <p className="text-yellow-300 text-sm">Are you sure you want to proceed?</p>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setShowActivateConfirmation(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-md font-medium transition-colors"
                disabled={isActivating}
              >
                Cancel
              </button>
              <button
                onClick={confirmActivate}
                className={`flex-1 ${isActivating ? "bg-gray-500" : "bg-[#34a853] hover:bg-green-600"} text-white py-2 rounded-md font-medium transition-colors flex justify-center items-center`}
                disabled={isActivating}
              >
                {isActivating ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  "Proceed"
                )}
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
              <button
                onClick={() => setShowInvestConfirmation(false)}
                className="text-gray-400 hover:text-white"
                disabled={isInvesting}
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
                disabled={isInvesting}
              >
                Cancel
              </button>
              <button
                onClick={confirmInvest}
                className={`flex-1 ${isInvesting ? "bg-gray-500" : "bg-[#34a853] hover:bg-green-600"} text-white py-2 rounded-md font-medium transition-colors flex justify-center items-center`}
                disabled={isInvesting}
              >
                {isInvesting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  "Proceed"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
