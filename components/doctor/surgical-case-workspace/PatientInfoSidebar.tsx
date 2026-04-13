'use client';

import { Calendar, User, FileText, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// We accept an aggressive 'any' structure for flexibility, since this is a UI component.
interface Props {
  surgicalCase: any;
  patient: any;
}

export function PatientInfoSidebar({ surgicalCase, patient }: Props) {
  const age = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (365.25 * 86400000))
    : null;

  return (
    <div className="h-full overflow-y-auto bg-white">
      {/* Patient Identity */}
      <div className="px-4 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 shrink-0">
            {patient.first_name?.[0]}{patient.last_name?.[0]}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {patient.first_name} {patient.last_name}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
              {patient.file_number && <span className="font-mono">{patient.file_number}</span>}
              {age !== null && <span>{age}y</span>}
              <span className="capitalize">{patient.gender?.toLowerCase()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Allergies */}
      {patient.allergies && (
        <Section title="Allergies">
          <div className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 mt-1">
            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
            <span>{patient.allergies}</span>
          </div>
        </Section>
      )}

      {/* Surgical Case Overview */}
      <Section title="Case Overview">
        <div className="space-y-2 mt-2">
          <Row icon={<Calendar className="h-3.5 w-3.5" />} label="Date">
            {surgicalCase.procedure_date ? format(new Date(surgicalCase.procedure_date), 'MMM d, yyyy') : 'Unscheduled'}
          </Row>
          <Row label="Type">{surgicalCase.procedure_category || 'N/A'}</Row>
          {surgicalCase.diagnosis && (
            <div className="text-xs mt-2">
              <span className="text-slate-400 block mb-1 font-medium">Diagnosis</span>
              <p className="text-slate-700 leading-relaxed">{surgicalCase.diagnosis}</p>
            </div>
          )}
          {surgicalCase.case_procedures?.length > 0 && (
            <div className="text-xs mt-3">
              <span className="text-slate-400 block mb-1 font-medium">Procedures</span>
              <ul className="space-y-1">
                {surgicalCase.case_procedures.map((cp: any, index: number) => (
                  <li key={index} className="text-slate-700 flex gap-2">
                    <span className="text-slate-300">-</span> 
                    {cp.procedure?.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>

      {/* Contact */}
      <Section title="Contact">
        <div className="space-y-1.5 mt-2">
          {patient.phone && <Row label="Phone">{patient.phone}</Row>}
          {patient.email && <Row label="Email">{patient.email}</Row>}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 border-b border-slate-100">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, children, icon }: { label?: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      {icon && <span className="text-slate-400 mt-0.5 shrink-0">{icon}</span>}
      {label && !icon && <span className="text-slate-400 w-12 shrink-0 font-medium">{label}</span>}
      <span className="text-slate-700 break-words flex-1 font-medium">{children}</span>
    </div>
  );
}
