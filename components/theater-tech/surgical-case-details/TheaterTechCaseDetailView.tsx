/**
 * Theater Tech — Surgical Case Detail View
 *
 * Document-style layout meant to feel like a clean, printable case sheet:
 * - Clear sectioning (Patient, Case, Team, Booking, Items)
 * - Consistent label/value typography
 * - Works both on-screen and when printing (via print: utilities)
 */

import Link from 'next/link';
import { format } from 'date-fns';
import type { ReactNode } from 'react';
import {
  ArrowLeft,
  Calendar,
  FileText,
  Receipt,
  Pencil,
  Activity,
  Stethoscope,
  User,
  Users,
  Shield,
  Syringe,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TheaterTechCasePrintDocument } from '@/components/theater-tech/surgical-case-details/print/TheaterTechCasePrintDocument';

type StatusCfg = { label: string; className: string };

const STATUS_LABELS: Record<string, StatusCfg> = {
  DRAFT: { label: 'Draft', className: 'border border-slate-200 bg-slate-100 text-slate-600' },
  PLANNING: { label: 'Planning', className: 'border border-amber-200 bg-amber-50 text-amber-700' },
  READY_FOR_WARD_PREP: { label: 'Ward Prep', className: 'border border-emerald-200 bg-emerald-50 text-emerald-700' },
  IN_WARD_PREP: { label: 'In Ward Prep', className: 'border border-amber-200 bg-amber-50 text-amber-700' },
  READY_FOR_THEATER_BOOKING: { label: 'Ready to Book', className: 'border border-slate-300 bg-slate-100 text-slate-700' },
  SCHEDULED: { label: 'Scheduled', className: 'border border-slate-300 bg-slate-100 text-slate-700' },
  IN_PREP: { label: 'In Prep', className: 'border border-amber-200 bg-amber-50 text-amber-700' },
  IN_THEATER: { label: 'In Theater', className: 'border border-red-200 bg-red-50 text-red-700' },
  RECOVERY: { label: 'Recovery', className: 'border border-emerald-200 bg-emerald-50 text-emerald-700' },
  COMPLETED: { label: 'Completed', className: 'border border-emerald-200 bg-emerald-50 text-emerald-700' },
  CANCELLED: { label: 'Cancelled', className: 'border border-red-200 bg-red-50 text-red-700' },
};

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="border-slate-200 shadow-none">
      <CardHeader className="px-6 pt-5 pb-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">{children}</CardContent>
    </Card>
  );
}

