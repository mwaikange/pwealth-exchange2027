import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export function OverviewSkeleton() {
  return (
    <div className="h-[calc(100vh-130px)] bg-gray-900 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-48 mb-2 bg-slate-700" />
        <Skeleton className="h-4 w-80 bg-slate-700" />
      </div>

      {/* Wallet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-slate-800/50 border-slate-700 p-4">
            <Skeleton className="h-4 w-24 mb-2 bg-slate-700" />
            <Skeleton className="h-8 w-32 mb-1 bg-slate-700" />
            <Skeleton className="h-3 w-16 bg-slate-700" />
          </Card>
        ))}
      </div>

      {/* Share Price Card */}
      <Card className="bg-slate-800/50 border-slate-700 p-4">
        <Skeleton className="h-6 w-32 mb-3 bg-slate-700" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32 bg-slate-700" />
          <Skeleton className="h-6 w-24 bg-slate-700" />
        </div>
      </Card>

      {/* Recent Transactions */}
      <Card className="bg-slate-800/50 border-slate-700 p-4">
        <Skeleton className="h-6 w-48 mb-4 bg-slate-700" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full bg-slate-700" />
                <div>
                  <Skeleton className="h-4 w-32 mb-1 bg-slate-700" />
                  <Skeleton className="h-3 w-24 bg-slate-700" />
                </div>
              </div>
              <Skeleton className="h-4 w-20 bg-slate-700" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
