"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { VestingSchedules } from "@/components/vesting-schedules"
import { MobileHeader } from "@/components/mobile-header"
import { MobileNotification } from "@/components/mobile-notification"
import { useMobileDetectionContext } from "@/contexts/mobile-detection-context"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"

export default function VestingPage() {
  const { isMobile } = useMobileDetectionContext()
  const supabase = createClientComponentClient()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userReferralCode, setUserReferralCode] = useState<string | null>(null)
  const [vestingSchedules, setVestingSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

        // Fetch vesting schedules
        const { data: vestingData } = await supabase.from("vesting_schedules").select("*").eq("user_id", user.id)

        if (vestingData) {
          setVestingSchedules(vestingData)
        }
      }

      setLoading(false)
    }

    fetchUserData()
  }, [supabase])

  // Function to determine button text based on schedule status
  const getButtonText = (schedule: any) => {
    if (!schedule.is_active) return "ACTIVATE"
    if (schedule.is_invested) return "CLAIM"
    return "INVEST"
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
          <MobileHeader email={userEmail} referralCode={userReferralCode} actionButtonText="TOP UP" />

          <div className="p-4 pb-20">
            <MobileNotification />

            <Tabs defaultValue="level1" className="w-full">
              <TabsList className="grid grid-cols-3 bg-gray-800/70 mb-4">
                <TabsTrigger value="level1" className="text-white data-[state=active]:bg-gray-700">
                  LEVEL 1
                </TabsTrigger>
                <TabsTrigger value="level2" className="text-white data-[state=active]:bg-gray-700">
                  LEVEL 2
                </TabsTrigger>
                <TabsTrigger value="level3" className="text-white data-[state=active]:bg-gray-700">
                  LEVEL 3
                </TabsTrigger>
              </TabsList>

              {["level1", "level2", "level3"].map((level) => (
                <TabsContent key={level} value={level}>
                  {vestingSchedules
                    .filter((schedule) => schedule.level.toLowerCase() === level.replace("level", ""))
                    .map((schedule, index) => (
                      <Card key={index} className="mb-4 bg-gray-800/70 border-gray-700">
                        <CardContent className="p-0">
                          <div className="p-4">
                            <div className="flex justify-between items-center mb-2">
                              <h3 className="text-white font-medium">
                                {schedule.level} {schedule.sublevel}
                              </h3>
                              <span className="text-white text-sm">{schedule.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                              <div className="bg-green-500 h-full" style={{ width: `${schedule.progress}%` }}></div>
                            </div>
                            <div className="mt-4 text-xs text-gray-300">
                              <p>Maturity Date: {new Date(schedule.maturity_date).toLocaleDateString()}</p>
                              <p>Expected Yield: {schedule.expected_yield} PWT-Cashout</p>
                              <p>Maturity Yield: {schedule.maturity_yield} tokens</p>
                            </div>
                            <div className="mt-4 flex justify-end">
                              <button
                                className={`px-4 py-2 text-white rounded-md ${
                                  schedule.is_active && schedule.is_invested
                                    ? "bg-yellow-600 hover:bg-yellow-700"
                                    : schedule.is_active
                                      ? "bg-blue-600 hover:bg-blue-700"
                                      : "bg-green-600 hover:bg-green-700"
                                }`}
                              >
                                {getButtonText(schedule)}
                              </button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </>
      ) : (
        <VestingSchedules />
      )}
    </div>
  )
}
