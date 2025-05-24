"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { MobileLayout } from "@/components/mobile/mobile-layout"
import { useWallet } from "@/contexts/wallet-context"
import { useMobile } from "@/hooks/use-mobile"

export default function MobileHomeContent() {
  const router = useRouter()
  const isMobile = useMobile()
  const walletContext = useWallet()

  const { pwtInvestBalance, pwtCashoutBalance, aftBalance } = walletContext || {
    pwtInvestBalance: 0,
    pwtCashoutBalance: 0,
    aftBalance: 0,
  }

  // Redirect to desktop version if not on mobile
  useEffect(() => {
    if (!isMobile) {
      router.push("/dashboard")
    }
  }, [isMobile, router])

  if (!walletContext) {
    return (
      <MobileLayout currentPage="home">
        <div className="p-4 flex justify-center items-center">
          <div>Loading wallet data...</div>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout currentPage="home">
      <div className="p-4 space-y-4">
        {/* Top 3 Wallet Balance Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-200 text-black rounded-lg p-4 text-center">
            <div className="text-xs font-medium mb-2">PWT Invest</div>
            <div className="text-2xl font-bold">{pwtInvestBalance}</div>
          </div>
          <div className="bg-gray-200 text-black rounded-lg p-4 text-center">
            <div className="text-xs font-medium mb-2">PWT Cashout</div>
            <div className="text-2xl font-bold">{pwtCashoutBalance}</div>
          </div>
          <div className="bg-gray-200 text-black rounded-lg p-4 text-center">
            <div className="text-xs font-medium mb-2">Activation Token</div>
            <div className="text-2xl font-bold">{aftBalance}</div>
          </div>
        </div>

        {/* Referral Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-200 text-black rounded-lg p-4">
            <div className="text-sm font-medium mb-2">Total Referral Claims</div>
            <div className="text-3xl font-bold">42</div>
          </div>
          <div className="bg-gray-200 text-black rounded-lg p-4">
            <div className="text-sm font-medium mb-2">Active Vesting Expected Yield</div>
            <div className="text-3xl font-bold">4</div>
          </div>
        </div>

        {/* Transfer Stats */}
        <div className="bg-gray-200 text-black rounded-lg p-4">
          <div className="text-sm font-medium mb-2">Total OUT-Transfers to date</div>
          <div className="text-3xl font-bold">192</div>
        </div>

        <div className="bg-gray-200 text-black rounded-lg p-4">
          <div className="text-sm font-medium mb-2">Total OUT-Transfers to date</div>
          <div className="text-3xl font-bold">1920 USD</div>
        </div>
      </div>
    </MobileLayout>
  )
}
