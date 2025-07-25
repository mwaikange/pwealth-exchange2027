"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, Lock } from "lucide-react"

interface VestConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (shares: number) => Promise<void>
  availableShares: number
  level: number
  slotNumber: number // 1-based slot number for display
  isProcessing?: boolean
}

export function VestConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  availableShares,
  level,
  slotNumber,
  isProcessing = false,
}: VestConfirmationModalProps) {
  const [shares, setShares] = useState("")
  const [error, setError] = useState("")

  const handleConfirm = async () => {
    const shareAmount = Number.parseFloat(shares)

    // Validation
    if (isNaN(shareAmount) || shareAmount <= 0) {
      setError("Please enter a valid positive number of shares")
      return
    }

    if (shareAmount > availableShares) {
      setError(`You only have ${availableShares.toFixed(4)} shares available`)
      return
    }

    try {
      setError("")
      await onConfirm(shareAmount)
      setShares("")
    } catch (err: any) {
      setError(err.message || "Failed to vest shares")
    }
  }

  const handleClose = () => {
    if (!isProcessing) {
      setShares("")
      setError("")
      onClose()
    }
  }

  const setMaxShares = () => {
    setShares(availableShares.toFixed(4))
    setError("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center text-slate-100">
            <Lock className="w-5 h-5 mr-2 text-yellow-500" />
            Vest Shares
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Vest shares into Level {level}, Slot {slotNumber}. Vested shares will be locked and cannot be traded.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Available Shares Info */}
          <div className="p-3 bg-slate-700 rounded-lg">
            <div className="text-sm text-slate-400">Available to Vest</div>
            <div className="text-lg font-semibold text-slate-100">{availableShares.toFixed(4)} shares</div>
          </div>

          {/* Shares Input */}
          <div className="space-y-2">
            <Label htmlFor="shares" className="text-slate-300">
              Shares to Vest
            </Label>
            <div className="flex space-x-2">
              <Input
                id="shares"
                type="number"
                step="0.0001"
                min="0"
                max={availableShares}
                value={shares}
                onChange={(e) => {
                  setShares(e.target.value)
                  setError("")
                }}
                placeholder="0.0000"
                className="bg-slate-700 border-slate-600 text-slate-100"
                disabled={isProcessing}
              />
              <Button
                type="button"
                variant="outline"
                onClick={setMaxShares}
                disabled={isProcessing || availableShares <= 0}
                className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
              >
                MAX
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="bg-red-900/30 border-red-600/30">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          )}

          {/* Vesting Info */}
          <div className="p-3 bg-blue-900/30 border border-blue-600/30 rounded-lg">
            <div className="text-sm text-blue-400">
              <strong>Important:</strong> Vested shares will be locked in this slot and cannot be traded until claimed.
              This action cannot be undone.
            </div>
          </div>
        </div>

        <DialogFooter className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
            className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || !shares || Number.parseFloat(shares) <= 0}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Vesting...
              </>
            ) : (
              "Vest Shares"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
