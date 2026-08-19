import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { generatePageNumbers } from '../utils/pagination';
import type { PatientListMeta } from '../types/patient-page';

interface PatientPaginationProps {
  meta: PatientListMeta;
  currentPage: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function PatientPagination({ meta, currentPage, limit, onPageChange }: PatientPaginationProps) {
  const pageNumbers = generatePageNumbers(currentPage, meta.totalPages);

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-[#e7d6bf]/60">
      <p className="text-xs text-[#2c2e4b]/50">
        Showing{' '}
        <span className="font-medium text-[#2c2e4b]">
          {Math.min((currentPage - 1) * limit + 1, meta.totalRecords)}
        </span>{' '}
        –{' '}
        <span className="font-medium text-[#2c2e4b]">
          {Math.min(currentPage * limit, meta.totalRecords)}
        </span>{' '}
        of{' '}
        <span className="font-medium text-[#2c2e4b]">{meta.totalRecords.toLocaleString()}</span>{' '}
        patients
        <span className="text-[#2c2e4b]/40 ml-2">
          Page {currentPage} of {meta.totalPages}
        </span>
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pageNumbers.map((p, idx) =>
          p === '...' ? (
            <span key={`dots-${idx}`} className="px-1.5 text-xs text-[#2c2e4b]/30">
              ...
            </span>
          ) : (
            <Button
              key={p}
              variant={currentPage === p ? 'default' : 'outline'}
              size="icon"
              onClick={() => onPageChange(p as number)}
              className={cn(
                'h-8 w-8 rounded-lg text-xs font-medium',
                currentPage !== p && 'border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30',
              )}
            >
              {p}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
          onClick={() => onPageChange(Math.min(meta.totalPages, currentPage + 1))}
          disabled={currentPage >= meta.totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
