'use client';

import { format } from 'date-fns';
import { Building2, Phone } from 'lucide-react';

interface DocumentFooterProps {
  generatedAt?: Date;
}

export function DocumentFooter({ generatedAt }: DocumentFooterProps) {
  return (
    <div className="mt-8 pt-6 border-t border-[#e7d6bf]">
      <div className="flex flex-wrap items-center justify-between text-xs text-[#2c2e4b]/60">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            Nairobi Sculpt Medical Center
          </span>
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            +254 700 000 000
          </span>
        </div>
        <p>Generated on {format(generatedAt || new Date(), 'PPpp')}</p>
      </div>
    </div>
  );
}
