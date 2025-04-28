"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { MobileHeader } from "@/components/mobile-header"
import { MobileNotification } from "@/components/mobile-notification"
import { FeatureUnavailableModal } from "@/components/feature-unavailable-modal"
import { useMobileDetectionContext } from "@/contexts/mobile-detection-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { CashoutComponent } from "@/components/cashout-component" // Changed to named import

export default function CashoutPage() {
  const { isMobile } = useMobileDetectionContext()
  const supabase = createClientComponentClient()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userReferralCode, setUserReferralCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFeatureUnavailableModal, setShowFeatureUnavailableModal] = useState(false)

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
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-lg">TRANSFER - (PWT/FIAT)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <label className="text-white text-sm">Recipient Email</label>
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-white text-sm">Amount to Transfer</label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                  </div>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setShowFeatureUnavailableModal(true)}
                  >
                    Transfer
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/70 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-lg">GIFT ACTIVATION FEE TOKENS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <label className="text-white text-sm">Recipient Email</label>
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-white text-sm">Number of Tokens</label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="1"
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                  </div>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setShowFeatureUnavailableModal(true)}
                  >
                    Gift Tokens
                  </Button>
                </div>
              </CardContent>
            </Card>

            <FeatureUnavailableModal
              isOpen={showFeatureUnavailableModal}
              onClose={() => setShowFeatureUnavailableModal(false)}
              featureName="Token transfer"
            />
          </div>
        </>
      ) : (
        <CashoutComponent />
      )}
    </div>
  )
}
