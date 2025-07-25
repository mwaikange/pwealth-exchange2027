"use client"

import { useState, useEffect } from "react"
import { X, AlertTriangle, Info } from "lucide-react"
import { useWallet } from "@/contexts/wallet-context"
import { useNotification } from "@/hooks/use-notification"

interface VestConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (amount: number) => void
  level: number
  slotIndex: number
  maxAmount: number
}

export function VestConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  level,
  slotIndex,
  maxAmount,
}: VestConfirmationModalProps) {
  const [amount, setAmount] = useState("")
  const [isValid, setIsValid] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const { preHoldBalance } = useWallet()
  const { showNotification } = useNotification()

  // Get level info
  const getLevelInfo = (level: number) => {
    switch (level) {
      case 1:
        return { name: "Retail", days: 5, min: 1, max: 50 }
      case 2:
        return { name: "Small Business", days: 30, min: 51, max: 500 }
      case 3:
        return { name: "Corporate", days: 90, min: 501, max: Number.POSITIVE_INFINITY }
      default:
        return { name: "Retail", days: 5, min: 1, max: 50 }
    }
  }

  const levelInfo = getLevelInfo(level)

  // Validate amount
  useEffect(() => {
    const numAmount = Number.parseFloat(amount)

    if (!amount || isNaN(numAmount)) {
      setIsValid(false)
      setErrorMessage("")
      return
    }

    if (numAmount <= 0) {
      setIsValid(false)
      setErrorMessage("Amount must be greater than 0")
      return
    }

    if (numAmount > preHoldBalance) {
      setIsValid(false)
      setErrorMessage("Insufficient pre-hold balance")
      return
    }

    if (numAmount < levelInfo.min) {
      setIsValid(false)
      setErrorMessage(`${levelInfo.name} level requires minimum ${levelInfo.min} shares`)
      return
    }

    if (levelInfo.max !== Number.POSITIVE_INFINITY && numAmount > levelInfo.max) {
      setIsValid(false)
      setErrorMessage(`${levelInfo.name} level allows maximum ${levelInfo.max} shares`)
      return
    }

    setIsValid(true)
    setErrorMessage("")
  }, [amount, preHoldBalance, levelInfo])

  const handleConfirm = () => {
    if (isValid) {
      const numAmount = Number.parseFloat(amount)
      onConfirm(numAmount)
      showNotification("success", `Successfully vested ${numAmount.toFixed(4)} shares in Slot ${slotIndex + 1}`)
      onClose()
      setAmount("")
    }
  }

  const handleClose = () => {
    onClose()
    setAmount("")
    setErrorMessage("")
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          {/* Fix: Display 1-based indexing (slotIndex + 1) */}
          <h3 className="text-lg font-semibold text-white">Vest Shares - Slot {slotIndex + 1}</h3>
          <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <div className="text-sm text-slate-300 mb-2">Available Balance</div>
          <div className="text-2xl font-bold text-blue-400">{preHoldBalance.toFixed(4)}</div>
        </div>

        <div className="mb-4">
          <div className="bg-slate-700 rounded-lg p-3 mb-3">
            <div className="text-sm font-medium text-slate-200 mb-1">
              Level {level} - {levelInfo.name}
            </div>
            <div className="text-xs text-slate-400">
              {levelInfo.min === 501 ? "501+ shares" : `${levelInfo.min}-${levelInfo.max} shares`}
            </div>
          </div>

          <div className="bg-yellow-900/30 border border-yellow-600/30 rounded-lg p-3">
            <div className="text-xs text-yellow-300 font-medium mb-1">
              {levelInfo.name} Hold Period: {levelInfo.days} days
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">Number of Shares to Vest</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Enter ${levelInfo.min === 501 ? "501+" : `${levelInfo.min}-${levelInfo.max}`} shares`}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min={levelInfo.min}
            max={levelInfo.max === Number.POSITIVE_INFINITY ? undefined : levelInfo.max}
            step="0.0001"
          />
          {errorMessage && (
            <div className="mt-2 text-sm text-red-400 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1" />
              {errorMessage}
            </div>
          )}
        </div>

        <div className="bg-orange-900/30 border border-orange-600/30 rounded-lg p-3 mb-6">
          <div className="flex items-start">
            <Info className="w-4 h-4 text-orange-400 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-orange-300">
              <div className="font-medium mb-1">Important Notice:</div>
              <ul className="space-y-1">
                <li>• Shares deducted from Pre-Hold balance</li>
                <li>• Locked for {levelInfo.days} days</li>
                <li>• Claim to Post-Hold after {levelInfo.days} days</li>
                <li>• Action cannot be reversed</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              isValid ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-slate-600 text-slate-400 cursor-not-allowed"
            }`}
          >
            Vest {amount ? Number.parseFloat(amount).toFixed(4) : ""}
          </button>
        </div>
      </div>
    </div>
  )
}
