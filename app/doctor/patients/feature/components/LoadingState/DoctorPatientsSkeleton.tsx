'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function DoctorPatientsSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 bg-white border border-[#e7d6bf] rounded-lg"
        >
          <Skeleton className="h-9 w-9 rounded-lg bg-[#e7d6bf]/30" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-44 bg-[#e7d6bf]/30" />
            <Skeleton className="h-3 w-28 bg-[#e7d6bf]/30" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg bg-[#e7d6bf]/30" />
        </div>
      ))}
    </div>
  );
}
