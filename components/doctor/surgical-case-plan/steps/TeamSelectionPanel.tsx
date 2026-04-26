'use client';

import { Loader2 } from 'lucide-react';

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
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Anaesthesiologist
          </label>
          <select
            className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm"
            value={value.anesthesiologistUserId}
            onChange={(e) => onChange({ ...value, anesthesiologistUserId: e.target.value })}
          >
            <option value="">— Select —</option>
            {staffDoctors.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 mt-1">Uses user accounts (Role: DOCTOR).</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Scrub Nurse
          </label>
          <select
            className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm"
            value={value.scrubNurseUserId}
            onChange={(e) => onChange({ ...value, scrubNurseUserId: e.target.value })}
          >
            <option value="">— Select —</option>
            {staffNurses.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Circulating Nurse
          </label>
          <select
            className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-sm"
            value={value.circulatingNurseUserId}
            onChange={(e) => onChange({ ...value, circulatingNurseUserId: e.target.value })}
          >
            <option value="">— Select —</option>
            {staffNurses.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

