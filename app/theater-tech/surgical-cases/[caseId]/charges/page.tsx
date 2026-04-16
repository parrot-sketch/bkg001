/**
 * Theater Tech — Surgical Case Charge Sheet Page
 *
 * Route: /theater-tech/surgical-cases/[caseId]/charges
 *
 * Dedicated full-page charge sheet for a surgical case. Shows the
 * case header for context and the full billing editor below.
 */

import { getCurrentUser } from '@/lib/auth/server-auth';
import db from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TheaterTechBilling } from '@/components/theater-tech/TheaterTechBilling';

interface PageProps {
  params: Promise<{ caseId: string }>;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT:                      { label: 'Draft',          color: 'border border-slate-200 bg-slate-100 text-slate-600' },
  PLANNING:                   { label: 'Planning',       color: 'border border-amber-200 bg-amber-50 text-amber-700' },
  READY_FOR_WARD_PREP:        { label: 'Ward Prep',      color: 'border border-emerald-200 bg-emerald-50 text-emerald-700' },
  IN_WARD_PREP:               { label: 'In Ward Prep',   color: 'border border-amber-200 bg-amber-50 text-amber-700' },
  READY_FOR_THEATER_BOOKING:  { label: 'Ready to Book',  color: 'border border-slate-300 bg-slate-100 text-slate-700' },
  SCHEDULED:                  { label: 'Scheduled',      color: 'border border-slate-300 bg-slate-100 text-slate-700' },
  IN_PREP:                    { label: 'In Prep',        color: 'border border-amber-200 bg-amber-50 text-amber-700' },
  IN_THEATER:                 { label: 'In Theater',     color: 'border border-red-200 bg-red-50 text-red-700' },
  RECOVERY:                   { label: 'Recovery',       color: 'border border-emerald-200 bg-emerald-50 text-emerald-700' },
  COMPLETED:                  { label: 'Completed',      color: 'border border-emerald-200 bg-emerald-50 text-emerald-700' },
  CANCELLED:                  { label: 'Cancelled',      color: 'border border-red-200 bg-red-50 text-red-700' },
};

export default async function SurgicalCaseChargesPage({ params }: PageProps) {
  const { caseId } = await params;
  const user = await getCurrentUser();

  if (!user || (user.role !== 'THEATER_TECHNICIAN' && user.role !== 'ADMIN')) {
    redirect('/login');
  }

  const surgicalCase = await db.surgicalCase.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      status: true,
      procedure_date: true,
      procedure_category: true,
      procedure_name: true,
      urgency: true,
      patient: {
        select: {
          first_name: true,
          last_name: true,
          file_number: true,
        },
      },
      primary_surgeon: {
        select: { name: true },
      },
      case_procedures: {
        include: { procedure: { select: { name: true } } },
        take: 3,
      },
    },
  });

  if (!surgicalCase) notFound();

  const statusCfg = STATUS_LABELS[surgicalCase.status] ?? {
    label: surgicalCase.status,
    color: 'bg-slate-100 text-slate-600',
  };

  const procedureLabels = surgicalCase.case_procedures.map((cp) => cp.procedure.name);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-8 space-y-5">

        {/* ── Top bar ── */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="h-9 w-9 p-0 shrink-0">
            <Link href={`/theater-tech/surgical-cases/${caseId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-slate-900 truncate">
              Charge Sheet
            </h1>
            <p className="text-xs text-slate-400 truncate">
              {surgicalCase.patient.first_name} {surgicalCase.patient.last_name}
              {surgicalCase.patient.file_number && ` · ${surgicalCase.patient.file_number}`}
            </p>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
        </div>

        {/* ── Case context strip ── */}
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex flex-wrap gap-x-6 gap-y-2">
          {surgicalCase.procedure_date && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">Date</p>
              <p className="text-sm font-medium text-slate-700">
                {format(new Date(surgicalCase.procedure_date), 'MMM d, yyyy')}
              </p>
            </div>
          )}
          {surgicalCase.primary_surgeon && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">Surgeon</p>
              <p className="text-sm font-medium text-slate-700">{surgicalCase.primary_surgeon.name}</p>
            </div>
          )}
          {procedureLabels.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">Procedures</p>
              <p className="text-sm font-medium text-slate-700 truncate max-w-[240px]">
                {procedureLabels.join(', ')}
              </p>
            </div>
          )}
          {surgicalCase.procedure_category && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">Category</p>
              <p className="text-sm font-medium text-slate-700">{surgicalCase.procedure_category}</p>
            </div>
          )}
        </div>

        {/* ── Billing editor ── */}
        <TheaterTechBilling caseId={caseId} />

      </div>
    </div>
  );
}
