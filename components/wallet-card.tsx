import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/contexts/wallet-context"

interface WalletCardProps {
  title: string
  value: number
  description: string
  type?: "currency" | "shares"
  icon?: React.ReactNode
  className?: string
}

export function WalletCard({ title, value, description, type = "currency", icon, className = "" }: WalletCardProps) {
  const formatValue = (val: number) => {
    if (type === "shares") {
      return `${val.toFixed(4)} shares`
    }
    return formatCurrency(val)
  }

  return (
    <Card className={`bg-[#2a2d3a] border-gray-700 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-300 flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white mb-1">{formatValue(value)}</div>
        <p className="text-xs text-gray-400">{description}</p>
      </CardContent>
    </Card>
  )
}
