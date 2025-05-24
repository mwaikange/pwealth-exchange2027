"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { MobileLayout } from "@/components/mobile/mobile-layout"
import { useWallet } from "@/contexts/wallet-context"
import { useMobile } from "@/hooks/use-mobile"

// Dynamically import the component to avoid SSR issues
const MobileCashoutContent = dynamic(() => import("@/components/mobile/mobile-cashout-content"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1d29] via-[#2a2d3a] to-[#1a1d29] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <div>Loading Cashout...</div>
      </div>
    </div>
  ),
})

export default function MobileCashoutPage() {
  const router = useRouter()
  const isMobile = useMobile()
  const walletContext = useWallet()
  const { pwtCashoutBalance, aftBalance } = walletContext || { pwtCashoutBalance: 0, aftBalance: 0 }

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect to desktop version if not on mobile
  useEffect(() => {
    if (!isMobile) {
      router.push("/dashboard/cashout")
    }
  }, [isMobile, router])

  if (!walletContext || !mounted) {
    return <MobileCashoutContent />
  }

  return (
    <MobileLayout currentPage="cashout">
      <MobileCashoutContent />
    </MobileLayout>
  )
}
