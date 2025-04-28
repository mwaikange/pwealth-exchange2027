"use client"

import type React from "react"

import { useRouter } from "next/navigation"
import { X, Home, Wallet, RefreshCw, Users, Settings, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface MobileNavigationProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileNavigation({ isOpen, onClose }: MobileNavigationProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleNavigation = (path: string) => {
    router.push(path)
    onClose()
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col">
      <div className="flex justify-end p-4">
        <Button variant="ghost" size="icon" className="text-white" onClick={onClose}>
          <X className="h-6 w-6" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-8 space-y-6">
        <NavItem icon={<Home />} label="Dashboard" onClick={() => handleNavigation("/dashboard")} />
        <NavItem icon={<Wallet />} label="Cashout" onClick={() => handleNavigation("/dashboard/cashout")} />
        <NavItem
          icon={<RefreshCw />}
          label="Transactions"
          onClick={() => handleNavigation("/dashboard/transactions")}
        />
        <NavItem icon={<Users />} label="Referrals" onClick={() => handleNavigation("/dashboard/referrals")} />
        <NavItem icon={<Settings />} label="Settings" onClick={() => handleNavigation("/dashboard/settings")} />
      </div>

      <div className="p-8">
        <Button
          variant="outline"
          className="w-full border-white/20 text-white hover:bg-white/10"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}

function NavItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      className="flex items-center space-x-4 text-white text-xl font-medium hover:text-yellow-400 transition-colors"
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
