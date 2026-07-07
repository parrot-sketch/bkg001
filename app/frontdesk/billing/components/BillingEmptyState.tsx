'use client';

import { CheckCircle2 } from 'lucide-react';

interface BillingEmptyStateProps {
  hasFilters: boolean;
  onClear: () => void;
}

export function BillingEmptyState({ hasFilters, onClear }: BillingEmptyStateProps) {
  return (
    <div className="border border-[#e7d6bf] bg-white rounded-xl p-12 text-center">
      <div className="h-12 w-12 rounded-full bg-[#e7d6bf]/30 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="h-6 w-6 text-[#2c2e4b]/40" />
      </div>
      <p className="text-lg font-semibold text-[#2c2e4b]">
        {hasFilters ? 'No matching bills' : 'All caught up!'}
      </p>
      <p className="text-sm text-[#2c2e4b]/60 mt-1">
        {hasFilters ? 'Try adjusting your search or filters' : 'No pending payments right now'}
      </p>
      {hasFilters && (
        <button
          onClick={onClear}
          className="mt-4 text-xs font-medium text-[#caa26a] hover:text-[#b8913e] underline underline-offset-2"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
