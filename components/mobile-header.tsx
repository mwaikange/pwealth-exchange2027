"use client"

import { useEffect, useState } from "react"
import { ChevronLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"

interface MobileHeaderProps {
  title?: string
  showBackButton?: boolean
  showTopUpButton?: boolean
}

export function MobileHeader({ title, showBackButton = false, showTopUpButton = false }: MobileHeaderProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [referralCode, setReferralCode] = useState<string>("")
  const [email, setEmail] = useState<string>("")

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.id) {
        // Fetch referral code
        const { data, error } = await supabase
          .from("usersettings")
          .select("referral_code")
          .eq("user_uuid", user.id)
          .single()

        if (data && !error) {
          setReferralCode(data.referral_code)
        }

        // Set email
        if (user.email) {
          setEmail(user.email)
        }
      }
    }

    fetchUserData()
  }, [user])

  return (
    <div className="bg-transparent py-3 px-4 flex items-center justify-between">
      <div className="flex items-center">
        {showBackButton && (
          <button onClick={() => router.back()} className="mr-3">
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div>
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold text-black mr-2">
              {email ? email.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <div className="text-xs">{email || "User"}</div>
              <div className="text-[10px] text-gray-400">{referralCode || "RFRL-XXXXXX"}</div>
            </div>
          </div>
        </div>
      </div>

      {showTopUpButton && <button className="bg-green-600 text-white text-xs py-1 px-3 rounded">Activation Fee</button>}
    </div>
  )
}
