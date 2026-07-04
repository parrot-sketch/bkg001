'use client';

import { AlertTriangle } from 'lucide-react';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { cn } from '@/lib/utils';

interface VitalsData {
  bodyTemperature: number | null;
  systolic: number | null;
  diastolic: number | null;
  heartRate: string | null;
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  weight: number | null;
  height: number | null;
  recordedAt: string;
  recordedBy: string | null;
}

interface Props {
  patient: PatientResponseDto;
  appointment?: AppointmentResponseDto | null;
  vitals?: VitalsData | null;
  isReadOnly?: boolean;
}

export function PatientInfoSidebar({ patient, appointment, vitals = null }: Props) {
   const age = patient.dateOfBirth
      ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 86400000))
      : null;

   return (
      <div className="h-full flex flex-col">
        {/* Patient Identity - Fixed height header */}
        <div className="px-4 py-4 bg-[#e7d6bf]/30 border-b border-[#e7d6bf] shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#caa26a] flex items-center justify-center text-sm font-bold text-white shrink-0">
              {patient.firstName?.[0]}{patient.lastName?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#2c2e4b] truncate">
                {patient.firstName} {patient.lastName}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-[#2c2e4b]/60 mt-0.5">
                {patient.fileNumber && <span className="font-mono">{patient.fileNumber}</span>}
                {age !== null && <span className="text-[#e7d6bf]">•</span>}
                {age !== null && <span>{age} yrs</span>}
                {patient.gender && <span className="text-[#e7d6bf]">•</span>}
                <span className="capitalize">{patient.gender?.toLowerCase()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar-light">
          <div className="py-2 space-y-1">
            {/* Vitals */}
            {vitals && (
              <Section title="Vitals">
                <VitalsGrid vitals={vitals} />
              </Section>
            )}

            {/* Allergies */}
            {patient.allergies && (
              <Section title="Allergies">
                <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                  <span className="leading-relaxed">{patient.allergies}</span>
                </div>
              </Section>
            )}

            {/* Conditions */}
            {patient.medicalConditions && (
              <Section title="Conditions">
                <p className="text-xs text-slate-600 leading-relaxed">{patient.medicalConditions}</p>
              </Section>
            )}

            {/* Appointment Note */}
            {appointment?.note && (
              <Section title="Visit Note">
                <p className="text-xs text-slate-600 leading-relaxed">{appointment.note}</p>
              </Section>
            )}

            {/* Contact */}
            <Section title="Contact">
              <div className="space-y-1.5">
                {patient.phone && <Row label="Phone" value={patient.phone} />}
                {patient.email && <Row label="Email" value={patient.email} />}
                {patient.address && <Row label="Address" value={patient.address} />}
              </div>
            </Section>

            {/* Emergency */}
            {patient.emergencyContactName && (
              <Section title="Emergency Contact">
                <div className="space-y-1.5">
                  <Row label="Name" value={patient.emergencyContactName} />
                  {patient.emergencyContactNumber && <Row label="Phone" value={patient.emergencyContactNumber} />}
                  {patient.relation && <Row label="Relation" value={patient.relation} />}
                </div>
              </Section>
            )}
          </div>
        </div>
      </div>
   );
 }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 bg-white border-b border-[#e7d6bf]">
      <p className="text-[10px] font-semibold text-[#caa26a] uppercase tracking-wider mb-2">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-[#2c2e4b]/50 w-12 shrink-0">{label}</span>
      <span className="text-[#2c2e4b] break-all">{value}</span>
    </div>
  );
}

function VitalsGrid({ vitals }: { vitals: VitalsData }) {
  const items = [
    { label: 'Temp', value: vitals.bodyTemperature != null ? `${vitals.bodyTemperature}°C` : null, warn: vitals.bodyTemperature != null && (vitals.bodyTemperature < 36 || vitals.bodyTemperature > 38) },
    { label: 'BP', value: vitals.systolic != null && vitals.diastolic != null ? `${vitals.systolic}/${vitals.diastolic}` : null, warn: vitals.systolic != null && (vitals.systolic < 90 || vitals.systolic > 140) },
    { label: 'HR', value: vitals.heartRate ? `${vitals.heartRate} bpm` : null, warn: false },
    { label: 'RR', value: vitals.respiratoryRate != null ? `${vitals.respiratoryRate}/min` : null, warn: vitals.respiratoryRate != null && (vitals.respiratoryRate < 12 || vitals.respiratoryRate > 20) },
    { label: 'SpO₂', value: vitals.oxygenSaturation != null ? `${vitals.oxygenSaturation}%` : null, warn: vitals.oxygenSaturation != null && vitals.oxygenSaturation < 95 },
    { label: 'Wt', value: vitals.weight != null ? `${vitals.weight}kg` : null, warn: false },
    { label: 'Ht', value: vitals.height != null ? `${vitals.height}cm` : null, warn: false },
  ].filter(i => i.value != null);

  if (items.length === 0) return <p className="text-[11px] text-[#2c2e4b]/40 italic">No vitals recorded</p>;

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-2 text-[11px]">
          <span className="text-[#2c2e4b]/50 w-7 shrink-0">{item.label}</span>
          <span className={cn('font-medium', item.warn ? 'text-[#caa26a]' : 'text-[#2c2e4b]')}>
            {item.value}
            {item.warn && <AlertTriangle className="inline h-3 w-3 ml-0.5 text-[#caa26a]" />}
          </span>
        </div>
      ))}
    </div>
  );
}
