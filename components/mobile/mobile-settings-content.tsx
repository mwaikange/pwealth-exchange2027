"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useMobile } from "@/hooks/use-mobile"
import { Copy, Check, Home, BarChart3, DollarSign, FileText, Settings, LogOut } from "lucide-react"

export default function MobileSettingsContent() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [copied, setCopied] = useState(false)
  const authContext = useAuth()
  const user = authContext?.user
  const signOut = authContext?.signOut || (async () => {})
  const isMobile = useMobile()

  useEffect(() => {
    setMounted(true)
    if (!isMobile && mounted) {
      router.push("/dashboard/settings")
    }
  }, [isMobile, router, mounted])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1d29] via-[#2a2d3a] to-[#1a1d29] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <div>Loading...</div>
        </div>
      </div>
    )
  }

  const userEmail = user?.email || "demo@peer-wealth.com"
  const referralCode = user?.user_metadata?.referral_code || "RFRL-89069"
  const referralUrl = `www.peer-wealth.com/register?ref=${referralCode}`

  const handlePasswordChange = async () => {
    setPasswordError("")
    setPasswordSuccess(false)

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match")
      return
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters")
      return
    }

    try {
      // In demo mode, just show success
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

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/login")
    } catch (error) {
      router.push("/login")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1d29] via-[#2a2d3a] to-[#1a1d29] text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">👤</span>
          </div>
          <div>
            <div className="text-sm font-medium">{userEmail}</div>
            <div className="text-xs text-gray-400">{referralCode}</div>
          </div>
        </div>
        <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium">
          TOP UP
          <br />
          Activation Fee
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Change Password */}
        <div className="bg-[#2a2d3a] rounded-lg p-4">
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
            placeholder="Confirm new Password"
            className="w-full bg-white text-black rounded p-3 mb-3"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <div className="flex justify-end">
            <button
              className="bg-green-500 hover:bg-green-600 text-white rounded py-2 px-6"
              onClick={handlePasswordChange}
            >
              CHANGE
            </button>
          </div>
        </div>

        {/* Referral Programme */}
        <div className="bg-[#2a2d3a] rounded-lg p-4">
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
            className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded py-2 flex items-center justify-center"
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

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#2a2d3a] border-t border-gray-700">
        <div className="flex justify-around py-2">
          <button
            onClick={() => router.push("/mobile/home")}
            className="flex flex-col items-center p-2 text-gray-400 hover:text-white"
          >
            <Home size={20} />
            <span className="text-xs mt-1">Home</span>
          </button>
          <button
            onClick={() => router.push("/mobile/vesting")}
            className="flex flex-col items-center p-2 text-gray-400 hover:text-white"
          >
            <BarChart3 size={20} />
            <span className="text-xs mt-1">Vesting</span>
          </button>
          <button
            onClick={() => router.push("/mobile/cashout")}
            className="flex flex-col items-center p-2 text-gray-400 hover:text-white"
          >
            <DollarSign size={20} />
            <span className="text-xs mt-1">Cashout</span>
          </button>
          <button
            onClick={() => router.push("/mobile/transactions")}
            className="flex flex-col items-center p-2 text-gray-400 hover:text-white"
          >
            <FileText size={20} />
            <span className="text-xs mt-1">Transactions</span>
          </button>
          <button onClick={() => router.push("/mobile/settings")} className="flex flex-col items-center p-2 text-white">
            <Settings size={20} />
            <span className="text-xs mt-1">Settings</span>
          </button>
          <button onClick={handleSignOut} className="flex flex-col items-center p-2 text-red-400 hover:text-red-300">
            <LogOut size={20} />
            <span className="text-xs mt-1">Logout</span>
          </button>
        </div>
      </div>

      {/* Bottom padding to account for fixed navigation */}
      <div className="h-20"></div>
    </div>
  )
}
