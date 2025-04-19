"use client"

import { Bell, ChevronLeft } from "lucide-react"
import { useWallet } from "@/contexts/wallet-context"
import Link from "next/link"

export function DashboardHeader() {
  const { pwtInvestBalance, pwtCashoutBalance, aftBalance } = useWallet()

  return (
    <div className="w-full">
      {/* Main header */}
      <header className="bg-[#1e2130] h-[60px] flex items-center px-4">
        <div className="flex items-center">
          <div className="w-10 h-10 relative mr-3">
            <div className="absolute inset-0 rounded-full bg-[#1e2130] border-2 border-blue-500"></div>
          </div>
          <Link href="/dashboard" className="flex items-center">
            <ChevronLeft className="h-5 w-5 mr-2" />
            <h1 className="text-xl font-bold">OVERVIEW</h1>
          </Link>
        </div>

        <div className="ml-auto flex items-center space-x-3">
          <div className="relative">
            <button className="relative p-2 rounded-full hover:bg-gray-800">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-xs">
                3
              </span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <div className="bg-[#2a2d3a] rounded px-3 py-1.5 flex flex-col items-center min-w-[100px]">
              <div className="text-xs text-gray-400">PWT Invest</div>
              <div className="text-xl font-bold">{pwtInvestBalance || 30}</div>
            </div>

            <div className="bg-[#2a2d3a] rounded px-3 py-1.5 flex flex-col items-center min-w-[100px]">
              <div className="text-xs text-gray-400">PWT Cashout</div>
              <div className="text-xl font-bold">{pwtCashoutBalance || 30}</div>
            </div>

            <div className="bg-[#2a2d3a] rounded px-3 py-1.5 flex flex-col items-center min-w-[100px]">
              <div className="text-xs text-gray-400">Activation Token</div>
              <div className="text-xl font-bold">
                {aftBalance || 30} <span className="text-xs">USD</span>
              </div>
            </div>
          </div>

          <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
            <div className="font-medium">Top Up</div>
            <div className="text-xs">Activation Token (AFT)</div>
          </button>
        </div>
      </header>

      {/* Notification slider */}
      <div className="bg-green-600 py-1.5 px-4 text-white whitespace-nowrap overflow-hidden">
        <div className="animate-marquee">
          Join Our Telegram Group Today | Add Our Whatsapp Channel - Check Your Settings Page | Registration Alert -
          Namibia- Welcome! | Cashout Alert - Namibia - 50 USD - Well Done!
        </div>
      </div>
    </div>
  )
}
