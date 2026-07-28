'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, FileText, Stethoscope } from 'lucide-react';
import { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

interface PatientRowProps {
  patient:          PatientResponseDto;
  appointmentCount?: number;
  lastVisit?:       Date;
  onNewConsultation?: (patientId: string) => void;
}

export function PatientRow({
  patient,
  appointmentCount,
  lastVisit,
  onNewConsultation,
}: PatientRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const fullName = `${patient.firstName} ${patient.lastName}`;
  const initials = `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase();

  const resolvedVisitCount = patient.visitCount ?? appointmentCount ?? 0;

  const resolvedLastVisit: Date | undefined = (() => {
    if (patient.lastVisitDate) return new Date(patient.lastVisitDate);
    if (lastVisit)             return lastVisit;
    return undefined;
  })();

  const age = patient.age ?? (
    patient.dateOfBirth
      ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / 31_557_600_000)
      : null
  );

  const hasAllergies  = !!patient.allergies?.trim();
  const hasConditions = !!patient.medicalConditions?.trim();
  const hasInsurance  = !!patient.insuranceProvider?.trim();

  const lastVisitLabel = resolvedLastVisit ? format(resolvedLastVisit, 'MMM d, yyyy') : '—';

  const flags: { label: string; cls: string }[] = [];
  if (hasAllergies)  flags.push({ label: 'Allergies',  cls: 'bg-rose-50 text-rose-700 border-rose-200'     });
  if (hasConditions) flags.push({ label: 'Conditions', cls: 'bg-amber-50 text-amber-700 border-amber-200'  });
  if (hasInsurance)  flags.push({ label: 'Insured',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' });

  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="menuitem"]')) {
      e.preventDefault();
    }
  };

  return (
    <div className="group flex items-center gap-4 px-4 py-3 hover:bg-[#e7d6bf]/10 transition-colors rounded-lg">
      {/* ── Patient identity ─────────────────────────────────────── */}
      <Link
        href={`/doctor/patients/${patient.id}`}
        className="flex-1 min-w-0 flex items-center gap-3"
        onClick={handleRowClick}
      >
        <div className="h-9 w-9 border border-[#e7d6bf] bg-[#e7d6bf]/30 flex items-center justify-center text-xs font-semibold text-[#2c2e4b] flex-shrink-0 rounded-lg">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-[#2c2e4b] truncate">{fullName}</div>
          <div className="hidden md:block text-xs text-[#2c2e4b]/60 mt-0.5">
            {[
              patient.gender ? patient.gender.toLowerCase() : null,
              age !== null   ? `${age} yrs`                 : null,
            ].filter(Boolean).join(' · ') || '—'}
          </div>
          {/* Mobile-only secondary info */}
          <div className="md:hidden mt-1 text-xs text-[#2c2e4b]/60">
            {patient.fileNumber || '—'} · {patient.phone || '—'}
          </div>
          <div className="md:hidden mt-1.5 flex flex-wrap gap-1">
            {flags.map((f) => (
              <Badge key={f.label} variant="outline" className={cn('text-[10px] font-medium', f.cls)}>
                {f.label}
              </Badge>
            ))}
            {flags.length === 0 && (
              <span className="text-[10px] text-[#2c2e4b]/40">No flags</span>
            )}
          </div>
        </div>
      </Link>

      {/* ── Desktop columns ──────────────────────────────────────── */}
      <div className="hidden md:block md:col-span-2 text-sm text-[#2c2e4b]">
        {patient.fileNumber || '—'}
      </div>
      <div className="hidden md:block md:col-span-2 text-sm text-[#2c2e4b]">
        {patient.phone || '—'}
      </div>
      <div className="hidden md:block md:col-span-2 text-sm text-[#2c2e4b]">
        {lastVisitLabel}
      </div>
      <div className="hidden md:block md:col-span-1 text-sm text-[#2c2e4b]">
        {resolvedVisitCount}
      </div>
      <div className="hidden md:flex md:col-span-1 flex-wrap gap-1">
        {flags.map((f) => (
          <Badge key={f.label} variant="outline" className={cn('text-[10px] font-medium', f.cls)}>
            {f.label}
          </Badge>
        ))}
        {flags.length === 0 && <span className="text-[10px] text-[#2c2e4b]/40">—</span>}
      </div>

      {/* ── Quick actions ───────────────────────────────────────── */}
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-[#2c2e4b]/40 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/20 rounded-lg"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-lg border-[#e7d6bf]">
            <DropdownMenuItem asChild>
              <Link href={`/doctor/patients/${patient.id}`} className="cursor-pointer">
                <FileText className="h-3.5 w-3.5 mr-2 text-[#2c2e4b]/60" />
                View Record
              </Link>
            </DropdownMenuItem>
            {onNewConsultation && (
              <DropdownMenuItem onClick={() => onNewConsultation(patient.id)} className="cursor-pointer">
                <Stethoscope className="h-3.5 w-3.5 mr-2 text-[#2c2e4b]/60" />
                New Consultation
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
