'use client';

import { Button } from '@/components/ui/button';

interface DoctorPatientsErrorProps {
  onRetry: () => void;
}

export function DoctorPatientsError({ onRetry }: DoctorPatientsErrorProps) {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-full max-w-md border border-[#e7d6bf] bg-white p-6 text-center rounded-xl">
          <p className="text-sm font-semibold text-[#2c2e4b]">Unable to load patient roster</p>
          <p className="text-xs text-[#2c2e4b]/60 mt-1">Please retry.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 rounded-lg border-[#e7d6bf] text-[#2c2e4b]"
            onClick={onRetry}
          >
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}
