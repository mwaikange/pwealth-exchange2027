"use client"

import { useEffect, useState } from "react"
import { CheckCircle, XCircle, AlertCircle, Info } from "lucide-react"

interface SlidingNotificationProps {
  type: "success" | "error" | "warning" | "info"
  message: string
  isVisible: boolean
  onClose: () => void
  duration?: number
}

export function SlidingNotification({ type, message, isVisible, onClose, duration = 5000 }: SlidingNotificationProps) {
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true)
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    } else {
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, 300) // Wait for slide-out animation
      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose, duration])

  if (!shouldRender) return null

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5" />
      case "error":
        return <XCircle className="w-5 h-5" />
      case "warning":
        return <AlertCircle className="w-5 h-5" />
      case "info":
        return <Info className="w-5 h-5" />
    }
  }

  const getColors = () => {
    switch (type) {
      case "success":
        return "bg-green-600 border-green-500 text-green-100"
      case "error":
        return "bg-red-600 border-red-500 text-red-100"
      case "warning":
        return "bg-yellow-600 border-yellow-500 text-yellow-100"
      case "info":
        return "bg-blue-600 border-blue-500 text-blue-100"
    }
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm w-full transform transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className={`${getColors()} border rounded-lg shadow-lg p-4 flex items-start space-x-3`}>
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium break-words">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 ml-2 text-current opacity-70 hover:opacity-100 transition-opacity"
        >
          <XCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
