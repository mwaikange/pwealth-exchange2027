interface WalletAmountCardProps {
  title: string
  amount: string
  subtitle?: string
}

export default function WalletAmountCard({ title, amount, subtitle }: WalletAmountCardProps) {
  return (
    <div>
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{title}</div>
      <div className="text-2xl font-bold text-black dark:text-white mb-1">{amount}</div>
      {subtitle && <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{subtitle}</div>}
    </div>
  )
}
