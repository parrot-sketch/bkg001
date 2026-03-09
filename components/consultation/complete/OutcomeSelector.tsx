'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Info, Stethoscope, CalendarPlus, CheckCircle } from 'lucide-react';
import { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';

interface OutcomeSelectorProps {
  value: ConsultationOutcomeType | '';
  onValueChange: (value: ConsultationOutcomeType) => void;
  isProcedure: boolean;
  isFollowUp: boolean;
}

export function OutcomeSelector({
  value,
  onValueChange,
  isProcedure,
  isFollowUp,
}: OutcomeSelectorProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-black">
        Consultation Outcome <span className="text-red-500 ml-1">*</span>
      </Label>

      <Select
        value={value}
        onValueChange={(v) => onValueChange(v as ConsultationOutcomeType)}
      >
        <SelectTrigger className="bg-white">
          <SelectValue placeholder="Select outcome…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ConsultationOutcomeType.PROCEDURE_RECOMMENDED}>
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-blue-600" />
              <span>Procedure Recommended</span>
            </div>
          </SelectItem>
          <SelectItem value={ConsultationOutcomeType.FOLLOW_UP_CONSULTATION_NEEDED}>
            <div className="flex items-center gap-2">
              <CalendarPlus className="h-4 w-4 text-amber-600" />
              <span>Follow-Up Needed</span>
            </div>
          </SelectItem>
          <SelectItem value={ConsultationOutcomeType.CONSULTATION_ONLY}>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-slate-500" />
              <span>Consultation Only</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {isProcedure && (
        <p className="text-xs text-blue-600 flex items-center gap-1.5 ml-0.5">
          <Info className="h-3 w-3" />
          Patient will proceed directly to surgery waiting list.
        </p>
      )}
      
      {isFollowUp && (
        <p className="text-xs text-amber-600 flex items-center gap-1.5 ml-0.5">
          <Info className="h-3 w-3" />
          You will be prompted to schedule the next visit.
        </p>
      )}
    </div>
  );
}
