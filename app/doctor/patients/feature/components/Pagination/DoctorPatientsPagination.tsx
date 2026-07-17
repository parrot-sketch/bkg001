'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface DoctorPatientsPaginationProps {
  total: number;
  page: number;
  totalPages: number;
  start: number;
  end: number;
  loading: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onPageChange: (page: number) => void;
}

export function DoctorPatientsPagination({
  total,
  page,
  totalPages,
  start,
  end,
  loading,
  onPrevious,
  onNext,
  onPageChange,
}: DoctorPatientsPaginationProps) {
  if (total <= 15) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-3 border border-white/10 bg-white/5 rounded-xl px-4 py-2.5">
      <span className="text-xs text-white/60 tabular-nums">
        Showing {start}–{end} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-xs text-white border-white/20 bg-white/5 hover:bg-white/10 gap-1"
          onClick={onPrevious}
          disabled={page <= 1 || loading}
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Prev
        </Button>

        <div className="flex items-center gap-0.5 px-1">
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = i + 1;
            const nearCurrent = Math.abs(p - page) <= 1;
            const isEdge = p === 1 || p === totalPages;
            if (!nearCurrent && !isEdge) {
              if (p === 2 || p === totalPages - 1) {
                return (
                  <span key={p} className="text-white/30 text-xs px-1">
                    …
                  </span>
                );
              }
              return null;
            }
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                disabled={loading}
                className={`h-7 min-w-[28px] px-1.5 rounded-md text-xs font-medium transition-colors duration-150 ${
                  p === page
                    ? 'bg-[#caa26a] text-[#2c2e4b]'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-xs text-white border-white/20 bg-white/5 hover:bg-white/10 gap-1"
          onClick={onNext}
          disabled={page >= totalPages || loading}
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
