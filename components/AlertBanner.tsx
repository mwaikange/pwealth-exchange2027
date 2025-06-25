import { AlertTriangle } from "lucide-react"

export default function AlertBanner() {
  return (
    <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-4 flex items-center gap-3 mb-6">
      <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
      <span className="text-red-800 dark:text-red-200 font-medium">
        All orders automatically expire at Sunday 23:59 !!
      </span>
    </div>
  )
}
