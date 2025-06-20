import type React from "react"
import { useWallet } from "@/context/wallet-context"
import { formatCurrency } from "@/lib/utils"

interface WalletCardProps {
  walletId: string
}

const WalletCard: React.FC<WalletCardProps> = ({ walletId }) => {
  const { wallets } = useWallet()
  const wallet = wallets ? wallets[walletId] : undefined

  if (!wallet) {
    return <div>Wallet not found.</div>
  }

  return (
    <div className="border p-4 rounded-md shadow-md">
      <h2 className="text-lg font-semibold">{wallet.name}</h2>
      <p className="text-gray-600">Balance: {formatCurrency(wallet.balance)}</p>
      <p className="text-sm text-gray-500">Currency: {wallet.currency}</p>
    </div>
  )
}

export default WalletCard
