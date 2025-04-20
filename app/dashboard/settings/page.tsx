"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase-singleton"
import { Lock, User, Mail, Bell, Globe, Key, RefreshCw } from "lucide-react"

export default function SettingsPage() {
  const { user } = useAuth()
  const [referralCode, setReferralCode] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return

      setIsLoading(true)
      try {
        const { data, error } = await supabase.from("app_users").select("referral_code").eq("user_id", user.id).single()

        if (error) {
          console.error("Error fetching user data:", error)
        } else if (data) {
          setReferralCode(data.referral_code || "")
        }
      } catch (error) {
        console.error("Error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [user])

  return (
    <div className="h-full bg-[#1c1e26] overflow-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account & Security */}
        <div className="bg-[#2a2d3a] rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Lock className="h-5 w-5 mr-2 text-blue-400" />
            <h2 className="text-xl font-bold">Account & Security</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1">Email Address</label>
              <input
                type="email"
                value={user?.email || ""}
                readOnly
                className="w-full p-2 bg-[#1e2130] border border-gray-600 rounded-md focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Current Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full p-2 bg-[#1e2130] border border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full p-2 bg-[#1e2130] border border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Confirm New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full p-2 bg-[#1e2130] border border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md">
              Update Password
            </button>
          </div>
        </div>

        {/* Referral Programme */}
        <div className="bg-[#2a2d3a] rounded-lg p-6">
          <div className="flex items-center mb-4">
            <User className="h-5 w-5 mr-2 text-yellow-400" />
            <h2 className="text-xl font-bold">Referral Programme</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1">Your Referral Code</label>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  <span className="text-gray-400">Loading...</span>
                </div>
              ) : (
                <div className="flex">
                  <input
                    type="text"
                    value={referralCode}
                    readOnly
                    className="flex-1 p-2 bg-[#1e2130] border border-gray-600 rounded-l-md focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const referralLink = `${window.location.origin}/register?ref=${referralCode}`
                      navigator.clipboard
                        .writeText(referralLink)
                        .then(() => alert("Referral link copied to clipboard!"))
                        .catch((err) => console.error("Could not copy text: ", err))
                    }}
                    className="px-4 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-r-md"
                  >
                    Copy Link
                  </button>
                </div>
              )}
            </div>

            <div className="bg-[#1e2130] p-4 rounded-md">
              <h3 className="font-medium mb-2">Referral Benefits</h3>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Earn 1 AFT token for each referral who registers</li>
                <li>Earn 5% of your referral's first investment</li>
                <li>Earn 2% of your referral's subsequent investments</li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Share Your Referral Link</label>
              <div className="flex space-x-2">
                <button className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md">
                  <Mail className="h-4 w-4 inline mr-1" /> Email
                </button>
                <button className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md">
                  <Globe className="h-4 w-4 inline mr-1" /> WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Support & Communication */}
        <div className="bg-[#2a2d3a] rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Bell className="h-5 w-5 mr-2 text-purple-400" />
            <h2 className="text-xl font-bold">Support & Communication</h2>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-2">Notification Preferences</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="email-notifications"
                    defaultChecked
                    className="h-4 w-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="email-notifications" className="ml-2 text-sm">
                    Email Notifications
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="investment-alerts"
                    defaultChecked
                    className="h-4 w-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="investment-alerts" className="ml-2 text-sm">
                    Investment Alerts
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="marketing-emails"
                    className="h-4 w-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="marketing-emails" className="ml-2 text-sm">
                    Marketing Emails
                  </label>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Two-Factor Authentication</h3>
              <button className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-md flex items-center justify-center">
                <Key className="h-4 w-4 mr-1" /> Enable 2FA
              </button>
              <p className="text-xs text-gray-400 mt-1">
                Enhance your account security with two-factor authentication.
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">Support</h3>
              <button className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md">
                Contact Support
              </button>
              <p className="text-xs text-gray-400 mt-1">Our support team is available 24/7 to assist you.</p>
            </div>

            <div>
              <h3 className="font-medium mb-2">Account Actions</h3>
              <button className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md flex items-center justify-center">
                <RefreshCw className="h-4 w-4 mr-1" /> Reset Account
              </button>
              <p className="text-xs text-gray-400 mt-1">
                This will reset your account settings but keep your investments.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
