"use client"

import { useEffect, useState } from "react"
import { CheckCircle, XCircle, X } from "lucide-react"

interface SlidingNotificationProps {
  type: "success" | "error"
  message: string
  isVisible: boolean
  onClose: () => void
  duration?: number
}

export function SlidingNotification({ type, message, isVisible, onClose, duration = 4000 }: SlidingNotificationProps) {
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

  const bgColor = type === "success" ? "bg-green-600" : "bg-red-600"
  const Icon = type === "success" ? CheckCircle : XCircle

  return (
    <div
      className={`fixed top-4 right-4 z-50 transform transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div
        className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 min-w-[300px] max-w-[400px]`}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm font-medium flex-1">{message}</span>
        <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
