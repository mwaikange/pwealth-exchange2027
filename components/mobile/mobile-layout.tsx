"use client"

import type React from "react"

import { useAuth } from "@supabase/auth-helpers-react"

const MobileLayout = ({ children }: { children: React.ReactNode }) => {
  const authContext = useAuth()
  if (!authContext) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1d29] via-[#2a2d3a] to-[#1a1d29] text-white">
        <div className="flex justify-center items-center h-screen">
          <div>Loading...</div>
        </div>
      </div>
    )
  }

  const user = authContext?.user
  const userEmail = user?.email || "Loading..."
  const referralCode = user?.user_metadata?.referral_code || "Loading..."

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1d29] via-[#2a2d3a] to-[#1a1d29] text-white">
      <div className="container mx-auto p-4">
        {children}
        <div>Email: {userEmail}</div>
        <div>Referral Code: {referralCode}</div>
      </div>
    </div>
  )
}

export default MobileLayout
export { MobileLayout }
