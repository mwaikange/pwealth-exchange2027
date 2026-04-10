"use client"

import { useState, useCallback } from "react"

interface Notification {
  id: string
  type: "success" | "error" | "warning" | "info"
  message: string
  isVisible: boolean
}

export function useNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const showNotification = useCallback((type: Notification["type"], message: string) => {
    const id = Math.random().toString(36).substr(2, 9)
    const notification: Notification = {
      id,
      type,
      message,
      isVisible: true,
    }

    setNotifications((prev) => [...prev, notification])

    // Auto-remove after 5 seconds
    setTimeout(() => {
      hideNotification(id)
    }, 5000)

    return id
  }, [])

  const hideNotification = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, isVisible: false } : notification)),
    )

    // Remove from array after animation completes
    setTimeout(() => {
      setNotifications((prev) => prev.filter((notification) => notification.id !== id))
    }, 300)
  }, [])

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  return {
    notifications,
    showNotification,
    hideNotification,
    clearAllNotifications,
  }
}
