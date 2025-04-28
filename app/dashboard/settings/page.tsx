"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { MobileHeader } from "@/components/mobile-header"
import { MobileNotification } from "@/components/mobile-notification"
import { useMobileDetectionContext } from "@/contexts/mobile-detection-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Clipboard, Check, Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "react-hot-toast"

export default function SettingsPage() {
  const { isMobile } = useMobileDetectionContext()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userReferralCode, setUserReferralCode] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function fetchUserData() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setUserEmail(user.email)

        // Fetch referral code
        const { data: profileData } = await supabase.from("profiles").select("referral_id").eq("id", user.id).single()

        if (profileData) {
          setUserReferralCode(profileData.referral_id)
        }
      }

      setLoading(false)
    }

    fetchUserData()
  }, [supabase])

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    setChangingPassword(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      toast.success("Password updated successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      toast.error(error.message || "Failed to update password")
    } finally {
      setChangingPassword(false)
    }
  }

  const copyReferralLink = () => {
    if (userReferralCode) {
      const referralLink = `${window.location.origin}/ref/${userReferralCode}`
      navigator.clipboard.writeText(referralLink)
      setCopied(true)
      toast.success("Referral link copied to clipboard")

      setTimeout(() => setCopied(false), 3000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isMobile ? "bg-[url(/background.jpg)] bg-cover bg-center" : "bg-gray-900"}`}>
      {isMobile ? (
        <>
          <MobileHeader email={userEmail} referralCode={userReferralCode} />

          <div className="p-4 pb-20">
            <MobileNotification />

            <Card className="bg-gray-800/70 border-gray-700 mb-4">
              <CardHeader>
                <CardTitle className="text-white text-lg">Change Password</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="text-white text-sm">
                      Current Password
                    </label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400"
                      >
                        {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="newPassword" className="text-white text-sm">
                      New Password
                    </label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400"
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="text-white text-sm">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    disabled={changingPassword}
                  >
                    {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Change Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/70 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Referral Programme</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-white text-sm">Your Referral ID</label>
                    <div className="flex items-center mt-1">
                      <Input
                        value={userReferralCode ? `RFRL-${userReferralCode}` : "Loading..."}
                        readOnly
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-white text-sm">Your Referral Link</label>
                    <div className="flex items-center mt-1">
                      <Input
                        value={userReferralCode ? `${window.location.origin}/ref/${userReferralCode}` : "Loading..."}
                        readOnly
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                      <Button
                        onClick={copyReferralLink}
                        className="ml-2 bg-yellow-600 hover:bg-yellow-700 text-white"
                        disabled={!userReferralCode}
                      >
                        {copied ? <Check size={18} /> : <Clipboard size={18} />}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        // Desktop view (use existing implementation)
        <div>
          {/* Your existing desktop settings component */}
          <h1>Settings (Desktop View)</h1>
        </div>
      )}
    </div>
  )
}
