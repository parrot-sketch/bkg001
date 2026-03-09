'use client';

import { AlertTriangle } from 'lucide-react';

interface AllergyWarningProps {
  allergies: string;
}

export function AllergyWarning({ allergies }: AllergyWarningProps) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-start gap-2.5 bg-red-50/50 border border-red-100 rounded-xl px-3.5 py-3 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50" />
        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-[11px] font-bold text-red-700 uppercase tracking-widest">Critical Allergies</p>
          <p className="text-xs text-red-900/80 mt-1 leading-relaxed">{allergies}</p>
        </div>
      </div>
    </div>
  );
}
