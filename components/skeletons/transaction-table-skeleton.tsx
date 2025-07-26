import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export function TransactionTableSkeleton() {
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <div className="p-4 border-b border-slate-700">
        <Skeleton className="h-6 w-48 bg-slate-700" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center py-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full bg-slate-700" />
              <div>
                <Skeleton className="h-4 w-32 mb-1 bg-slate-700" />
                <Skeleton className="h-3 w-24 bg-slate-700" />
              </div>
            </div>
            <div className="text-right">
              <Skeleton className="h-4 w-20 mb-1 bg-slate-700" />
              <Skeleton className="h-3 w-16 bg-slate-700" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
