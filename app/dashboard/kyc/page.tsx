"use client"

import { useRouter } from "next/navigation"
import { Upload, Shield, CheckCircle, AlertCircle, Mail, User, CreditCard } from "lucide-react"
import { useState, useEffect } from "react"
import { updatePassword } from "@/actions/user-actions"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function KYCPage() {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [showCopyNotification, setShowCopyNotification] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [kycLevel, setKycLevel] = useState(1)
  const { user } = useAuth()
  const [sessionToken, setSessionToken] = useState<string | null>(null)

  // Get the session token
  useEffect(() => {
    async function getSessionToken() {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        setSessionToken(data.session.access_token)
      }
    }
    getSessionToken()
  }, [])

  // Fetch user data from Supabase
  async function fetchUserData() {
    if (!user) return

    setLoading(true)

    try {
      const { data: userProfile, error } = await supabase
        .from("app_users")
        .select("*")
        .eq("user_uuid", user.id)
        .single()

      if (error) {
        console.error("Error fetching user data:", error)
        return
      }

      // Also fetch referral code
      const { data: settingsData } = await supabase
        .from("usersettings")
        .select("referral_code")
        .eq("user_uuid", user.id)
        .single()

      const userData = {
        ...userProfile,
        referral_code: settingsData?.referral_code,
      }

      setUserData(userData)

      // Determine KYC level based on available data
      let level = 1
      if (userData.mobile_number && userData.email) {
        level = 1
      }
      if (userData.id_number && userData.home_address && userData.region && userData.town) {
        level = 2
      }
      if (userData.bank_confirmation_letter) {
        level = 3
      }
      setKycLevel(level)
    } catch (error) {
      console.error("Error in fetchUserData:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserData()
  }, [user])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setShowCopyNotification(true)
    setTimeout(() => {
      setCopied(false)
      setShowCopyNotification(false)
    }, 2000)
  }

  async function handlePasswordUpdate(formData: FormData) {
    setPasswordError(null)
    setPasswordSuccess(null)

    const newPassword = formData.get("newPassword") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match")
      return
    }

    // Add the session token to the form data
    if (sessionToken) {
      formData.append("sessionToken", sessionToken)
      formData.append("userId", user?.id || "")
    }

    const result = await updatePassword(formData)

    if (result.success) {
      setPasswordSuccess(result.message)
      // Clear form
      const form = document.getElementById("password-form") as HTMLFormElement
      if (form) form.reset()
    } else {
      setPasswordError(result.message)
    }
  }

  const getKycLevelBadge = (level: number) => {
    const colors = {
      1: "bg-yellow-500 text-white",
      2: "bg-blue-500 text-white",
      3: "bg-green-500 text-white",
    }
    return <Badge className={colors[level as keyof typeof colors]}>Level {level}</Badge>
  }

  const getKycBenefits = (level: number) => {
    const benefits = {
      1: {
        cashout: "Mobile Number Only",
        limit: "N$200.00 per month",
        fee: "5% on Withdrawals",
      },
      2: {
        cashout: "Mobile Number",
        limit: "N$5,000 per week",
        fee: "3% per withdrawal",
      },
      3: {
        cashout: "Mobile + Bank EFT",
        limit: "Mobile: N$5,000/day, EFT: N$50,000/day",
        fee: "Reduced fees",
      },
    }
    return benefits[level as keyof typeof benefits]
  }

  if (loading) {
    return (
      <div className="h-[calc(100vh-130px)] bg-[#1c1e26] overflow-hidden p-6">
        <h1 className="text-2xl font-bold">KYC Verification</h1>
        <p className="text-gray-400 text-sm">Loading your KYC information...</p>

        <div className="mt-8 grid grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-[#2a2d3a] rounded-lg p-6 h-80 animate-pulse">
              <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-full mb-6"></div>
              <div className="h-10 bg-gray-700 rounded w-full mb-4"></div>
              <div className="h-10 bg-gray-700 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-130px)] bg-[#1c1e26] overflow-hidden">
      {/* Page Title */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">KYC Verification</h1>
            <p className="text-gray-400 text-sm">Complete your Know Your Customer verification</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">Current Level:</span>
            {getKycLevelBadge(kycLevel)}
          </div>
        </div>
      </div>

      {/* KYC Grid */}
      <div className="px-6">
        <div
          className="grid gap-5 h-[calc(100vh-200px)]"
          style={{
            transform: "scale(0.85)",
            transformOrigin: "top left",
            width: "118%",
            marginTop: "0.5rem",
            gridTemplateColumns: "1fr 1fr",
          }}
        >
          {/* Block 1 (Left): Password Change + MFA */}
          <div className="bg-[#2a2d3a] rounded-lg p-5 flex flex-col">
            {/* Setup MFA Section */}
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-4 text-center flex items-center justify-center">
                <Shield className="h-5 w-5 mr-2" />
                SETUP MFA
              </h2>
              <div className="flex justify-center mb-8">
                <button className="bg-[#f5f5f5] hover:bg-gray-200 text-black px-6 py-2 rounded-md text-sm">
                  start
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-700 my-4"></div>

            {/* Change Password Section */}
            <div className="mt-2">
              <div className="flex justify-between mb-4">
                <div>
                  <div className="text-sm text-gray-400">Email :</div>
                  <div className="text-sm text-gray-400">Country :</div>
                </div>
                <div>
                  <div className="text-sm text-green-500">{userData?.email || user?.email}</div>
                  <div className="text-sm text-green-500">{userData?.country || "Not set"}</div>
                </div>
              </div>

              <h3 className="text-lg font-medium mb-3">Change Password</h3>

              {passwordError && (
                <div className="bg-red-500/20 border border-red-500 text-red-300 px-3 py-2 rounded-md text-xs mb-3">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="bg-green-500/20 border border-green-500 text-green-300 px-3 py-2 rounded-md text-xs mb-3">
                  {passwordSuccess}
                </div>
              )}

              <form id="password-form" action={handlePasswordUpdate} className="space-y-3 mb-4">
                <input
                  type="password"
                  name="oldPassword"
                  placeholder="Old Password"
                  className="w-full p-3 rounded bg-[#f5f5f5] text-[#c5c6c8] border-0"
                  required
                />
                <input
                  type="password"
                  name="newPassword"
                  placeholder="New Password"
                  className="w-full p-3 rounded bg-[#f5f5f5] text-[#c5c6c8] border-0"
                  required
                />
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm New Password"
                  className="w-full p-3 rounded bg-[#f5f5f5] text-[#c5c6c8] border-0"
                  required
                />

                <div className="flex-grow"></div>

                <div className="flex justify-center mt-6">
                  <button
                    type="submit"
                    className="bg-[#f5f5f5] hover:bg-gray-200 text-black px-6 py-2 rounded-md text-sm"
                  >
                    Confirm
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Block 2 (Right): KYC Levels */}
          <div className="bg-[#2a2d3a] rounded-lg p-5 flex flex-col">
            <h2 className="text-xl font-bold mb-4 text-center underline">KYC VERIFICATION LEVELS</h2>

            <div className="space-y-6 flex-1">
              {/* Level 1 KYC */}
              <div
                className={`p-4 rounded-lg border-2 ${kycLevel >= 1 ? "border-green-500 bg-green-500/10" : "border-gray-600"}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span className="font-semibold">Level 1 KYC</span>
                  </div>
                  {kycLevel >= 1 ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                </div>

                <div className="text-sm space-y-2">
                  <div>
                    <strong>Requirements:</strong> Email + Mobile Number
                  </div>
                  <div>
                    <strong>Benefits:</strong>
                  </div>
                  <ul className="text-xs ml-4 space-y-1">
                    <li>• Cashouts to Mobile Number Only</li>
                    <li>• Limit: N$200.00 per month</li>
                    <li>• Fee: 5% on Withdrawals</li>
                  </ul>
                </div>

                <div className="mt-3 space-y-2">
                  <Input
                    placeholder="Mobile Number"
                    value={userData?.mobile_number || ""}
                    className="bg-[#f5f5f5] text-[#c5c6c8] text-sm"
                    disabled
                  />
                </div>
              </div>

              {/* Level 2 KYC */}
              <div
                className={`p-4 rounded-lg border-2 ${kycLevel >= 2 ? "border-green-500 bg-green-500/10" : "border-gray-600"}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span className="font-semibold">Level 2 KYC</span>
                  </div>
                  {kycLevel >= 2 ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                </div>

                <div className="text-sm space-y-2">
                  <div>
                    <strong>Requirements:</strong> Level 1 + Personal Info + ID Document
                  </div>
                  <div>
                    <strong>Benefits:</strong>
                  </div>
                  <ul className="text-xs ml-4 space-y-1">
                    <li>• Cashout to Mobile - N$5,000 per week</li>
                    <li>• Fee: 3% per withdrawal</li>
                  </ul>
                </div>

                <div className="mt-3 space-y-2">
                  <Input placeholder="ID Number" className="bg-[#f5f5f5] text-[#c5c6c8] text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Region" className="bg-[#f5f5f5] text-[#c5c6c8] text-sm" />
                    <Input placeholder="Town" className="bg-[#f5f5f5] text-[#c5c6c8] text-sm" />
                  </div>
                  <Input placeholder="Street Address" className="bg-[#f5f5f5] text-[#c5c6c8] text-sm" />
                  <Button className="w-full bg-gray-500 text-gray-300 cursor-not-allowed" disabled>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload ID/Passport (Coming Soon)
                  </Button>
                </div>
              </div>

              {/* Level 3 KYC */}
              <div
                className={`p-4 rounded-lg border-2 ${kycLevel >= 3 ? "border-green-500 bg-green-500/10" : "border-gray-600"}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4" />
                    <span className="font-semibold">Level 3 KYC</span>
                  </div>
                  {kycLevel >= 3 ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                </div>

                <div className="text-sm space-y-2">
                  <div>
                    <strong>Requirements:</strong> Level 1+2 + Bank Confirmation Letter
                  </div>
                  <div>
                    <strong>Benefits:</strong>
                  </div>
                  <ul className="text-xs ml-4 space-y-1">
                    <li>• Mobile: N$5,000 per day</li>
                    <li>• Bank EFT: N$50,000 per day</li>
                    <li>• Reduced fees</li>
                  </ul>
                </div>

                <div className="mt-3">
                  <Button className="w-full bg-gray-500 text-gray-300 cursor-not-allowed" disabled>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Bank Letter (Coming Soon)
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
