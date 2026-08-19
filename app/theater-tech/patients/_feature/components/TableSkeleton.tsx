import { Skeleton } from '@/components/ui/skeleton';

export function TableSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-[#e7d6bf]/60">
          <Skeleton className="h-9 w-9 rounded-full bg-[#e7d6bf]/20" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-36 bg-[#e7d6bf]/15" />
            <Skeleton className="h-3 w-24 bg-[#e7d6bf]/10" />
          </div>
          <Skeleton className="h-4 w-20 hidden md:block bg-[#e7d6bf]/10" />
          <Skeleton className="h-4 w-32 hidden lg:block bg-[#e7d6bf]/10" />
          <Skeleton className="h-8 w-8 rounded-lg bg-[#e7d6bf]/10" />
        </div>
      ))}
    </div>
  );
}
