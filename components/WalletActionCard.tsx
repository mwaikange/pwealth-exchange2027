"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface WalletActionCardProps {
  buttonText: string
  inputLabel: string
}

export default function WalletActionCard({ buttonText, inputLabel }: WalletActionCardProps) {
  const [amount, setAmount] = useState("")

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">{inputLabel}</label>
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
        />
      </div>
      <Button className="w-full bg-gray-400 hover:bg-gray-500 dark:bg-gray-600 dark:hover:bg-gray-700 text-white">
        {buttonText}
      </Button>
    </div>
  )
}
