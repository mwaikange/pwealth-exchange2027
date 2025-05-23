"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { MobileLayout } from "@/components/mobile/mobile-layout"
import { useWallet } from "@/contexts/wallet-context"
import { useVesting } from "@/contexts/vesting-context"
import { useMobile } from "@/hooks/use-mobile"

export default function MobileHomePage() {
  const router = useRouter()
  const isMobile = useMobile()
  const { pwtInvestBalance, pwtCashoutBalance, aftBalance, loading } = useWallet()
  const { totalReferralClaims, activeVestingYield, totalOutTransfers, totalOutTransfersUsd } = useVesting()

  // Redirect to desktop version if not on mobile
  useEffect(() => {
    if (!isMobile) {
      router.push("/dashboard")
    }
  }, [isMobile, router])

  return (
    <MobileLayout currentPage="home">
      <div className="p-4 space-y-4">
        {/* Wallet Balances */}
        <div className="grid grid-cols-3 gap-2">
          <WalletCard title="PWT Invest" value={loading ? "..." : pwtInvestBalance} />
          <WalletCard title="PWT Cashout" value={loading ? "..." : pwtCashoutBalance} />
          <WalletCard title="Activation Token" value={loading ? "..." : aftBalance} suffix="USD" />
        </div>

        {/* Referral Stats */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard title="Total Referral Claims" value={totalReferralClaims || "0"} />
          <StatCard title="Active Vesting Expected Yield" value={activeVestingYield || "0"} />
        </div>

        {/* Transfer Stats */}
        <StatCard title="Total OUT-Transfers to date" value={totalOutTransfers || "0"} />

        <StatCard
          title="Total OUT-Transfers to date"
          value={totalOutTransfersUsd ? `${totalOutTransfersUsd} USD` : "0 USD"}
        />
      </div>
    </MobileLayout>
  )
}

interface CardProps {
  title: string
  value: string | number
  suffix?: string
}

function WalletCard({ title, value, suffix }: CardProps) {
  return (
    <div className="bg-[#2a2d3a] rounded p-2 flex flex-col items-center">
      <div className="text-xs text-gray-400">{title}</div>
      <div className="text-xl font-bold">
        {value} {suffix && <span className="text-xs">{suffix}</span>}
      </div>
    </div>
  )
}

function StatCard({ title, value }: CardProps) {
  return (
    <div className="bg-[#2a2d3a] rounded p-3">
      <div className="text-sm text-gray-400">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  )
}
