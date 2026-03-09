'use client';

import { CheckCircle2 } from 'lucide-react';

interface AutoSaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  isSaving: boolean;
}

export function AutoSaveIndicator({
  status,
  isSaving,
}: AutoSaveIndicatorProps) {
  if (status === 'saving' || isSaving) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-blue-600">
        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
        <span>Saving…</span>
      </div>
    );
  }

  if (status === 'saved') {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-emerald-600">
        <CheckCircle2 className="h-3 w-3" />
        <span>All changes saved</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-red-600 font-medium">
        <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
        <span>Save failed — retry</span>
      </div>
    );
  }

  return null;
}
