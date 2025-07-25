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
    const notification: Notification = {
      id,
      type,
      message,
      isVisible: true,
    }

    setNotifications((prev) => [...prev, notification])
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
