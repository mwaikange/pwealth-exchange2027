import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export function ExchangePageSkeleton() {
  return (
    <div className="h-[calc(100vh-130px)] bg-gray-900 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-48 mb-2 bg-slate-700" />
        <Skeleton className="h-4 w-80 bg-slate-700" />
      </div>

      {/* Price Card */}
      <Card className="bg-slate-800/50 border-slate-700 p-4">
        <Skeleton className="h-6 w-32 mb-3 bg-slate-700" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32 bg-slate-700" />
          <Skeleton className="h-6 w-24 bg-slate-700" />
        </div>
      </Card>

      {/* Buy/Sell Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Buy Card */}
        <Card className="bg-slate-800/50 border-slate-700 p-4">
          <Skeleton className="h-6 w-24 mb-4 bg-slate-700" />
          <div className="space-y-4">
            <div>
              <Skeleton className="h-4 w-20 mb-2 bg-slate-700" />
              <Skeleton className="h-10 w-full bg-slate-700" />
            </div>
            <div>
              <Skeleton className="h-4 w-24 mb-2 bg-slate-700" />
              <Skeleton className="h-6 w-32 bg-slate-700" />
            </div>
            <Skeleton className="h-10 w-full bg-slate-700" />
          </div>
        </Card>

        {/* Sell Card */}
        <Card className="bg-slate-800/50 border-slate-700 p-4">
          <Skeleton className="h-6 w-24 mb-4 bg-slate-700" />
          <div className="space-y-4">
            <div>
              <Skeleton className="h-4 w-20 mb-2 bg-slate-700" />
              <Skeleton className="h-10 w-full bg-slate-700" />
            </div>
            <div>
              <Skeleton className="h-4 w-24 mb-2 bg-slate-700" />
              <Skeleton className="h-6 w-32 bg-slate-700" />
            </div>
            <Skeleton className="h-10 w-full bg-slate-700" />
          </div>
        </Card>
      </div>

      {/* Orders Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, cardIndex) => (
          <Card key={cardIndex} className="bg-slate-800/50 border-slate-700 p-4">
            <Skeleton className="h-6 w-32 mb-4 bg-slate-700" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-4 w-20 bg-slate-700" />
                  <Skeleton className="h-4 w-16 bg-slate-700" />
                  <Skeleton className="h-4 w-24 bg-slate-700" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
