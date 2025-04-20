"use client"

import { TopBar } from "./Header"
import { WalletBalances } from "./wallet-balances"

interface HeaderWithWalletProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export function HeaderWithWallet({ sidebarOpen, setSidebarOpen }: HeaderWithWalletProps) {
  return (
    <div className="flex items-center justify-between px-4 h-[64px] bg-[#2a2d3a] border-b border-gray-700">
      <TopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex items-center space-x-4">
        <WalletBalances />
        <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md">
          <div className="font-bold">Top Up</div>
          <div className="text-xs">Activation Token (AFT)</div>
        </button>
      </div>
    </div>
  )
}
