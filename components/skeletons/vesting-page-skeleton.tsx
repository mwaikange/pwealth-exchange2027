import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export function VestingPageSkeleton() {
  return (
    <div className="h-[calc(100vh-130px)] bg-gray-900 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-64 mb-2 bg-slate-700" />
        <Skeleton className="h-4 w-96 bg-slate-700" />
      </div>

      {/* Wallet Summary */}
      <Card className="bg-slate-800/50 border-slate-700 p-4">
        <Skeleton className="h-6 w-48 mb-4 bg-slate-700" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-24 mb-2 bg-slate-700" />
              <Skeleton className="h-8 w-32 bg-slate-700" />
            </div>
          ))}
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex mb-4 gap-1">
        <Skeleton className="flex-1 h-12 rounded-t-lg bg-slate-700" />
        <Skeleton className="flex-1 h-12 rounded-t-lg bg-slate-700" />
        <Skeleton className="flex-1 h-12 rounded-t-lg bg-slate-700" />
      </div>

      {/* Level Info */}
      <Card className="bg-slate-800/50 border-slate-700 p-4">
        <Skeleton className="h-6 w-32 mb-3 bg-slate-700" />
        <Skeleton className="h-4 w-48 mb-2 bg-slate-700" />
        <Skeleton className="h-4 w-full bg-slate-700" />
      </Card>

      {/* Vesting Slots */}
      <div>
        <Skeleton className="h-6 w-72 mb-4 bg-slate-700" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-slate-800/50 border-slate-700 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-24 bg-slate-700" />
                <Skeleton className="h-5 w-16 bg-slate-700" />
              </div>
              <Skeleton className="h-16 w-full rounded-lg bg-slate-700" />
              <Skeleton className="h-10 w-full rounded-md bg-slate-700" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
