"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MobileLayout } from "@/components/mobile/mobile-layout"
import { useAuth } from "@/contexts/auth-context"
import { useMobile } from "@/hooks/use-mobile"
import { Copy, Check } from "lucide-react"

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
      <div className="p-4 space-y-6">
        {/* Change Password */}
        <div className="bg-[#2a2d3a] rounded p-4">
          <h2 className="text-lg font-medium mb-4">Change Password</h2>

          {passwordError && (
            <div className="bg-red-500/20 border border-red-500 rounded p-2 mb-3 text-sm">{passwordError}</div>
          )}

          {passwordSuccess && (
            <div className="bg-green-500/20 border border-green-500 rounded p-2 mb-3 text-sm">
              Password changed successfully
            </div>
          )}

          <input
            type="password"
            placeholder="Enter new Password"
            className="w-full bg-white text-black rounded p-3 mb-3"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <input
            type="password"
            placeholder="Enter new Password"
            className="w-full bg-white text-black rounded p-3 mb-3"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <div className="flex justify-end">
            <button className="bg-green-500 text-white rounded py-2 px-6" onClick={handlePasswordChange}>
              CHANGE
            </button>
          </div>
        </div>

        {/* Referral Programme */}
        <div className="bg-[#2a2d3a] rounded p-4">
          <h2 className="text-lg font-medium mb-4">Referral Programme</h2>

          <div className="flex items-center mb-3">
            <div className="bg-white w-8 h-8 rounded flex items-center justify-center mr-3">
              <Copy size={16} className="text-gray-800" />
            </div>
            <a href={`https://${referralUrl}`} className="text-blue-400 text-sm underline break-all">
              {referralUrl}
            </a>
          </div>

          <div className="mb-3">
            <div className="text-sm mb-1">This is your Referral Code / ID</div>
            <div className="text-2xl font-bold">{referralCode}</div>
          </div>

          <button
            className="w-full bg-blue-500 text-white rounded py-2 flex items-center justify-center"
            onClick={copyReferralCode}
          >
            {copied ? (
              <>
                <Check size={16} className="mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy size={16} className="mr-2" />
                Copy Referral Link
              </>
            )}
          </button>
        </div>
      </div>
    </MobileLayout>
  )
}
