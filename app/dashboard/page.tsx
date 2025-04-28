"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { MobileHeader } from "@/components/mobile-header"
import { MobileNotification } from "@/components/mobile-notification"
import { useMobileDetectionContext } from "@/contexts/mobile-detection-context"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { DashboardContent } from "@/components/dashboard-content" // Changed to named import

export default function Dashboard() {
  const { isMobile } = useMobileDetectionContext()
  const supabase = createClientComponentClient()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userReferralCode, setUserReferralCode] = useState<string | null>(null)
  const [walletData, setWalletData] = useState({
    pwtInvest: 0,
    pwtCashout: 0,
    activationToken: 0,
    referralClaims: 0,
    vestingYield: 0,
    outgoingTransfers: 0,
    incomingTransfers: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUserData() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setUserEmail(user.email)

        // Fetch referral code and wallet data
        const { data: profileData } = await supabase.from("profiles").select("referral_id").eq("id", user.id).single()

        if (profileData) {
          setUserReferralCode(profileData.referral_id)
        }

        // Fetch wallet balances
        const { data: walletData } = await supabase.from("user_wallet_view").select("*").eq("user_id", user.id).single()

        if (walletData) {
          setWalletData({
            pwtInvest: walletData.pwt_invest || 0,
            pwtCashout: walletData.pwt_cashout || 0,
            activationToken: walletData.activation_token || 0,
            referralClaims: walletData.total_referral_claims || 0,
            vestingYield: walletData.expected_yield || 0,
            outgoingTransfers: walletData.outgoing_transfers || 0,
            incomingTransfers: walletData.incoming_transfers || 0,
          })
        }
      }

      setLoading(false)
    }

    fetchUserData()
  }, [supabase])

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
          <MobileHeader email={userEmail} referralCode={userReferralCode} actionButtonText="TOP UP" />

          <div className="p-4 pb-20">
            <MobileNotification />

            {/* Top Cards */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <Card className="bg-gray-800/70 border-gray-700">
                <CardContent className="p-3">
                  <h3 className="text-xs text-gray-300">PWT Invest</h3>
                  <p className="text-base font-semibold text-white">{walletData.pwtInvest}</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/70 border-gray-700">
                <CardContent className="p-3">
                  <h3 className="text-xs text-gray-300">PWT Cashout</h3>
                  <p className="text-base font-semibold text-white">{walletData.pwtCashout}</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/70 border-gray-700">
                <CardContent className="p-3">
                  <h3 className="text-xs text-gray-300">Activation Token</h3>
                  <p className="text-base font-semibold text-white">{walletData.activationToken}</p>
                </CardContent>
              </Card>
            </div>

            {/* Middle Cards */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Card className="bg-gray-800/70 border-gray-700">
                <CardContent className="p-3">
                  <h3 className="text-xs text-gray-300">Total Referral Claims</h3>
                  <p className="text-base font-semibold text-white">{walletData.referralClaims}</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/70 border-gray-700">
                <CardContent className="p-3">
                  <h3 className="text-xs text-gray-300">Active Vesting Expected Yield</h3>
                  <p className="text-base font-semibold text-white">{walletData.vestingYield}</p>
                </CardContent>
              </Card>
            </div>

            {/* Bottom Cards */}
            <div className="space-y-2">
              <Card className="bg-gray-800/70 border-gray-700">
                <CardContent className="p-3">
                  <h3 className="text-xs text-gray-300">Total OUT-Transfers to date</h3>
                  <p className="text-base font-semibold text-white">{walletData.outgoingTransfers}</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/70 border-gray-700">
                <CardContent className="p-3">
                  <h3 className="text-xs text-gray-300">Total IN-Transfers to date</h3>
                  <p className="text-base font-semibold text-white">{walletData.incomingTransfers}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <DashboardContent />
      )}
    </div>
  )
}
