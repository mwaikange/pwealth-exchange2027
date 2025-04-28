"use client"

import { useState } from "react"
import { Menu, ArrowLeft, Bell, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MobileNavigation } from "@/components/mobile-navigation"
import { FeatureUnavailableModal } from "@/components/feature-unavailable-modal"

interface MobileHeaderProps {
  email: string | null
  referralCode: string | null
  showBackButton?: boolean
  showActionButton?: boolean
  actionButtonText?: string
}

export function MobileHeader({
  email,
  referralCode,
  showBackButton = false,
  showActionButton = true,
  actionButtonText = "TOP UP",
}: MobileHeaderProps) {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showFeatureModal, setShowFeatureModal] = useState(false)

  return (
    <>
      <header className="bg-gray-900/80 backdrop-blur-sm p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center">
          {showBackButton ? (
            <Button variant="ghost" size="icon" className="text-white mr-2" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="text-white mr-2" onClick={() => setIsMenuOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div>
            <p className="text-sm font-medium text-white">{email || "User"}</p>
            <p className="text-xs text-gray-400">{referralCode ? `Ref: ${referralCode}` : "No referral code"}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="text-white" onClick={() => setShowFeatureModal(true)}>
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white" onClick={() => router.push("/dashboard/settings")}>
            <User className="h-5 w-5" />
          </Button>
          {showActionButton && (
            <Button
              size="sm"
              className="bg-yellow-500 hover:bg-yellow-600 text-black text-xs px-3"
              onClick={() => setShowFeatureModal(true)}
            >
              {actionButtonText}
            </Button>
          )}
        </div>
      </header>

      <MobileNavigation isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <FeatureUnavailableModal
        isOpen={showFeatureModal}
        onClose={() => setShowFeatureModal(false)}
        featureName="This feature"
      />
    </>
  )
}
