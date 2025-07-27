"use client"

import { useState, useEffect } from "react"
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react"

interface SlidingNotificationProps {
  type: "success" | "error" | "info" | "warning"
  message: string
  isVisible: boolean
  onClose: () => void
  duration?: number
}

export function SlidingNotification({ type, message, isVisible, onClose, duration = 3000 }: SlidingNotificationProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setIsAnimating(false)
        setTimeout(onClose, 300) // Wait for slide-out animation
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [isVisible, duration, onClose])

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-400" />
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />
      case "info":
      default:
        return <Info className="w-5 h-5 text-blue-400" />
    }
  }

  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return "bg-green-900/90 border-green-600/50"
      case "error":
        return "bg-red-900/90 border-red-600/50"
      case "warning":
        return "bg-yellow-900/90 border-yellow-600/50"
      case "info":
      default:
        return "bg-blue-900/90 border-blue-600/50"
    }
  }

  if (!isVisible) return null

  return (
    <div
      className={`fixed top-4 right-4 z-50 transform transition-transform duration-300 ease-in-out ${
        isAnimating ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className={`${getBackgroundColor()} border rounded-lg shadow-lg p-4 min-w-80 max-w-96 backdrop-blur-sm`}>
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1">
            <p className="text-white text-sm font-medium">{message}</p>
          </div>
          <button
            onClick={() => {
              setIsAnimating(false)
              setTimeout(onClose, 300)
            }}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
