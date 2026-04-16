/**
 * Theater Tech Surgical Case Detail Page
 *
 * Route: /theater-tech/surgical-cases/[caseId]
 *
 * Premium, fully responsive case detail view.
 * - Mobile: stacked cards with clear labels
 * - Desktop: tables for team, items, and operative details
 */

import { getCurrentUser } from '@/lib/auth/server-auth';
import db from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  Stethoscope,
  Clock,
  Receipt,
  Pencil,
  Activity,
  Package,
  Syringe,
  Timer,
  BedDouble,
  User,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TheaterBookingSectionWrapper } from '@/components/theater-tech/booking/TheaterBookingSectionWrapper';

interface PageProps {
  params: Promise<{ caseId: string }>;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT:                      { label: 'Draft',          color: 'border border-slate-200 bg-slate-100 text-slate-600 ring-slate-200'      },
  PLANNING:                   { label: 'Planning',       color: 'border border-amber-200 bg-amber-50 text-amber-700 ring-amber-200'      },
  READY_FOR_WARD_PREP:        { label: 'Ward Prep',      color: 'border border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-200' },
  IN_WARD_PREP:               { label: 'In Ward Prep',   color: 'border border-amber-200 bg-amber-50 text-amber-700 ring-amber-200'      },
  READY_FOR_THEATER_BOOKING:  { label: 'Ready to Book',  color: 'border border-slate-300 bg-slate-100 text-slate-700 ring-slate-300'      },
  SCHEDULED:                  { label: 'Scheduled',      color: 'border border-slate-300 bg-slate-100 text-slate-700 ring-slate-300'      },
  IN_PREP:                    { label: 'In Prep',        color: 'border border-amber-200 bg-amber-50 text-amber-700 ring-amber-200'      },
  IN_THEATER:                 { label: 'In Theater',     color: 'border border-red-200 bg-red-50 text-red-700 ring-red-200'              },
  RECOVERY:                   { label: 'Recovery',       color: 'border border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-200' },
  COMPLETED:                  { label: 'Completed',      color: 'border border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-200' },
  CANCELLED:                  { label: 'Cancelled',      color: 'border border-red-200 bg-red-50 text-red-700 ring-red-200'              },
};

