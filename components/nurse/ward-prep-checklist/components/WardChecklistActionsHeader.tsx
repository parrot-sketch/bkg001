'use client';

import { Loader2, Lock, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function WardChecklistActionsHeader(props: {
  title?: string;
  showActions: boolean;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onFinalize: () => void;
}) {
  const { title = "Surgeon's Ward Checklist", showActions, isDirty, isSaving, onSave, onFinalize } = props;

  if (!showActions) return null;

  return (
    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {isDirty ? 'You have unsaved changes' : 'All changes saved'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={onSave}
          disabled={isSaving || !isDirty}
          variant="outline"
          className="gap-1.5 h-9"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Draft
        </Button>
        <Button
          onClick={onFinalize}
          disabled={isSaving}
          className="gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Lock className="h-4 w-4" />
          Finalize
        </Button>
      </div>
    </div>
  );
}
