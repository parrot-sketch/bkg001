'use client';

import { use, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Edit3, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { queryKeys } from '@/lib/constants/queryKeys';
import { EditSurgicalCaseDialog } from '@/components/frontdesk/EditSurgicalCaseDialog';
import { SurgicalCaseSetupCard } from '@/components/frontdesk/SurgicalCaseSetupCard';
import { TheaterTechBillingSummary } from '@/components/theater-tech/TheaterTechBillingSummary';
import { TheaterTechBillingSheet } from '@/components/theater-tech/TheaterTechBillingSheet';
import { suggestedServicesFromCase } from '@/components/theater-tech/suggestedCaseServices';
import type { FrontdeskSurgicalCaseListItem } from '@/lib/api/frontdesk';
import { getSurgicalCaseStatusDisplay } from '@/lib/surgical-case-status-display';
import { categoryLabel } from '@/lib/clinical/procedureSuggestions';

interface CaseDetailsPageProps {
  params: Promise<{ caseId: string }>;
}

const KNOWN_LABELS: Record<string, string> = {
  PRIMARY: 'Primary',
  REVISION: 'Revision',
  DAYCASE: 'Day case',
  OVERNIGHT: 'Overnight',
};

function displayValue(value: string | null | undefined): string {
  if (!value) return '—';
  if (KNOWN_LABELS[value]) return KNOWN_LABELS[value];
  if (/^[A-Z0-9_]+$/.test(value)) {
    return value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
  return value;
}

function displayDate(value: string | null | undefined, withTime = false): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, withTime ? 'd MMM yyyy, HH:mm' : 'd MMM yyyy');
}

