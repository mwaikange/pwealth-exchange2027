"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function MobileNotification() {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 mb-4 relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 text-yellow-500/70 hover:text-yellow-500 hover:bg-transparent"
        onClick={() => setIsVisible(false)}
      >
        <X className="h-4 w-4" />
      </Button>
      <p className="text-yellow-500 text-sm pr-6">
        Welcome to the mobile version! Some features may be limited. For full functionality, please use the desktop
        version.
      </p>
    </div>
  )
}
