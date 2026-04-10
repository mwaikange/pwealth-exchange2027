"use client"

import { Bell, ChevronLeft } from "lucide-react"

interface TopBarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export function TopBar({ sidebarOpen, setSidebarOpen }: TopBarProps) {
  return (
    <header className="h-[64px] bg-[#2a2d3a] border-b border-gray-700 flex items-center px-4">
      <div className="flex items-center">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mr-4 text-white hover:text-gray-300">
          <ChevronLeft className={`h-6 w-6 transition-transform ${sidebarOpen ? "" : "rotate-180"}`} />
        </button>

        <h1 className="text-2xl font-bold">OVERVIEW</h1>
      </div>

      <div className="ml-auto flex items-center space-x-4">
        <div className="relative">
          <button className="relative p-2 rounded-full bg-[#2a2d3a] border border-gray-700">
            <Bell className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center text-xs">
              3
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
