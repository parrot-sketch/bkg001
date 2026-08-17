'use client';

import { Loader2 } from 'lucide-react';
import { StaffCombobox } from './StaffCombobox';

export interface StaffUserOption {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

interface Props {
  staffDoctors: StaffUserOption[];
  staffNurses: StaffUserOption[];
  isLoading: boolean;
  value: {
    anesthesiologistUserId: string;
    scrubNurseUserId: string;
    circulatingNurseUserId: string;
  };
  onChange: (next: Props['value']) => void;
}

export function TeamSelectionPanel({
  staffDoctors,
  staffNurses,
  isLoading,
  value,
  onChange,
}: Props) {
  const update = (field: keyof Props['value'], nextValue: string) => {
    onChange({ ...value, [field]: nextValue });
  };

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 p-4 bg-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Operative Team</p>
          <p className="text-xs text-slate-500">Assign core team members for the case.</p>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading staff…
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StaffCombobox
          label="Anaesthesiologist"
          options={staffDoctors}
          isLoading={isLoading}
          value={value.anesthesiologistUserId}
          onChange={(next) => update('anesthesiologistUserId', next)}
          placeholder="Select anaesthesiologist..."
          emptyText="No doctors found."
          customPlaceholder="Enter anaesthesiologist name..."
          roleHint="Uses user accounts (Role: DOCTOR)."
        />

        <StaffCombobox
          label="Scrub Nurse"
          options={staffNurses}
          isLoading={isLoading}
          value={value.scrubNurseUserId}
          onChange={(next) => update('scrubNurseUserId', next)}
          placeholder="Select scrub nurse..."
          emptyText="No nurses found."
          customPlaceholder="Enter scrub nurse name..."
        />

        <StaffCombobox
          label="Circulating Nurse"
          options={staffNurses}
          isLoading={isLoading}
          value={value.circulatingNurseUserId}
          onChange={(next) => update('circulatingNurseUserId', next)}
          placeholder="Select circulating nurse..."
          emptyText="No nurses found."
          customPlaceholder="Enter circulating nurse name..."
        />
      </div>
    </div>
  );
}
