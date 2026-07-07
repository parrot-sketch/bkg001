import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border border-[#e7d6bf] bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4 border-b border-[#e7d6bf]">
              <Skeleton className="h-3.5 w-20 bg-[#e7d6bf]/30" />
              <Skeleton className="size-7 rounded-md bg-[#e7d6bf]/30" />
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <Skeleton className="h-7 w-10 bg-[#e7d6bf]/30" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending actions skeleton */}
      <Card className="border border-[#e7d6bf] bg-white shadow-sm">
        <CardHeader className="border-b border-[#e7d6bf] px-5 py-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-40 bg-[#e7d6bf]/30" />
            <Skeleton className="h-3.5 w-16 bg-[#e7d6bf]/30" />
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg bg-[#e7d6bf]/30" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-32 bg-[#e7d6bf]/30" />
                <Skeleton className="h-3 w-24 bg-[#e7d6bf]/30" />
              </div>
              <Skeleton className="h-7 w-16 rounded-lg bg-[#e7d6bf]/30" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Queue panels skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border border-[#e7d6bf] bg-white shadow-sm">
            <CardHeader className="border-b border-[#e7d6bf] px-5 py-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-28 bg-[#e7d6bf]/30" />
                <Skeleton className="h-3 w-12 bg-[#e7d6bf]/30" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-[#e7d6bf]">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-lg bg-[#e7d6bf]/30" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-36 bg-[#e7d6bf]/30" />
                        <Skeleton className="h-3 w-20 bg-[#e7d6bf]/30" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}