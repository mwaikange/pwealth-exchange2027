"use client"

import { useState } from "react"

export function NotificationSlider() {
  const [notifications, setNotifications] = useState([
    "Join our Whatsapp Channel - Check Your Settings Page",
    "Registration Alert - Namibia- Welcome!",
    "Cashout Alert - Namibia - 50 USD - Well Done!",
  ])

  return (
    <div className="bg-green-600 text-white py-1 px-4 overflow-hidden whitespace-nowrap">
      <div className="animate-marquee inline-block">
        {notifications.map((notification, index) => (
          <span key={index} className="mr-8">
            {notification}
          </span>
        ))}
      </div>
    </div>
  )
}
