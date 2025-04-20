"use client"

import { ChevronLeft } from "lucide-react"
import { NotificationBell } from "./notification-bell"

interface TopBarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export function TopBar({ sidebarOpen, setSidebarOpen }: TopBarProps) {
  return (
    <div className="flex items-center">
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-full hover:bg-gray-700 mr-2">
        <ChevronLeft className={`h-6 w-6 transition-transform ${sidebarOpen ? "" : "rotate-180"}`} />
      </button>
      <div className="text-xl font-bold">OVERVIEW</div>

      <div className="ml-auto mr-4">
        <NotificationBell />
      </div>
    </div>
  )
}
