"use client"

import { useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useWallet } from "@/contexts/wallet-context"
import { useTransactions } from "@/contexts/transaction-context"
import { useAuth } from "@/contexts/auth-context"

export function useRealtime() {
  const { user } = useAuth()
  const { refreshBalances } = useWallet()
  const { refreshTransactions } = useTransactions()

  useEffect(() => {
    if (!user) return

    console.log("[Realtime] Setting up realtime listeners for user:", user.id)

    const channel = supabase
      .channel("dashboard-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "balances",
          filter: `user_uuid=eq.${user.id}`,
        },
        () => {
          console.log("[Realtime] Balance change detected, refreshing data...")
          refreshBalances()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_uuid=eq.${user.id}`,
        },
        () => {
          console.log("[Realtime] Transaction change detected, refreshing data...")
          refreshTransactions()
        },
      )
      .subscribe()

    return () => {
      console.log("[Realtime] Cleaning up realtime listeners")
      supabase.removeChannel(channel)
    }
  }, [user, refreshBalances, refreshTransactions])
}