export default function CaseDetailsPage({ params }: CaseDetailsPageProps) {
  const { caseId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editingCase, setEditingCase] = useState<FrontdeskSurgicalCaseListItem | null>(null);
  const [teamOpen, setTeamOpen] = useState(false);
  const [billingSheetOpen, setBillingSheetOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.shared.surgicalCase(caseId),
    queryFn: async () => {
      const response = await frontdeskApi.getSurgicalCase(caseId);
      if (response.success === false) {
        throw new Error((response as any).error || 'Failed to load surgical case');
      }
      if (!response.data) {
        throw new Error('No data received');
      }
      return response.data;
    },
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await frontdeskApi.deleteSurgicalCase(caseId);
      if (response.success === false) {
        throw new Error((response as any).error || 'Failed to delete case');
      }
      return caseId;
    },
    onSuccess: () => {
      toast.success('Surgical case deleted');
      queryClient.invalidateQueries({ queryKey: [queryKeys.shared.all, 'surgical-cases'] });
      router.push('/frontdesk/surgical-cases');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete case'),
  });

  useEffect(() => {
    if (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load case details');
    }
  }, [error]);

  const suggestedServices = useMemo(
    () => suggestedServicesFromCase(data?.case_procedures),
    [data?.case_procedures],
  );

  if (isLoading) {
    return (
      <div className="bg-white">
        <Skeleton className="h-24 w-full rounded-none" />
        <Skeleton className="h-64 w-full rounded-none" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white px-6 py-10">
        <Button variant="ghost" onClick={() => router.back()} className="text-primary">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to cases
        </Button>
        <p className="mt-6 text-sm text-foreground">This surgical case could not be loaded.</p>
        <Button variant="link" onClick={() => refetch()} className="px-0 text-primary">
          Retry
        </Button>
      </div>
    );
  }

  const statusCfg = getSurgicalCaseStatusDisplay(data.status);
  const canEdit = ['DRAFT', 'PLANNING', 'READY_FOR_SCHEDULING', 'READY_FOR_WARD_PREP', 'IN_WARD_PREP'].includes(data.status);
  const canDelete = canEdit;
  const patientName = `${data.patient.first_name} ${data.patient.last_name}`.trim();
  const procedures = data.case_procedures ?? [];
  const categorySummary = data.procedure_category
    ? data.procedure_category.split(',').map((part: string) => categoryLabel(part.trim())).join(', ')
    : '—';
  const surgeonName = data.primary_surgeon?.name || data.primary_surgeon_name || 'Not assigned';
  const procedureRows = procedures.length > 0
    ? procedures.map((row: any) => [
        row.procedure?.name || '—',
        categoryLabel(row.procedure?.category ?? '', row.procedure?.subcategory),
        row.procedure?.estimated_duration_minutes ? `${row.procedure.estimated_duration_minutes} min` : '—',
      ])
    : [[data.procedure_name || 'Unnamed procedure', categorySummary, '—']];

  const highlights = [
    ['Procedure date', displayDate(data.procedure_date)],
    ['Surgeon', surgeonName],
    ['Admission', displayValue(data.admission_type)],
    ['Type', displayValue(data.primary_or_revision)],
  ];

  return (
    <div className="bg-white text-foreground">
      <header className="bg-primary px-6 py-5 text-primary-foreground">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => router.push('/frontdesk/surgical-cases')}
              className="inline-flex items-center text-sm font-medium text-white/80 hover:text-white"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Surgical cases
            </button>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{patientName}</h1>
              <span className="border border-white/30 bg-white/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">
                {statusCfg.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-white/80">{data.procedure_name || 'Unnamed procedure'}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setTeamOpen(true)} className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">
              Update team
            </Button>
            <Button variant="outline" size="sm" onClick={() => setBillingSheetOpen(true)} className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">
              Update bill
            </Button>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => setEditingCase(data)} className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm(`Delete surgical case for ${patientName}?`)) {
                    deleteMutation.mutate();
                  }
                }}
                className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
        {highlights.map(([label, value]) => (
          <div key={label} className="bg-[#e7d6bf]/30 px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">{label}</p>
            <p className="mt-1 text-base font-semibold text-primary">{value}</p>
          </div>
        ))}
      </div>

      {data.diagnosis && (
        <div className="border-b border-border bg-[#e7d6bf]/30 px-5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">Diagnosis</p>
          <p className="mt-1 text-sm font-medium text-foreground">{data.diagnosis}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1.7fr)_minmax(17rem,0.9fr)]">
        <div className="min-w-0 border-b border-border lg:border-b-0 lg:border-r">
          <Section title="Procedures">
            <RecordTable columns={['Procedure', 'Category', 'Duration']} rows={procedureRows} />
          </Section>

          <SurgicalCaseSetupCard
            embedded
            showAction={false}
            editing={teamOpen}
            onEditingChange={setTeamOpen}
            caseId={caseId}
            diagnosis={data.diagnosis}
            primaryOrRevision={data.primary_or_revision}
            admissionType={data.admission_type}
            primarySurgeonId={data.primary_surgeon?.id}
            primarySurgeonName={data.primary_surgeon?.name || data.primary_surgeon_name}
            teamMembers={data.team_members}
            onSaved={() => { void refetch(); }}
          />
        </div>

        <aside className="bg-[#e7d6bf]/30">
          <Section title="Patient">
            <FactList
              rows={[
                ['File number', data.patient.file_number ? `#${data.patient.file_number}` : '—'],
                ['Phone', data.patient.phone || '—'],
                ['Email', data.patient.email || '—'],
              ]}
            />
          </Section>
          <Section title="Clinical">
            <FactList
              rows={[
                ['Urgency', displayValue(data.urgency)],
                ['Created', displayDate(data.created_at, true)],
                ['Updated', displayDate(data.updated_at, true)],
              ]}
            />
          </Section>
          {data.theater_booking && (
            <Section title="Theater">
              <FactList
                rows={[
                  ['Theater', data.theater_booking.theater?.name || '—'],
                  ['Start', displayDate(data.theater_booking.startTime, true)],
                  ['End', displayDate(data.theater_booking.endTime, true)],
                  ['Status', displayValue(data.theater_booking.status)],
                ]}
              />
            </Section>
          )}
          {data.case_plan && (
            <Section title="Case plan">
              <FactList
                rows={[
                  ['Readiness', displayValue(data.case_plan.readiness_status)],
                  ['Ready for surgery', data.case_plan.ready_for_surgery ? 'Yes' : 'No'],
                  ['Duration', data.case_plan.estimated_duration_minutes ? `${data.case_plan.estimated_duration_minutes} min` : '—'],
                ]}
              />
            </Section>
          )}
        </aside>
      </div>

      <TheaterTechBillingSummary
        flush
        showAction={false}
        caseId={caseId}
        suggestedServices={suggestedServices}
        onEdit={() => setBillingSheetOpen(true)}
      />

      <TheaterTechBillingSheet
        caseId={caseId}
        suggestedServices={suggestedServices}
        open={billingSheetOpen}
        onOpenChange={setBillingSheetOpen}
      />

      {editingCase && (
        <EditSurgicalCaseDialog
          open={!!editingCase}
          caseItem={editingCase}
          onOpenChange={(open) => {
            if (!open) setEditingCase(null);
          }}
          onSuccess={() => {
            setEditingCase(null);
            queryClient.invalidateQueries({ queryKey: [queryKeys.shared.all, 'surgical-cases'] });
            queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.theaterQueue() });
          }}
        />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-border last:border-b-0">
      <h2 className="border-b-2 border-primary bg-[#e7d6bf]/30 px-5 py-2.5 text-sm font-semibold text-primary">{title}</h2>
      {children}
    </section>
  );
}

function FactList({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl>
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[8.5rem_1fr] gap-3 border-b border-border px-5 py-2.5 last:border-b-0">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words text-sm font-medium text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function RecordTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          {columns.map((column) => (
            <TableHead key={column} className="h-9 bg-[#e7d6bf]/30 px-6 text-[11px] font-semibold uppercase tracking-wider text-secondary">
              {column}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={`${row[0]}-${index}`} className="border-border hover:bg-[#e7d6bf]/30">
            {row.map((cell, cellIndex) => (
              <TableCell
                key={`${columns[cellIndex]}-${index}`}
                className={cellIndex === 0 ? 'px-6 py-2.5 font-medium text-foreground' : 'px-6 py-2.5 text-foreground'}
              >
                {cell}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