function KV({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function displayEnum(raw?: string | null) {
  if (!raw) return '—';
  return raw.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function getInviteName(invites: Array<any>, role: string) {
  const inv = invites.find((i) => i.invited_role === role);
  const u = inv?.invited_user;
  const name = `${u?.first_name || ''} ${u?.last_name || ''}`.trim();
  return name || '—';
}

export function TheaterTechCaseDetailView(props: {
  caseId: string;
  surgicalCase: any;
  surgeons: Array<{ id?: string; name: string; specialization?: string | null }>;
  assistantSurgeons: Array<{ id?: string; name: string; specialization?: string | null }>;
  procedureNames: string[];
  variant?: 'screen' | 'print';
  vitals?: Array<{
    id: number;
    body_temperature?: number | null;
    systolic?: number | null;
    diastolic?: number | null;
    heart_rate?: string | null;
    respiratory_rate?: number | null;
    oxygen_saturation?: number | null;
    weight?: number | null;
    height?: number | null;
    recorded_by_name?: string;
    recorded_at: string;
  }>;
  onRecordVitals?: () => void;
}) {
  const {
    caseId,
    surgicalCase,
    surgeons,
    assistantSurgeons,
    procedureNames,
    variant = 'screen',
    vitals = [],
    onRecordVitals,
  } = props;

  if (variant === 'print') {
    return (
      <TheaterTechCasePrintDocument
        caseId={caseId}
        surgicalCase={surgicalCase}
        surgeons={surgeons}
        assistantSurgeons={assistantSurgeons}
        procedureNames={procedureNames}
      />
    );
  }

  const statusCfg = STATUS_LABELS[surgicalCase.status] ?? {
    label: surgicalCase.status,
    className: 'border border-slate-200 bg-slate-100 text-slate-600',
  };

  const isActive =
    surgicalCase.status !== 'DRAFT' &&
    surgicalCase.status !== 'PLANNING' &&
    surgicalCase.status !== 'COMPLETED' &&
    surgicalCase.status !== 'CANCELLED';
  const isEditable = surgicalCase.status !== 'COMPLETED' && surgicalCase.status !== 'CANCELLED';

  const invites = surgicalCase.staff_invites ?? [];

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-5 print:py-0 print:px-0">
        {/* Top bar */}
        {variant === 'screen' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="sm" asChild className="h-9 w-9 p-0 shrink-0">
                <Link href="/theater-tech/surgical-cases">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-semibold text-slate-900">
                    {surgicalCase.patient.first_name} {surgicalCase.patient.last_name}
                  </h1>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusCfg.className}`}>
                    {statusCfg.label}
                  </span>
                </div>
                {surgicalCase.patient.file_number && (
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{surgicalCase.patient.file_number}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
              <Button size="sm" variant="outline" asChild className="h-8 gap-1.5">
                <Link href={`/theater-tech/surgical-cases/${caseId}`}>
                  <Receipt className="h-3.5 w-3.5" />
                  <span>View Billing</span>
                </Link>
              </Button>
              {isEditable && (
                <Button size="sm" asChild className="h-8 gap-1.5">
                  <Link href={`/theater-tech/surgical-cases/${caseId}/edit`}>
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit Plan</span>
                  </Link>
                </Button>
              )}
              {isActive && (
                <Button size="sm" asChild className="h-8 gap-1.5" variant="outline">
                  <Link href={`/theater-tech/dashboard/${caseId}`}>
                    <Activity className="h-3.5 w-3.5" />
                    <span>Dayboard</span>
                  </Link>
                </Button>
              )}
              {variant === 'screen' && onRecordVitals && (
                <Button size="sm" onClick={onRecordVitals} className="h-8 gap-1.5 bg-red-600 hover:bg-red-700 text-white">
                  <Activity className="h-3.5 w-3.5" />
                  <span>Record Vitals</span>
                </Button>
              )}
              <Button size="sm" variant="outline" asChild className="h-8 gap-1.5">
                <Link href={`/theater-tech/surgical-cases/${caseId}/print`}>
                  <FileText className="h-3.5 w-3.5" />
                  <span>Print Summary</span>
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Document sheet */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm print:shadow-none print:border-none print:rounded-none overflow-hidden">
          {/* Sheet header */}
          <div className="px-6 py-6 border-b border-slate-200">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">
                  Theater Case Document
                </p>
                <h2 className="text-xl font-semibold text-slate-900 mt-1">
                  Surgical Case Summary
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Case ID: <span className="font-mono text-slate-700">{caseId}</span>
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full ${statusCfg.className}`}>
                  {statusCfg.label}
                </span>
                <p className="text-xs text-slate-500 mt-2">
                  Generated: {format(new Date(), 'dd MMM yyyy, HH:mm')}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Patient + Case Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Section title="Patient" icon={<User className="h-3.5 w-3.5" />}>
                <div className="grid grid-cols-2 gap-4">
                  <KV label="Name" value={`${surgicalCase.patient.first_name} ${surgicalCase.patient.last_name}`.trim()} />
                  <KV label="File No." value={<span className="font-mono">{surgicalCase.patient.file_number ?? '—'}</span>} />
                  <KV
                    label="Date of Birth"
                    value={
                      surgicalCase.patient.date_of_birth
                        ? format(new Date(surgicalCase.patient.date_of_birth), 'dd MMM yyyy')
                        : '—'
                    }
                  />
                  <KV label="Gender" value={surgicalCase.patient.gender ?? '—'} />
                </div>
              </Section>

              <Section title="Case Overview" icon={<Shield className="h-3.5 w-3.5" />}>
                <div className="grid grid-cols-2 gap-4">
                  <KV label="Urgency" value={displayEnum(surgicalCase.urgency)} />
                  <KV
                    label="Procedure Date"
                    value={
                      surgicalCase.procedure_date
                        ? format(new Date(surgicalCase.procedure_date), 'dd MMM yyyy')
                        : 'Not scheduled'
                    }
                  />
                  <KV label="Category" value={displayEnum(surgicalCase.procedure_category)} />
                  <KV label="Case Type" value={displayEnum(surgicalCase.primary_or_revision)} />
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Procedures</p>
                    {procedureNames.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {procedureNames.map((name: string, i: number) => (
                          <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600 mt-1">—</p>
                    )}
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Diagnosis</p>
                    <p className="text-sm text-slate-700 mt-1 leading-snug">{surgicalCase.diagnosis ?? '—'}</p>
                  </div>
                </div>
              </Section>
            </div>

            {/* Team */}
            <Section title="Operative Team" icon={<Users className="h-3.5 w-3.5" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <KV
                    label="Primary Surgeon"
                    value={
                      surgeons.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-slate-400" />
                          <span>{surgeons[0].name}</span>
                        </div>
                      ) : (
                        '—'
                      )
                    }
                  />
                  <KV
                    label="Assistant Surgeons"
                    value={
                      assistantSurgeons.length > 0
                        ? assistantSurgeons.map((s) => s.name).join(', ')
                        : '—'
                    }
                  />
                  <KV
                    label="Anaesthesiologist"
                    value={
                      getInviteName(invites, 'ANESTHESIOLOGIST') !== '—'
                        ? getInviteName(invites, 'ANESTHESIOLOGIST')
                        : getInviteName(invites, 'ANESTHETIST_NURSE')
                    }
                  />
                </div>
                <div className="space-y-3">
                  <KV label="Scrub Nurse" value={getInviteName(invites, 'SCRUB_NURSE')} />
                  <KV label="Circulating Nurse" value={getInviteName(invites, 'CIRCULATING_NURSE')} />
                  <KV
                    label="Other Assigned Members"
                    value={
                      surgicalCase.team_members?.length
                        ? surgicalCase.team_members.map((m: any) => `${m.name} (${displayEnum(m.role)})`).join(', ')
                        : '—'
                    }
                  />
                </div>
              </div>
            </Section>

            {/* Operative details */}
            <Section title="Operative Details" icon={<Syringe className="h-3.5 w-3.5" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KV label="Anaesthesia" value={displayEnum(surgicalCase.anaesthesia_type)} />
                <KV label="Skin-to-Skin" value={surgicalCase.skin_to_skin_minutes ? `${surgicalCase.skin_to_skin_minutes} min` : '—'} />
                <KV label="Total Theater" value={surgicalCase.total_theatre_minutes ? `${surgicalCase.total_theatre_minutes} min` : '—'} />
                <KV label="Admission" value={displayEnum(surgicalCase.admission_type)} />
              </div>
            </Section>

            {/* Vitals */}
            <Section title="Pre-Op Vitals" icon={<Activity className="h-3.5 w-3.5" />}>
              {vitals.length === 0 ? (
                <p className="text-sm text-slate-500">No vitals recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 text-xs font-semibold text-slate-500">Recorded</th>
                        <th className="text-left py-2 text-xs font-semibold text-slate-500">Temp</th>
                        <th className="text-left py-2 text-xs font-semibold text-slate-500">BP</th>
                        <th className="text-left py-2 text-xs font-semibold text-slate-500">Pulse</th>
                        <th className="text-left py-2 text-xs font-semibold text-slate-500">SpO2</th>
                        <th className="text-left py-2 text-xs font-semibold text-slate-500">Weight</th>
                        <th className="text-left py-2 text-xs font-semibold text-slate-500">Height</th>
                        <th className="text-left py-2 text-xs font-semibold text-slate-500">By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {vitals.map((v) => (
                        <tr key={v.id}>
                          <td className="py-3 text-slate-600 whitespace-nowrap">
                            {format(new Date(v.recorded_at), 'dd MMM yyyy HH:mm')}
                          </td>
                          <td className="py-3 text-slate-900 font-medium">
                            {v.body_temperature != null ? `${v.body_temperature}°C` : '—'}
                          </td>
                          <td className="py-3 text-slate-700">
                            {v.systolic != null && v.diastolic != null ? `${v.systolic}/${v.diastolic}` : '—'}
                          </td>
                          <td className="py-3 text-slate-700">
                            {v.heart_rate ?? '—'}
                          </td>
                          <td className="py-3 text-slate-700">
                            {v.oxygen_saturation != null ? `${v.oxygen_saturation}%` : '—'}
                          </td>
                          <td className="py-3 text-slate-700">
                            {v.weight != null ? `${v.weight} kg` : '—'}
                          </td>
                          <td className="py-3 text-slate-700">
                            {v.height != null ? `${v.height} cm` : '—'}
                          </td>
                          <td className="py-3 text-slate-500 text-xs">
                            {v.recorded_by_name || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            {/* Items */}
            <Section title="Theater Items" icon={<Package className="h-3.5 w-3.5" />}>
              {surgicalCase.case_items?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 text-xs font-semibold text-slate-500">Item</th>
                        <th className="text-left py-2 text-xs font-semibold text-slate-500 hidden sm:table-cell">Category</th>
                        <th className="text-right py-2 text-xs font-semibold text-slate-500 w-20">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {surgicalCase.case_items.map((item: any) => (
                        <tr key={item.id}>
                          <td className="py-3 font-medium text-slate-900">{item.inventory_item?.name}</td>
                          <td className="py-3 text-slate-600 hidden sm:table-cell">{item.inventory_item?.category ?? '—'}</td>
                          <td className="py-3 text-right font-medium tabular-nums">{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-600">—</p>
              )}
            </Section>

            {/* Footer meta */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500">
              <span>Created: {format(new Date(surgicalCase.created_at), 'dd MMM yyyy, HH:mm')}</span>
              <span>Last updated: {format(new Date(surgicalCase.updated_at), 'dd MMM yyyy, HH:mm')}</span>
            </div>
          </div>
        </div>

        {variant === 'screen' && (
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            <span>Use “Edit Plan” to adjust team and case details; changes reflect on operative records and nurse intra-op prefills.</span>
          </div>
        )}
      </div>
    </div>
  );
}
