'use client';

import { Button } from '@/components/ui/button';

interface BillingPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function BillingPagination({ currentPage, totalPages, onPageChange }: BillingPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between pt-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="h-8 px-3 text-xs border-[#e7d6bf] text-[#2c2e4b] rounded-lg"
      >
        Prev
      </Button>
      <span className="text-xs text-[#2c2e4b]/60 tabular-nums">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="h-8 px-3 text-xs border-[#e7d6bf] text-[#2c2e4b] rounded-lg"
      >
        Next
      </Button>
    </div>
  );
}
