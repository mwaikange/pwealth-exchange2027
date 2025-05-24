"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MobileLayout } from "@/components/mobile/mobile-layout"
import { useWallet } from "@/contexts/wallet-context"
import { useMobile } from "@/hooks/use-mobile"

export default function MobileCashoutContent() {
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

  if (!walletContext) {
    return (
      <MobileLayout currentPage="cashout">
        <div className="p-4 flex justify-center items-center">
          <div>Loading wallet data...</div>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout currentPage="cashout">
      <div className="p-4 space-y-6">
        {/* PWT Transfer */}
        <div className="bg-[#2a2d3a] rounded p-4">
          <h2 className="text-lg font-medium mb-4">TRANSFER - (PWT/FIAT)</h2>

          <input
            type="email"
            placeholder="enter recipient email address"
            className="w-full bg-white text-black rounded p-3 mb-3"
            value={pwtRecipient}
            onChange={(e) => setPwtRecipient(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              placeholder="# of PWT"
              className="bg-white text-black rounded p-3"
              value={pwtAmount}
              onChange={(e) => setPwtAmount(e.target.value)}
            />
            <input
              type="text"
              placeholder="USD Value"
              className="bg-white text-black rounded p-3"
              value={pwtUsdValue}
              onChange={(e) => setPwtUsdValue(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <button className="bg-green-500 text-white rounded py-2 px-6" onClick={handlePwtTransfer}>
              Transfer
            </button>
          </div>
        </div>

        {/* AFT Transfer */}
        <div className="bg-[#2a2d3a] rounded p-4">
          <h2 className="text-lg font-medium mb-4">GIFT ACTIVATION FEE TOKENS</h2>

          <input
            type="email"
            placeholder="enter recipient email address"
            className="w-full bg-white text-black rounded p-3 mb-3"
            value={aftRecipient}
            onChange={(e) => setAftRecipient(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              placeholder="# AFT"
              className="bg-white text-black rounded p-3"
              value={aftAmount}
              onChange={(e) => setAftAmount(e.target.value)}
            />
            <input
              type="text"
              placeholder="USD Value"
              className="bg-white text-black rounded p-3"
              value={aftUsdValue}
              onChange={(e) => setAftUsdValue(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <button className="bg-green-500 text-white rounded py-2 px-6" onClick={handleAftTransfer}>
              Transfer
            </button>
          </div>
        </div>
      </div>
    </MobileLayout>
  )
}
