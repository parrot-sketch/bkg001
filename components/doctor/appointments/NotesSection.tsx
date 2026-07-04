'use client';

import { FileText } from 'lucide-react';

interface NotesSectionProps {
  reason?: string;
  note?: string;
}

export function NotesSection({ reason, note }: NotesSectionProps) {
  if (!reason && !note) return null;

  return (
    <div className="border border-[#caa26a]/30 bg-white">
      <div className="px-4 py-3 border-b border-[#caa26a]/30 bg-[#e7d6bf]/30">
        <div className="text-sm font-semibold text-[#2c2e4b] flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#caa26a]" />
          Clinical Notes
        </div>
        <p className="text-[10px] text-[#2c2e4b]/60 mt-0.5 font-medium uppercase tracking-wider">
          Appointment Documentation
        </p>
      </div>
      <div className="p-5 space-y-5">
        {reason && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-[#caa26a]" />
              <p className="text-[10px] uppercase tracking-wider font-bold text-[#caa26a]">
                Reason for Visit
              </p>
            </div>
            <div className="ml-3 pl-3 border-l-2 border-[#e7d6bf]">
              <p className="text-sm text-[#2c2e4b] leading-relaxed whitespace-pre-line">
                {reason}
              </p>
            </div>
          </div>
        )}

        {reason && note && (
          <div className="border-t border-[#e7d6bf]/60" />
        )}

        {note && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-[#2c2e4b]" />
              <p className="text-[10px] uppercase tracking-wider font-bold text-[#2c2e4b]">
                Additional Notes
              </p>
            </div>
            <div className="ml-3 pl-3 border-l-2 border-[#caa26a]/40">
              <p className="text-sm text-[#2c2e4b]/80 leading-relaxed whitespace-pre-line">
                {note}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
