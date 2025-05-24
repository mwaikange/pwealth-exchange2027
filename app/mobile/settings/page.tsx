"use client"

import dynamic from "next/dynamic"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MobileLayout } from "@/components/mobile/mobile-layout"
import { useAuth } from "@/contexts/auth-context"
import { useMobile } from "@/hooks/use-mobile"

const MobileSettingsContent = dynamic(() => import("@/components/mobile/mobile-settings-content"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1d29] via-[#2a2d3a] to-[#1a1d29] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <div>Loading Settings...</div>
      </div>
    </div>
  ),
})

export default function MobileSettingsPage() {
  const router = useRouter()
  const isMobile = useMobile()
  const { user, changePassword } = useAuth()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [copied, setCopied] = useState(false)

  // Redirect to desktop version if not on mobile
  useEffect(() => {
    if (!isMobile) {
      router.push("/dashboard/settings")
    }
  }, [isMobile, router])

  const referralCode = user?.user_metadata?.referral_code || "RFRL-00000"
  const referralUrl = `www.peer-wealth.com/register?ref=${referralCode}`

  const handlePasswordChange = async () => {
    // Reset states
    setPasswordError("")
    setPasswordSuccess(false)

    // Validate passwords
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match")
      return
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters")
      return
    }

    try {
      await changePassword(newPassword)
      setPasswordSuccess(true)
      setNewPassword("")
      setConfirmPassword("")
    } catch (error) {
      setPasswordError("Failed to change password")
    }
  }

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <MobileLayout currentPage="settings">
      <MobileSettingsContent
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        passwordError={passwordError}
        setPasswordError={setPasswordError}
        passwordSuccess={passwordSuccess}
        setPasswordSuccess={setPasswordSuccess}
        referralCode={referralCode}
        referralUrl={referralUrl}
        copyReferralCode={copyReferralCode}
        copied={copied}
      />
    </MobileLayout>
  )
}
