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
  const { title = "Surgeon’s Ward Checklist", showActions, isDirty, isSaving, onSave, onFinalize } = props;

  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      {showActions ? (
        <div className="flex items-center gap-2">
          <Button onClick={onSave} disabled={isSaving || !isDirty} className="gap-1.5">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Draft
          </Button>
          <Button variant="default" onClick={onFinalize} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            <Lock className="h-4 w-4" />
            Finalize
          </Button>
        </div>
      ) : null}
    </div>
  );
}

