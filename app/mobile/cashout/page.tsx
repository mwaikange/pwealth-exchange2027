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
    <div className="min-h-screen bg-[#1c1e26] text-white flex items-center justify-center">
      <div>Loading...</div>
    </div>
  ),
})

export default function MobileCashoutPage() {
  const router = useRouter()
  const isMobile = useMobile()
  const walletContext = useWallet()
  const { pwtCashoutBalance, aftBalance } = walletContext || { pwtCashoutBalance: 0, aftBalance: 0 }

  const [pwtRecipient, setPwtRecipient] = useState("")
  const [pwtAmount, setPwtAmount] = useState("")
  const [pwtUsdValue, setPwtUsdValue] = useState("")

  const [aftRecipient, setAftRecipient] = useState("")
  const [aftAmount, setAftAmount] = useState("")
  const [aftUsdValue, setAftUsdValue] = useState("")

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

  const handlePwtTransfer = () => {
    if (pwtRecipient && pwtAmount) {
      // TODO: Implement PWT transfer
      console.log("PWT Transfer:", { pwtRecipient, pwtAmount })
      setPwtRecipient("")
      setPwtAmount("")
      setPwtUsdValue("")
    }
  }

  const handleAftTransfer = () => {
    if (aftRecipient && aftAmount) {
      // TODO: Implement AFT transfer
      console.log("AFT Transfer:", { aftRecipient, aftAmount })
      setAftRecipient("")
      setAftAmount("")
      setAftUsdValue("")
    }
  }

  if (!walletContext || !mounted) {
    return (
      <div className="min-h-screen bg-[#1c1e26] text-white flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <MobileLayout currentPage="cashout">
      <MobileCashoutContent
        pwtRecipient={pwtRecipient}
        setPwtRecipient={setPwtRecipient}
        pwtAmount={pwtAmount}
        setPwtAmount={setPwtAmount}
        pwtUsdValue={pwtUsdValue}
        setPwtUsdValue={setPwtUsdValue}
        aftRecipient={aftRecipient}
        setAftRecipient={setAftRecipient}
        aftAmount={aftAmount}
        setAftAmount={setAftAmount}
        aftUsdValue={aftUsdValue}
        setAftUsdValue={setAftUsdValue}
        handlePwtTransfer={handlePwtTransfer}
        handleAftTransfer={handleAftTransfer}
        pwtCashoutBalance={pwtCashoutBalance}
        aftBalance={aftBalance}
      />
    </MobileLayout>
  )
}
