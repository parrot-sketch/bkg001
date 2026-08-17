'use client';

import type { WardChecklistSectionProps } from '@/components/nurse/ward-prep-checklist/types';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function NursingCommentsSection(props: WardChecklistSectionProps) {
  const { data, onChange, disabled } = props;
  const comments = (data.header as any)?.nursingComments || '';

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-slate-700">Nursing Comments / Observations</Label>
      <Textarea
        value={comments}
        onChange={(e) =>
          onChange({
            ...data,
            header: {
              ...(data.header as any),
              date: (data.header as any)?.date || '',
              nursingComments: e.target.value,
            },
          } as any)
        }
        disabled={disabled}
        className="bg-white text-sm resize-none"
        rows={4}
        placeholder="Enter nursing comments, observations, or any relevant clinical notes..."
      />
    </div>
  );
}
