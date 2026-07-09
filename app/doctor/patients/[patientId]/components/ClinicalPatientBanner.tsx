'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { calculateAge } from '@/lib/utils';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import {
  ShieldAlert,
  ShieldCheck,
  Phone,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
  Droplets,
  CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ClinicalPatientBannerProps {
  patient: PatientResponseDto;
}

// ── Small label + value pair ─────────────────────────────────────────────────
function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <span className="block text-[9px] uppercase font-bold text-[#2c2e4b]/40 tracking-wider">
        {label}
      </span>
      <span className={`text-[11px] font-semibold text-[#2c2e4b] ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

export function ClinicalPatientBanner({ patient }: ClinicalPatientBannerProps) {
  const [showAdmin, setShowAdmin] = useState(false);

  const patientName = `${patient.lastName.toUpperCase()}, ${patient.firstName}`;
  const dobFormatted = patient.dateOfBirth
    ? format(new Date(patient.dateOfBirth), 'MMM d, yyyy')
    : '—';
  const ageDisplay = patient.dateOfBirth
    ? `${calculateAge(patient.dateOfBirth)} yrs`
    : patient.age
      ? `${patient.age} yrs`
      : '—';

  return (
    <div className="bg-white border border-[#e7d6bf] rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-300">

      {/* ── Top band: name + allergy alert ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-stretch">

        {/* Name block */}
        <div className="flex-1 px-5 py-4 border-b border-[#e7d6bf] md:border-b-0 md:border-r md:border-[#e7d6bf]">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-sm font-bold text-[#2c2e4b] tracking-tight">
              {patientName}
            </h2>
            <span className="px-2 py-0.5 text-[9px] font-semibold bg-[#e7d6bf]/40 text-[#2c2e4b]/70 uppercase tracking-wider font-mono border border-[#e7d6bf] rounded">
              Chart #{patient.fileNumber}
            </span>
          </div>
          <p className="text-[9px] text-[#2c2e4b]/40 font-mono mt-1 uppercase tracking-wider">
            Electronic Medical Record
          </p>
        </div>

        {/* Allergy alert */}
        <div className="md:w-80 shrink-0 flex items-center">
          {patient.allergies ? (
            <div className="w-full flex items-start gap-2.5 bg-rose-50 border-l-4 border-rose-500 px-4 py-3 md:rounded-none">
              <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-[10px] text-rose-900">
                <span className="font-bold uppercase tracking-wider">Allergies Alert: </span>
                <span className="font-semibold">{patient.allergies}</span>
              </div>
            </div>
          ) : (
            <div className="w-full flex items-center gap-2.5 bg-emerald-50 border-l-4 border-emerald-500 px-4 py-3">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-[10px] font-semibold text-emerald-900">
                No known allergies
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Clinical demographics strip ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-0 border-t border-[#e7d6bf] divide-x divide-[#e7d6bf]">
        <div className="px-4 py-3">
          <Field label="Date of Birth" value={<span className="font-mono">{dobFormatted}</span>} />
        </div>
        <div className="px-4 py-3">
          <Field label="Age / Sex" value={`${ageDisplay} · ${patient.gender || '—'}`} />
        </div>
        <div className="px-4 py-3 hidden sm:block">
          <div className="space-y-0.5">
            <span className="block text-[9px] uppercase font-bold text-[#2c2e4b]/40 tracking-wider flex items-center gap-1">
              <Droplets className="h-2.5 w-2.5" /> Blood Group
            </span>
            <span className={`text-[11px] font-bold font-mono ${
              patient.bloodGroup ? 'text-[#caa26a]' : 'text-[#2c2e4b]/40 italic font-sans font-normal'
            }`}>
              {patient.bloodGroup || 'Not documented'}
            </span>
          </div>
        </div>
        <div className="px-4 py-3 hidden sm:block">
          <div className="space-y-0.5">
            <span className="block text-[9px] uppercase font-bold text-[#2c2e4b]/40 tracking-wider flex items-center gap-1">
              <CalendarDays className="h-2.5 w-2.5" /> Last Visit
            </span>
            <span className="text-[11px] font-semibold text-[#2c2e4b]">
              {patient.lastVisitDate
                ? format(new Date(patient.lastVisitDate), 'MMM d, yyyy')
                : 'No visits'}
            </span>
          </div>
        </div>
        {/* Toggle for admin details */}
        <div className="px-4 py-3 flex items-center justify-end sm:justify-center col-span-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdmin(!showAdmin)}
            className="h-7 px-2 text-[10px] font-medium text-[#2c2e4b]/50 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/30 rounded-lg gap-1"
          >
            {showAdmin ? (
              <>Hide <ChevronUp className="h-3 w-3" /></>
            ) : (
              <>Details <ChevronDown className="h-3 w-3" /></>
            )}
          </Button>
        </div>
      </div>

      {/* ── Collapsible admin details ────────────────────────────────────── */}
      {showAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-[#e7d6bf] divide-y md:divide-y-0 md:divide-x divide-[#e7d6bf] bg-[#e7d6bf]/10 animate-in slide-in-from-top-1 duration-200">
          {/* Contact */}
          <div className="px-5 py-4 space-y-3">
            <h3 className="text-[9px] uppercase font-bold text-[#2c2e4b]/40 tracking-wider flex items-center gap-1">
              <Phone className="h-2.5 w-2.5" /> Contact Info
            </h3>
            <div className="text-[11px] space-y-1.5 text-[#2c2e4b]/70">
              <p><span className="font-semibold text-[#2c2e4b]">Phone:</span> {patient.phone || '—'}</p>
              <p><span className="font-semibold text-[#2c2e4b]">Email:</span> {patient.email || '—'}</p>
              <p className="truncate"><span className="font-semibold text-[#2c2e4b]">Address:</span> {patient.address || '—'}</p>
            </div>
          </div>

          {/* Emergency contact */}
          <div className="px-5 py-4 space-y-3">
            <h3 className="text-[9px] uppercase font-bold text-[#2c2e4b]/40 tracking-wider flex items-center gap-1">
              <User className="h-2.5 w-2.5" /> Emergency Contact
            </h3>
            <div className="text-[11px] space-y-1.5 text-[#2c2e4b]/70">
              {patient.emergencyContactName ? (
                <>
                  <p className="font-semibold text-[#2c2e4b]">{patient.emergencyContactName}</p>
                  <p><span className="font-semibold text-[#2c2e4b]">Relationship:</span> {patient.relation || '—'}</p>
                  <p><span className="font-semibold text-[#2c2e4b]">Phone:</span> {patient.emergencyContactNumber || '—'}</p>
                </>
              ) : (
                <p className="text-[#2c2e4b]/40 italic">None documented</p>
              )}
            </div>
          </div>

          {/* Insurance */}
          <div className="px-5 py-4 space-y-3">
            <h3 className="text-[9px] uppercase font-bold text-[#2c2e4b]/40 tracking-wider flex items-center gap-1">
              <FileText className="h-2.5 w-2.5" /> Insurance &amp; Admin
            </h3>
            <div className="text-[11px] space-y-1.5 text-[#2c2e4b]/70">
              <p><span className="font-semibold text-[#2c2e4b]">Provider:</span> {patient.insuranceProvider || '—'}</p>
              <p><span className="font-semibold text-[#2c2e4b]">Policy No:</span> {patient.insuranceNumber || '—'}</p>
              <p><span className="font-semibold text-[#2c2e4b]">Marital Status:</span> {patient.maritalStatus || '—'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
