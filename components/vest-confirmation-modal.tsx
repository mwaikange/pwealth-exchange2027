"use client"

import type React from "react"

import { useState } from "react"
import { X, AlertTriangle, Loader2, Clock } from "lucide-react"
import { VESTING_LEVELS } from "@/contexts/vesting-context"

interface VestConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (amount: number) => Promise<void>
  availableShares: number
  slotIndex: number
  fixedLevel: number // The level is now fixed based on which tab the user clicked from
}

export function VestConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  availableShares,
  slotIndex,
  fixedLevel,
}: VestConfirmationModalProps) {
  const [amount, setAmount] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")

  if (!isOpen) return null

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, "")
    setAmount(value)
    setError("")
  }

  const validateAmount = () => {
    const numAmount = Number(amount)

    if (!amount || numAmount <= 0) {
      return "Please enter a valid amount"
    }

    if (numAmount > availableShares) {
      return `Insufficient shares. You have ${availableShares} shares available`
    }

    const levelConfig = VESTING_LEVELS[fixedLevel as keyof typeof VESTING_LEVELS]
    if (numAmount < levelConfig.min) {
      return `Minimum ${levelConfig.min} shares required for ${levelConfig.name} level`
    }

    if (numAmount > levelConfig.max) {
      return `Maximum ${levelConfig.max} shares allowed for ${levelConfig.name} level`
    }

    return null
  }

  const handleConfirm = async () => {
    const validationError = validateAmount()
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setIsProcessing(true)
      await onConfirm(Number(amount))
      setAmount("")
      setError("")
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    if (!isProcessing) {
      setAmount("")
      setError("")
      onClose()
    }
  }

  const levelConfig = VESTING_LEVELS[fixedLevel as keyof typeof VESTING_LEVELS]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg w-full max-w-lg mx-4 border border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h3 className="text-xl font-bold text-slate-100">Vest Shares - Slot {slotIndex + 1}</h3>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-200" disabled={isProcessing}>
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          <div className="bg-slate-700 rounded-lg p-2">
            <div className="text-xs text-slate-300">Available Shares (Pre-Hold)</div>
            <div className="text-xl font-bold text-blue-400">{availableShares}</div>
          </div>

          <div className="bg-blue-500/20 border border-blue-500 rounded-md p-2">
            <div className="text-xs font-medium text-blue-300 mb-1">Vesting Level (Fixed)</div>
            <div className="text-base font-bold text-blue-100">
              Level {fixedLevel} - {levelConfig.name}
            </div>
            <div className="text-xs text-blue-300">
              {levelConfig.min}-{levelConfig.max === Number.POSITIVE_INFINITY ? "∞" : levelConfig.max} shares
            </div>
          </div>

          <div className="bg-yellow-500/20 border border-yellow-500 rounded-md p-2">
            <div className="flex items-center text-yellow-400 text-xs">
              <Clock className="w-3 h-3 mr-1" />
              <div>
                <div className="font-medium">
                  {levelConfig.name} Hold Period: {levelConfig.holdDays} days
                </div>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Number of Shares to Vest</label>
            <input
              type="text"
              value={amount}
              onChange={handleAmountChange}
              placeholder={`Enter ${levelConfig.min}-${levelConfig.max === Number.POSITIVE_INFINITY ? "∞" : levelConfig.max} shares`}
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100 placeholder-slate-400"
              disabled={isProcessing}
            />
            <div className="text-xs text-slate-400 mt-1">
              {levelConfig.name} level: {levelConfig.min} -{" "}
              {levelConfig.max === Number.POSITIVE_INFINITY ? "unlimited" : levelConfig.max} shares
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-md p-3 flex items-center text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}

          <div className="bg-orange-500/20 border border-orange-500 rounded-md p-2">
            <div className="flex items-start">
              <AlertTriangle className="w-3 h-3 text-orange-500 mr-1 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-orange-200">
                <div className="font-medium mb-1">Important Notice:</div>
                <div className="space-y-0.5">
                  <div>• Shares deducted from Pre-Hold balance</div>
                  <div>• Locked for {levelConfig.holdDays} days</div>
                  <div>• Claim to Post-Hold after {levelConfig.holdDays} days</div>
                  <div>• Action cannot be reversed</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-slate-700">
          <button
            onClick={handleClose}
            className="flex-1 bg-slate-600 hover:bg-slate-500 text-slate-100 py-2 px-3 rounded-md text-sm font-medium transition-colors"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Processing...
              </>
            ) : (
              `Vest ${levelConfig.holdDays}d`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
