"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { MobileHeader } from "@/components/mobile-header"
import { FeatureUnavailableModal } from "@/components/feature-unavailable-modal"
import { useMobileDetectionContext } from "@/contexts/mobile-detection-context"
import { Loader2 } from "lucide-react"
import { ReferralsComponent } from "@/components/referrals-component" // Changed to named import
import { useRouter } from "next/navigation"

export default function ReferralsPage() {
  const { isMobile } = useMobileDetectionContext()
  const router = useRouter()
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

    // Show modal immediately on mobile
    if (isMobile) {
      setShowFeatureUnavailableModal(true)
    }
  }, [supabase, isMobile])

  // Redirect to settings after modal is closed on mobile
  const handleModalClose = () => {
    setShowFeatureUnavailableModal(false)

    if (isMobile) {
      router.push("/dashboard/settings")
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
    <>
      {isMobile ? (
        <div className="min-h-screen bg-[url(/background.jpg)] bg-cover bg-center">
          <MobileHeader email={userEmail} referralCode={userReferralCode} showBackButton={true} />

          <FeatureUnavailableModal
            isOpen={showFeatureUnavailableModal}
            onClose={handleModalClose}
            featureName="Referral claims"
          />
        </div>
      ) : (
        <ReferralsComponent />
      )}
    </>
  )
}
