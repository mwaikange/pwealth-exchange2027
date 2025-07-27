"use client"

import { useState, useCallback } from "react"

interface Notification {
  id: string
  type: "success" | "error" | "info" | "warning"
  message: string
  isVisible: boolean
}

export function useNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const showNotification = useCallback((type: "success" | "error" | "info" | "warning", message: string) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newNotification: Notification = {
      id,
      type,
      message,
      isVisible: true,
    }

    setNotifications((prev) => [...prev, newNotification])

    // Auto-remove after 3.5 seconds (accounting for animation)
    setTimeout(() => {
      hideNotification(id)
    }, 3500)
  }, [])

  const hideNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))
  }, [])

  return {
    notifications,
    showNotification,
    hideNotification,
  }
}
