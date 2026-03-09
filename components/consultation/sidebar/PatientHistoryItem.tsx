'use client';

import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import type { PatientConsultationHistoryItemDto } from '@/application/dtos/PatientConsultationHistoryDto';

interface PatientHistoryItemProps {
  consultation: PatientConsultationHistoryItemDto;
}

export function PatientHistoryItem({ consultation }: PatientHistoryItemProps) {
  return (
    <motion.div
      whileHover={{ x: 2, scale: 1.01 }}
      className="group flex items-start gap-4 bg-slate-50 hover:bg-white p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all cursor-default"
    >
      <div className="mt-1.5 h-2 w-2 rounded-lg bg-slate-300 group-hover:bg-indigo-500 shrink-0 transition-all" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[13px] font-bold text-slate-900 tracking-tight">
            {format(new Date(consultation.appointmentDate), 'MMM d, yyyy')}
          </span>
          {consultation.outcomeType && (
            <Badge variant="outline" className="text-[9px] h-4.5 px-2 font-bold border-indigo-100 bg-indigo-50 text-indigo-600 uppercase tracking-wider">
              {consultation.outcomeType === 'PROCEDURE_RECOMMENDED' ? 'Procedure' : 'Consult'}
            </Badge>
          )}
        </div>
        {consultation.notesSummary && (
          <p className="text-[11px] text-slate-500 group-hover:text-slate-600 line-clamp-2 leading-relaxed transition-colors">
            {consultation.notesSummary}
          </p>
        )}
      </div>
    </motion.div>
  );
}
