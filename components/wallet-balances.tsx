"use client"

import { useEffect, useState } from "react"
import { useWallet } from "@/context/wallet-context"
import { formatCurrency } from "@/lib/utils"

const WalletBalances = () => {
  const { balances, fetchBalances } = useWallet()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadBalances = async () => {
      setLoading(true)
      await fetchBalances()
      setLoading(false)
    }

    loadBalances()
  }, [fetchBalances])

  if (loading) {
    return <div>Loading balances...</div>
  }

  if (!balances) {
    return <div>Could not load balances.</div>
  }

  return (
    <div>
      <h2>Wallet Balances</h2>
      <ul>
        {Object.entries(balances).map(([currency, amount]) => (
          <li key={currency}>
            {currency}: {formatCurrency(amount)}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default WalletBalances
