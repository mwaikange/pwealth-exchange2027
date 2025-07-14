"use client"

import { useState } from "react"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, Info, XCircle } from "lucide-react" // Import Lucide icons
import { useVesting, VESTING_LEVELS, type VestingSchedule, type VestingSlotStatus } from "@/contexts/vesting-context"
import { useWallet, formatShares } from "@/contexts/wallet-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function VestingSchedules() {
  const { vestingSchedules, loading, error, activateVesting, claimVesting } = useVesting()
  const { holdWalletPreHold, loading: walletLoading } = useWallet()
  const [activeTab, setActiveTab] = useState<keyof typeof VESTING_LEVELS>(1)
  const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false)
  const [sharesToVest, setSharesToVest] = useState("")
  const [selectedLevel, setSelectedLevel] = useState<keyof typeof VESTING_LEVELS | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleActivateClick = (level: keyof typeof VESTING_LEVELS) => {
    setSelectedLevel(level)
    setIsActivateDialogOpen(true)
  }

  const handleConfirmActivate = async () => {
    if (!selectedLevel) return
    const shares = Number.parseFloat(sharesToVest)
    if (isNaN(shares) || shares <= 0) {
      setMessage({ type: "error", text: "Please enter a valid amount of shares." })
      return
    }
    if (shares > holdWalletPreHold) {
      setMessage({ type: "error", text: "Insufficient shares in your Pre-Hold wallet." })
      return
    }

    setMessage(null)
    const result = await activateVesting(selectedLevel, shares)
    setMessage({ type: result.success ? "success" : "error", text: result.message })
    if (result.success) {
      setIsActivateDialogOpen(false)
      setSharesToVest("")
    }
  }

  const handleClaimClick = async (scheduleId: string) => {
    setMessage(null)
    const result = await claimVesting(scheduleId)
    setMessage({ type: result.success ? "success" : "error", text: result.message })
  }

  const getStatusColor = (status: VestingSlotStatus) => {
    switch (status) {
      case "in_progress":
        return "border-blue-500"
      case "claimable":
        return "border-green-500"
      case "claimed":
        return "border-gray-500"
      case "empty":
      default:
        return "border-gray-700"
    }
  }

  const getProgressBarColor = (status: VestingSlotStatus) => {
    switch (status) {
      case "in_progress":
        return "bg-blue-500"
      case "claimable":
      case "claimed":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const getProgressValue = (schedule: VestingSchedule) => {
    const startDate = new Date(schedule.start_date).getTime()
    const endDate = new Date(schedule.end_date).getTime()
    const now = Date.now()

    if (now >= endDate) return 100 // Fully matured
    if (now < startDate) return 0 // Not started yet

    const elapsed = now - startDate
    const totalDuration = endDate - startDate
    return Math.min(100, (elapsed / totalDuration) * 100)
  }

  const getMaturityDate = (schedule: VestingSchedule) => {
    const endDate = new Date(schedule.end_date)
    return endDate.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
  }

  const getMaturityYield = (schedule: VestingSchedule) => {
    const levelConfig = VESTING_LEVELS[schedule.level]
    return levelConfig ? `${levelConfig.yieldTokens} PWT tokens` : "N/A"
  }

  if (loading || walletLoading) {
    return (
      <div className="p-6 text-white flex justify-center items-center h-64">
        <Info className="h-6 w-6 animate-spin mr-2" /> Loading vesting schedules...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>Error: {error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const filteredSchedules = vestingSchedules.filter((s) => s.level === activeTab)

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Vesting Schedules</h1>
        <p className="text-gray-400">Manage your investment schedules and claim your yields.</p>
      </div>

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"} className="mb-4">
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
        <div className="flex border-b border-slate-700">
          {Object.entries(VESTING_LEVELS).map(([level, config]) => (
            <button
              key={level}
              onClick={() => setActiveTab(Number.parseInt(level) as keyof typeof VESTING_LEVELS)}
              className={`flex-1 py-3 px-4 font-medium transition-colors ${
                activeTab === Number.parseInt(level)
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {config.name.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="space-y-4 p-4">
          {filteredSchedules.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No active vesting schedules for {VESTING_LEVELS[activeTab].name}.
              <br />
              <Button
                onClick={() => handleActivateClick(activeTab)}
                className="mt-4 bg-green-600 hover:bg-green-700 text-white"
              >
                Activate New Schedule
              </Button>
            </div>
          )}

          {filteredSchedules.map((schedule) => {
            const progress = getProgressValue(schedule)
            const isClaimed = schedule.status === "claimed"
            const isClaimable = schedule.status === "claimable"
            const isInProgress = schedule.status === "in_progress"
            const levelConfig = VESTING_LEVELS[schedule.level]

            return (
              <div
                key={schedule.id}
                className={`border-l-4 ${getStatusColor(schedule.status)} bg-slate-700 p-4 rounded-r-lg shadow-md`}
              >
                <div className="flex items-start">
                  <div className="mr-4 flex-shrink-0">
                    <div className="text-sm text-gray-400">Maturity Date: {getMaturityDate(schedule)}</div>
                    <div className="w-10 h-10 rounded-full bg-gray-600 text-white flex items-center justify-center font-bold my-2">
                      {schedule.level}
                    </div>
                    {progress > 0 && (
                      <div className="text-sm">
                        Maturity Yield: {getMaturityYield(schedule)}{" "}
                        {isClaimed && <span className="text-green-500">(Claimed)</span>}
                      </div>
                    )}
                    <div className="text-xs mt-2 text-gray-400">
                      {levelConfig.yieldTokens} PWT tokens every day for {levelConfig.holdDays} days!
                      <br />
                      Vesting Schedule Activation Fee: {levelConfig.activationFeeUSD} USD
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between mb-2">
                      <div className="text-sm text-gray-300">
                        {levelConfig.name} - {formatShares(schedule.shares_vested)} shares
                      </div>
                      <div className="text-sm font-bold text-white">{Math.floor(progress)}%</div>
                    </div>

                    <Progress value={progress} className="h-4 mb-4 [&>div]:bg-green-500" />

                    <div className="flex justify-end space-x-2 mt-2">
                      {schedule.activation_fee_paid && (
                        <div className="flex items-center text-sm text-gray-300">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-1" /> Fee Paid
                        </div>
                      )}
                      {progress > 0 && (
                        <div className="flex items-center text-sm text-gray-300">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-1" /> Invested
                        </div>
                      )}

                      <Button
                        onClick={() => handleClaimClick(schedule.id)}
                        disabled={!isClaimable || isClaimed}
                        className={`px-4 py-1 rounded text-sm ${
                          isClaimed
                            ? "bg-gray-500 text-gray-300 cursor-not-allowed"
                            : isClaimable
                              ? "bg-green-600 hover:bg-green-700 text-white"
                              : "bg-blue-600 text-white cursor-not-allowed"
                        }`}
                      >
                        {isClaimed ? "Claimed" : isClaimable ? "Claim" : "In Progress"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          {/* Button to activate new schedule if there are existing schedules for the level */}
          {filteredSchedules.length > 0 && (
            <div className="text-center pt-4">
              <Button
                onClick={() => handleActivateClick(activeTab)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Activate Another Schedule
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Activate Vesting Dialog */}
      <Dialog open={isActivateDialogOpen} onOpenChange={setIsActivateDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-slate-800 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Activate {VESTING_LEVELS[selectedLevel!].name} Vesting</DialogTitle>
            <DialogDescription className="text-gray-400">
              Lock shares for {VESTING_LEVELS[selectedLevel!].holdDays} days to earn{" "}
              {VESTING_LEVELS[selectedLevel!].yieldTokens} PWT tokens.
              <br />
              Activation Fee: {VESTING_LEVELS[selectedLevel!].activationFeeUSD} USD
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shares" className="text-right text-gray-300">
                Shares
              </Label>
              <Input
                id="shares"
                type="number"
                value={sharesToVest}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === "" || Number(value) >= 0) {
                    setSharesToVest(value)
                  }
                }}
                placeholder="Shares to vest"
                className="col-span-3 bg-slate-700 border-slate-600 text-white"
                min="0"
                step="0.0001"
              />
            </div>
            <div className="text-sm text-gray-400 text-center">
              Available in Pre-Hold Wallet: {formatShares(holdWalletPreHold)} shares
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleConfirmActivate}
              disabled={Number.parseFloat(sharesToVest) <= 0 || Number.parseFloat(sharesToVest) > holdWalletPreHold}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Confirm Activation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