export default async function TheaterTechCaseDetailPage({ params }: PageProps) {
  const { caseId } = await params;
  const user = await getCurrentUser();

  if (!user || (user.role !== 'THEATER_TECHNICIAN' && user.role !== 'ADMIN')) {
    redirect('/login');
  }

  const surgicalCase = await db.surgicalCase.findUnique({
    where: { id: caseId },
    include: {
      patient: true,
      primary_surgeon: { select: { id: true, name: true, specialization: true } },
      case_items: { include: { inventory_item: true } },
      case_procedures: { include: { procedure: true } },
      team_members: true,
      theater_booking: { include: { theater: true } },
    },
  });

  if (!surgicalCase) notFound();

  // Resolve all surgeons from surgeon_ids JSON
  let surgeons: { name: string; specialization: string | null }[] = [];
  if (surgicalCase.surgeon_ids) {
    try {
      const ids = JSON.parse(surgicalCase.surgeon_ids) as string[];
      const docs = await db.doctor.findMany({
        where: { id: { in: ids } },
        select: { name: true, specialization: true },
      });
      surgeons = docs;
    } catch {
      if (surgicalCase.primary_surgeon) {
        surgeons = [{
          name: surgicalCase.primary_surgeon.name,
          specialization: surgicalCase.primary_surgeon.specialization ?? null,
        }];
      }
    }
  } else if (surgicalCase.primary_surgeon) {
    surgeons = [{
      name: surgicalCase.primary_surgeon.name,
      specialization: surgicalCase.primary_surgeon.specialization ?? null,
    }];
  }

  const statusCfg = STATUS_LABELS[surgicalCase.status] ?? {
    label: surgicalCase.status,
    color: 'bg-slate-100 text-slate-600 ring-slate-200',
  };

  const isPlanning = surgicalCase.status === 'DRAFT' || surgicalCase.status === 'PLANNING';
  const isActive =
    surgicalCase.status !== 'DRAFT' &&
    surgicalCase.status !== 'PLANNING' &&
    surgicalCase.status !== 'COMPLETED' &&
    surgicalCase.status !== 'CANCELLED';
  const isEditable =
    surgicalCase.status !== 'COMPLETED' &&
    surgicalCase.status !== 'CANCELLED';

  const procedureNames = surgicalCase.case_procedures.map((cp) => cp.procedure.name);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-5">

        {/* ── Top bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${statusCfg.color}`}
                >
                  {statusCfg.label}
                </span>
              </div>
              {surgicalCase.patient.file_number && (
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {surgicalCase.patient.file_number}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
            <Button size="sm" variant="outline" asChild className="h-8 gap-1.5">
              <Link href={`/theater-tech/surgical-cases/${caseId}/charges`}>
                <Receipt className="h-3.5 w-3.5" />
                <span>Charges</span>
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
              <Button size="sm" asChild className="h-8 gap-1.5">
                <Link href={`/theater-tech/dashboard/${caseId}`}>
                  <Activity className="h-3.5 w-3.5" />
                  <span>Dayboard</span>
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* ── Patient & Procedure - side by side on desktop ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Patient */}
          <Card className="border-slate-200">
            <CardHeader className="px-5 pt-4 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Patient
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-50">
                  <DetailsRow icon={<User className="h-3.5 w-3.5 text-slate-400" />} label="Name">
                    {surgicalCase.patient.first_name} {surgicalCase.patient.last_name}
                  </DetailsRow>
                  <DetailsRow icon={<FileText className="h-3.5 w-3.5 text-slate-400" />} label="File No.">
                    <span className="font-mono">{surgicalCase.patient.file_number ?? '—'}</span>
                  </DetailsRow>
                  <DetailsRow icon={<Calendar className="h-3.5 w-3.5 text-slate-400" />} label="Date of Birth">
                    {surgicalCase.patient.date_of_birth
                      ? format(new Date(surgicalCase.patient.date_of_birth), 'MMM d, yyyy')
                      : '—'}
                  </DetailsRow>
                  <DetailsRow label="Gender">
                    {surgicalCase.patient.gender ?? '—'}
                  </DetailsRow>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Procedure */}
          <Card className="border-slate-200">
            <CardHeader className="px-5 pt-4 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Procedure
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-3">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-50">
                  <DetailsRow icon={<Calendar className="h-3.5 w-3.5 text-slate-400" />} label="Date">
                    {surgicalCase.procedure_date
                      ? format(new Date(surgicalCase.procedure_date), 'MMMM d, yyyy')
                      : 'Not scheduled'}
                  </DetailsRow>
                  <DetailsRow label="Category">
                    {surgicalCase.procedure_category ?? '—'}
                  </DetailsRow>
                  <DetailsRow label="Case Type">
                    {surgicalCase.primary_or_revision === 'PRIMARY'
                      ? 'Primary'
                      : surgicalCase.primary_or_revision === 'REVISION'
                      ? 'Revision'
                      : '—'}
                  </DetailsRow>
                </tbody>
              </table>

              {/* Procedures */}
              {procedureNames.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-1.5">Procedures</p>
                  <div className="flex flex-wrap gap-1.5">
                    {procedureNames.map((name, i) => (
                      <span
                        key={i}
                        className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-700"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Diagnosis */}
              {surgicalCase.diagnosis && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Diagnosis</p>
                  <p className="text-sm text-slate-700 leading-snug">{surgicalCase.diagnosis}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Theater Booking ── */}
        <TheaterBookingSectionWrapper
          caseId={caseId}
          caseStatus={surgicalCase.status}
          totalTheatreMinutes={surgicalCase.total_theatre_minutes}
          patientName={`${surgicalCase.patient.first_name} ${surgicalCase.patient.last_name}`}
          procedureName={procedureNames.join(', ') || 'Surgery'}
          theaterBooking={surgicalCase.theater_booking}
        />

        {/* ── Operative Details ── */}
        {(surgicalCase.anaesthesia_type ||
          surgicalCase.skin_to_skin_minutes ||
          surgicalCase.total_theatre_minutes ||
          surgicalCase.admission_type) && (
          <Card className="border-slate-200">
            <CardHeader className="px-5 pt-4 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Operative Details
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 w-1/2">Field</th>
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {surgicalCase.anaesthesia_type && (
                      <tr>
                        <td className="px-5 py-3 text-slate-500 text-xs flex items-center gap-1.5">
                          <Syringe className="h-3.5 w-3.5" /> Anaesthesia
                        </td>
                        <td className="px-5 py-3 font-medium text-slate-800">
                          {surgicalCase.anaesthesia_type === 'GENERAL'
                            ? 'General'
                            : surgicalCase.anaesthesia_type === 'LOCAL'
                            ? 'Local'
                            : 'Regional'}
                        </td>
                      </tr>
                    )}
                    {surgicalCase.skin_to_skin_minutes && (
                      <tr>
                        <td className="px-5 py-3 text-slate-500 text-xs flex items-center gap-1.5">
                          <Timer className="h-3.5 w-3.5" /> Skin-to-Skin
                        </td>
                        <td className="px-5 py-3 font-medium text-slate-800 tabular-nums">
                          {surgicalCase.skin_to_skin_minutes} min
                        </td>
                      </tr>
                    )}
                    {surgicalCase.total_theatre_minutes && (
                      <tr>
                        <td className="px-5 py-3 text-slate-500 text-xs flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" /> Total Theater
                        </td>
                        <td className="px-5 py-3 font-medium text-slate-800 tabular-nums">
                          {surgicalCase.total_theatre_minutes} min
                        </td>
                      </tr>
                    )}
                    {surgicalCase.admission_type && (
                      <tr>
                        <td className="px-5 py-3 text-slate-500 text-xs flex items-center gap-1.5">
                          <BedDouble className="h-3.5 w-3.5" /> Admission
                        </td>
                        <td className="px-5 py-3 font-medium text-slate-800">
                          {surgicalCase.admission_type === 'DAYCASE' ? 'Daycase' : 'Overnight'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Surgical Team ── */}
        <Card className="border-slate-200">
          <CardHeader className="px-5 pt-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Surgical Team
            </CardTitle>
            {(surgeons.length + surgicalCase.team_members.length) > 0 && (
              <span className="text-xs text-slate-400">
                {surgeons.length + surgicalCase.team_members.length} members
              </span>
            )}
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {surgeons.length === 0 && surgicalCase.team_members.length === 0 ? (
              <p className="px-5 pb-4 text-sm text-slate-400">No team assigned yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500">Name</th>
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500">Specialization / Role</th>
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 w-24">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {surgeons.map((s, i) => (
                      <tr key={`surgeon-${i}`} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3 font-medium text-slate-800">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {s.name}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-500">{s.specialization ?? '—'}</td>
                        <td className="px-5 py-3">
                          <span className="text-[10px] font-medium uppercase tracking-wide bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                            Surgeon
                          </span>
                        </td>
                      </tr>
                    ))}
                    {surgicalCase.team_members.map((m) => (
                      <tr key={`member-${m.id}`} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3 font-medium text-slate-800">{m.name}</td>
                        <td className="px-5 py-3 text-slate-500">
                          {m.role.replace(/_/g, ' ')}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded ${
                              m.is_external
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {m.is_external ? 'External' : 'Internal'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Theater Items ── */}
        {surgicalCase.case_items.length > 0 && (
          <Card className="border-slate-200">
            <CardHeader className="px-5 pt-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Theater Items
              </CardTitle>
              <span className="text-xs text-slate-400">{surgicalCase.case_items.length} items</span>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500">Item</th>
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 hidden sm:table-cell">Category</th>
                      <th className="text-right px-5 py-2.5 text-xs font-medium text-slate-500 w-20">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {surgicalCase.case_items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <Package className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="font-medium text-slate-800">{item.inventory_item.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-500 hidden sm:table-cell">
                          {item.inventory_item.category ?? '—'}
                        </td>
                        <td className="px-5 py-3 text-right font-medium tabular-nums text-slate-700">
                          {item.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Footer ── */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-200">
          <span>Created {format(new Date(surgicalCase.created_at), 'MMM d, yyyy h:mm a')}</span>
          <span className="uppercase tracking-wide">{surgicalCase.urgency}</span>
        </div>

      </div>
    </div>
  );
}

// ── Reusable 2-col definition table row ─────────────────────────────────────
function DetailsRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <tr>
      <td className="py-2.5 pr-4 text-xs text-slate-400 whitespace-nowrap align-top">
        <div className="flex items-center gap-1.5">
          {icon}
          {label}
        </div>
      </td>
      <td className="py-2.5 font-medium text-slate-800 text-sm">{children}</td>
    </tr>
  );
}
