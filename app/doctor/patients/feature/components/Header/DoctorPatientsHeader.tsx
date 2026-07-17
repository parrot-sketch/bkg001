'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DoctorPatientsHeaderProps {
  total: number;
  loading: boolean;
  onRefresh: () => void;
  refreshing: boolean;
}

export function DoctorPatientsHeader({
  total,
  loading,
  onRefresh,
  refreshing,
}: DoctorPatientsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 className="text-base font-semibold text-white">My Patients</h1>
        {!loading && (
          <p className="text-xs text-white/40 mt-0.5">
            {total} patient{total !== 1 ? 's' : ''} in your roster
          </p>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="text-xs self-start sm:self-auto rounded-lg border-white/20 bg-white/5 text-white hover:bg-white/10 gap-1.5"
        onClick={onRefresh}
        disabled={refreshing || loading}
      >
        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
}
