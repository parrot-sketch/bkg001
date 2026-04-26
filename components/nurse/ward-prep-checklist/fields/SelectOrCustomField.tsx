'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UrinalysisResult, type UrinalysisValue } from '@/domain/clinical-forms/NursePreopWardChecklist';

export function SelectOrCustomField(props: {
  label: string;
  value: UrinalysisValue | undefined;
  onChange: (v: UrinalysisValue | undefined) => void;
  options: { value: UrinalysisResult; label: string }[];
  disabled: boolean;
}) {
  const { label, value, onChange, options, disabled } = props;
  const NONE_VALUE = '__none__';

  const currentEnum =
    value === undefined
      ? NONE_VALUE
      : typeof value === 'string'
        ? value
        : UrinalysisResult.OTHER;

  const customText = value && typeof value === 'object' ? value.custom : '';

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <div className="flex flex-wrap items-start gap-3">
        <Select
          value={currentEnum}
          onValueChange={(v) => {
            if (v === NONE_VALUE || v === '') {
              onChange(undefined);
            } else if (v === UrinalysisResult.OTHER) {
              onChange({ custom: customText });
            } else {
              onChange(v as UrinalysisResult);
            }
          }}
          disabled={disabled}
        >
          <SelectTrigger className="h-9 w-[220px]">
            <SelectValue placeholder="Select result" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>— Not recorded —</SelectItem>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {currentEnum === UrinalysisResult.OTHER && (
          <Input
            className="h-9 flex-1 min-w-[160px]"
            placeholder="Specify result..."
            value={customText}
            disabled={disabled}
            onChange={(e) => onChange({ custom: e.target.value })}
          />
        )}
      </div>
    </div>
  );
}

