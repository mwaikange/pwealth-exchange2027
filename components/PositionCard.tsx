import { Button } from "@/components/ui/button"

interface PositionCardProps {
  title: string
  count: number
  type: "buy" | "sell"
}

export default function PositionCard({ title, count, type }: PositionCardProps) {
  return (
    <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4 flex items-center justify-between border border-green-200 dark:border-green-800">
      <div className="flex items-center gap-4">
        <span className="font-medium text-gray-800 dark:text-gray-200">{title}</span>
        <span className="bg-white dark:bg-gray-800 px-3 py-1 rounded text-red-600 dark:text-red-400 font-bold text-lg border border-gray-200 dark:border-gray-600">
          {count}
        </span>
      </div>
      <Button className="bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700 text-white px-6">
        CANCEL
      </Button>
    </div>
  )
}
