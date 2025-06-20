"use client"

import type React from "react"
import { useState } from "react"
import { useWallet } from "@/contexts/wallet-context"
import { ethers } from "ethers"
import { toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

interface CashoutComponentProps {
  contractAddress: string
  abi: any
}

const CashoutComponent: React.FC<CashoutComponentProps> = ({ contractAddress, abi }) => {
  const { signer, address, isLoading: isWalletLoading } = useWallet()
  const [amount, setAmount] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value)
  }

  const handleCashout = async () => {
    if (!signer) {
      toast.error("Please connect your wallet.")
      return
    }

    if (!amount) {
      toast.error("Please enter an amount.")
      return
    }

    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Please enter a valid amount.")
      return
    }

    setIsLoading(true)

    try {
      const contract = new ethers.Contract(contractAddress, abi, signer)
      const amountInWei = ethers.utils.parseEther(amount)
      const transaction = await contract.cashout(amountInWei)
      await transaction.wait()
      toast.success("Cashout successful!")
      setAmount("") // Reset the amount after successful cashout
    } catch (error: any) {
      console.error("Cashout error:", error)
      toast.error(`Cashout failed: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (isWalletLoading) {
    return <div>Loading wallet...</div>
  }

  return (
    <div>
      <label htmlFor="amount">Amount:</label>
      <input
        type="number"
        id="amount"
        value={amount}
        onChange={handleAmountChange}
        placeholder="Enter amount to cashout"
        disabled={!signer || isLoading}
      />
      <button onClick={handleCashout} disabled={!signer || isLoading}>
        {isLoading ? "Cashing Out..." : "Cashout"}
      </button>
      {signer && <p>Your Address: {address}</p>}
    </div>
  )
}

export default CashoutComponent
