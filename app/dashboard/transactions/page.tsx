"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { MobileHeader } from "@/components/mobile-header"
import { MobileNotification } from "@/components/mobile-notification"
import { useMobileDetectionContext } from "@/contexts/mobile-detection-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { format } from "date-fns"
import { TransactionsHistory } from "@/components/transactions-history" // Changed to named import

export default function TransactionsPage() {
  const { isMobile } = useMobileDetectionContext()
  const supabase = createClientComponentClient()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userReferralCode, setUserReferralCode] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
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

        // Fetch transactions
        const { data: transactionsData } = await supabase
          .from("transactions")
          .select("*")
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order("created_at", { ascending: false })
          .limit(20)

        if (transactionsData) {
          setTransactions(transactionsData)
        }
      }

      setLoading(false)
    }

    fetchUserData()
  }, [supabase])

  const getTransactionColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "deposit":
        return "text-green-400"
      case "withdrawal":
        return "text-red-400"
      case "transfer":
        return "text-blue-400"
      default:
        return "text-gray-300"
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
          <MobileHeader email={userEmail} referralCode={userReferralCode} showActionButton={false} />

          <div className="p-4 pb-20">
            <MobileNotification />

            <Card className="bg-gray-800/70 border-gray-700 h-[calc(100vh-180px)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-lg">Transaction History</CardTitle>
              </CardHeader>
              <CardContent className="overflow-y-auto p-0">
                {transactions.length === 0 ? (
                  <div className="text-center text-gray-400 p-6">No transactions to display</div>
                ) : (
                  <div className="divide-y divide-gray-700">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="p-4 hover:bg-gray-800">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className={`font-medium ${getTransactionColor(transaction.type)}`}>{transaction.type}</p>
                            <p className="text-xs text-gray-400">
                              {format(new Date(transaction.created_at), "MMM dd, yyyy • HH:mm")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-semibold">
                              {transaction.amount} {transaction.currency}
                            </p>
                            <p className="text-xs text-gray-400">{transaction.status}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <TransactionsHistory />
      )}
    </div>
  )
}
