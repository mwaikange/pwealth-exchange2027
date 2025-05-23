"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { AFTPurchaseModal } from "@/components/aft-purchase-modal"
import { Home, TrendingUp, DollarSign, List, Settings } from "lucide-react"

interface MobileLayoutProps {
  children: React.ReactNode
  currentPage: "home" | "vesting" | "cashout" | "transactions" | "settings"
}

export function MobileLayout({ children, currentPage }: MobileLayoutProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [showAFTModal, setShowAFTModal] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  if (!user) {
    return null // Or a loading spinner
  }

  const referralCode = user.user_metadata?.referral_code || "RFRL-00000"

  return (
    <div className="min-h-screen bg-[#1c1e26] text-white flex flex-col">
      {/* Header with user info and top-up button */}
      <div className="p-4 flex items-center">
        <div className="flex-1">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-500 rounded-full mr-2 flex items-center justify-center">
              <img src="/peerWealth_Cursor.png" alt="Avatar" className="w-6 h-6 rounded-full" />
            </div>
            <div>
              <div className="text-sm truncate">{user.email}</div>
              <div className="text-xs text-gray-400">{referralCode}</div>
            </div>
          </div>
        </div>
        <button className="bg-green-500 text-white px-3 py-1 rounded text-xs" onClick={() => setShowAFTModal(true)}>
          <div>TOP UP</div>
          <div className="text-[10px]">Activation Fee</div>
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto pb-16">{children}</div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#2a2d3a] border-t border-gray-700 flex justify-around py-2">
        <NavButton
          icon={<Home size={20} />}
          label="Home"
          isActive={currentPage === "home"}
          onClick={() => router.push("/mobile/home")}
        />
        <NavButton
          icon={<TrendingUp size={20} />}
          label="Vesting"
          isActive={currentPage === "vesting"}
          onClick={() => router.push("/mobile/vesting")}
        />
        <NavButton
          icon={<DollarSign size={20} />}
          label="Cashout"
          isActive={currentPage === "cashout"}
          onClick={() => router.push("/mobile/cashout")}
        />
        <NavButton
          icon={<List size={20} />}
          label="Transactions"
          isActive={currentPage === "transactions"}
          onClick={() => router.push("/mobile/transactions")}
        />
        <NavButton
          icon={<Settings size={20} />}
          label="Settings"
          isActive={currentPage === "settings"}
          onClick={() => router.push("/mobile/settings")}
        />
      </div>

      {/* AFT Purchase Modal */}
      <AFTPurchaseModal isOpen={showAFTModal} onClose={() => setShowAFTModal(false)} />
    </div>
  )
}

interface NavButtonProps {
  icon: React.ReactNode
  label: string
  isActive: boolean
  onClick: () => void
}

function NavButton({ icon, label, isActive, onClick }: NavButtonProps) {
  return (
    <button
      className={`flex flex-col items-center justify-center px-2 ${isActive ? "text-yellow-400" : "text-gray-400"}`}
      onClick={onClick}
    >
      {icon}
      <span className="text-[10px] mt-1">{label}</span>
    </button>
  )
}
