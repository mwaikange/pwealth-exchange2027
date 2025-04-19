"use client"

import { Bell, ChevronLeft } from "lucide-react"
import { WalletBalances } from "./wallet-balances"

interface TopBarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export function TopBar({ sidebarOpen, setSidebarOpen }: TopBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-20">
      {/* Main header with logo, title, and notifications */}
      <div className="h-[64px] bg-[#2a2d3a] border-b border-gray-700 flex items-center px-4">
        <div className="flex items-center">
          <div className="w-[90px] h-[90px] relative mr-4">
            <div className="absolute inset-0 rounded-full border-2 border-[#b8a432]"></div>
            <div className="absolute inset-[6px] rounded-full bg-[#1c1e26] flex items-center justify-center">
              <div className="w-[60px] h-[60px] rounded-full border-t-2 border-[#4285f4] flex items-center justify-center">
                <div className="w-[40px] h-[40px] rounded-full border-t-2 border-[#34a853]"></div>
              </div>
            </div>
          </div>

          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mr-4 text-white hover:text-gray-300">
            <ChevronLeft className={`h-6 w-6 transition-transform ${sidebarOpen ? "" : "rotate-180"}`} />
          </button>

          <h1 className="text-4xl font-bold">OVERVIEW</h1>
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

          <WalletBalances />

          <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md">
            <div className="font-bold">Top Up</div>
            <div className="text-xs">Activation Token (AFT)</div>
          </button>
        </div>
      </div>

      {/* Alert Bar */}
      <div className="bg-green-600 py-2 px-4 text-white whitespace-nowrap overflow-hidden">
        <div className="animate-marquee">
          Join Our Telegram Group Today | Add Our Whatsapp Channel - Check Your Settings Page | Registration Alert -
          Namibia- Welcome! | Cashout Alert - Namibia - 50 USD - Well Done!
        </div>
      </div>
    </header>
  )
}
