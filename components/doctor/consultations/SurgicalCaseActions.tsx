'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckCircle, ClipboardList, Scissors } from 'lucide-react';

interface SurgicalCaseActionsProps {
  surgicalCaseId?: string;
  isSurgicalPlanComplete?: boolean;
}

export function SurgicalCaseActions({ surgicalCaseId, isSurgicalPlanComplete }: SurgicalCaseActionsProps) {
  if (!surgicalCaseId) return null;

  return (
    <div className="border-2 border-[#e7d6bf] mb-8">
      <div className="bg-[#e7d6bf]/40 px-4 sm:px-6 py-2 border-b border-[#e7d6bf]">
        <h2 className="font-semibold text-[#2c2e4b] flex items-center gap-2">
          <Scissors className="h-4 w-4 text-[#caa26a]" />
          SURGICAL CASE
        </h2>
      </div>
      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/doctor/surgical-cases/${surgicalCaseId}/plan`}
            className={cn(
              'inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border transition-colors',
              isSurgicalPlanComplete
                ? 'border-[#e7d6bf] bg-white text-[#2c2e4b] hover:bg-[#e7d6bf]/30'
                : 'bg-[#2c2e4b] text-white hover:bg-[#1a1c2f]'
            )}
          >
            {isSurgicalPlanComplete ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                View Plan
              </>
            ) : (
              <>
                <ClipboardList className="h-4 w-4 mr-2" />
                Complete Plan
              </>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}
