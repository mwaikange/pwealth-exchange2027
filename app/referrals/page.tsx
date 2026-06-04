"use client"

import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const supabase = getSupabaseClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchReferrals()
  }, [])

  async function fetchReferrals() {
    try {
      setLoading(true)

      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      const { data, error } = await supabase
        .from("progression_levels_new")
        .select("*")
        .eq("referrer_uuid", userData.user.id)
        .order("level")
        .order("register_date", { ascending: false })

      if (error) {
        throw error
      }

      setReferrals(data || [])
    } catch (error: any) {
      console.error("Error fetching referrals:", error.message)
      toast({
        title: "Error",
        description: "Failed to fetch referrals. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleClaim(referral: any) {
    try {
      setClaimingId(referral.id)

      const { error } = await supabase.rpc("claim_referral_reward", {
        p_referred_uuid: referral.referred_uuid,
        p_level: referral.level,
      })

      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: "Referral reward claimed successfully!",
      })

      // Refresh the referrals list
      fetchReferrals()
    } catch (error: any) {
      console.error("Error claiming reward:", error.message)
      toast({
        title: "Error",
        description: error.message || "Failed to claim reward. Please try again.",
        variant: "destructive",
      })
    } finally {
      setClaimingId(null)
    }
  }

  function getButtonState(referral: any) {
    if (referral.claimed && referral.auto_claimed) {
      return {
        text: "Auto-Claimed",
        disabled: true,
        className: "bg-purple-600 hover:bg-purple-700 cursor-not-allowed",
      }
    } else if (referral.claimed) {
      return {
        text: "Claimed",
        disabled: true,
        className: "bg-gray-500 hover:bg-gray-600 cursor-not-allowed",
      }
    } else if (referral.progress >= 5) {
      return {
        text: "Claim",
        disabled: false,
        className: "bg-green-600 hover:bg-green-700",
      }
    } else {
      return {
        text: `${referral.progress}/5`,
        disabled: true,
        className: "bg-blue-600 hover:bg-blue-700 cursor-not-allowed",
      }
    }
  }

  function formatDate(dateString: string) {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  function filterReferralsByLevel(level: number) {
    return referrals.filter((referral) => referral.level === level)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="1">
            <TabsList className="grid grid-cols-5 mb-4">
              <TabsTrigger value="1">Level 1</TabsTrigger>
              <TabsTrigger value="2">Level 2</TabsTrigger>
              <TabsTrigger value="3">Level 3</TabsTrigger>
              <TabsTrigger value="4">Level 4</TabsTrigger>
              <TabsTrigger value="5">Level 5</TabsTrigger>
            </TabsList>

            {[1, 2, 3, 4, 5].map((level) => (
              <TabsContent key={level} value={level.toString()}>
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filterReferralsByLevel(level).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Referral ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterReferralsByLevel(level).map((referral) => {
                        const buttonState = getButtonState(referral)
                        return (
                          <TableRow key={referral.id}>
                            <TableCell>{referral.display_id}</TableCell>
                            <TableCell>{formatDate(referral.register_date)}</TableCell>
                            <TableCell>{referral.progress}/5</TableCell>
                            <TableCell>
                              <Button
                                className={buttonState.className}
                                disabled={buttonState.disabled || claimingId === referral.id}
                                onClick={() => handleClaim(referral)}
                              >
                                {claimingId === referral.id ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Claiming...
                                  </>
                                ) : (
                                  buttonState.text
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">No referrals found for Level {level}</div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
