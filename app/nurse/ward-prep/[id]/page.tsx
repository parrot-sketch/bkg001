'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { usePreOpCaseDetails, useUpdatePreOpCase } from '@/hooks/nurse/usePreOpCases';
import { Button } from '@/components/ui/button';
import { User2, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { NursePageHeader } from '@/components/nurse/NursePageHeader';

import { WardPrepCaseHeader } from '@/components/nurse/ward-prep-detail/WardPrepCaseHeader';
import { WardChecklistPanel } from '@/components/nurse/ward-prep-detail/WardChecklistPanel';
import { ClinicalNotesPanel } from '@/components/nurse/ward-prep-detail/ClinicalNotesPanel';
import { PatientDetailsCard, SurgicalTeamCard, CaseInfoCard } from '@/components/nurse/ward-prep-detail/SidebarCards';
import { PreOpCaseDetailSkeleton } from '@/components/nurse/ward-prep-detail/PreOpCaseDetailSkeleton';

export default function PreOpCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const caseId = params?.id as string;

  const { data: caseData, isLoading, error, refetch } = usePreOpCaseDetails(caseId);
  const updateCase = useUpdatePreOpCase();

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <User2 className="h-5 w-5 text-slate-400" />
          </div>
          <p className="text-muted-foreground">Please log in to view case details</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="animate-in fade-in space-y-6 pb-10">
        <NursePageHeader />
        <PreOpCaseDetailSkeleton />
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="animate-in fade-in space-y-6 pb-10">
        <NursePageHeader />
        <Button variant="ghost" size="sm" asChild className="text-slate-500">
          <Link href="/nurse/ward-prep">
            Back to List
          </Link>
        </Button>
        <div className="rounded-xl border border-rose-100 bg-rose-50/30 p-12 text-center">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h3 className="font-semibold text-lg text-rose-900 mb-2">Failed to load case</h3>
          <p className="text-rose-600 mb-6">{(error as Error)?.message || 'Case not found'}</p>
          <Button onClick={() => router.push('/nurse/ward-prep')}>Return to Ward Prep</Button>
        </div>
      </div>
    );
  }

  const patient = caseData.patient;
  const surgeon = caseData.primarySurgeon;
  const casePlan = caseData.casePlan;
  const statusLabelMap: Record<string, string> = {
    READY_FOR_WARD_PREP: 'Ward Prep',
    IN_WARD_PREP: 'In Ward Prep',
    READY_FOR_THEATER_BOOKING: 'Ready for Booking',
    SCHEDULED: 'Scheduled',
    IN_PREP: 'Awaiting Theater Entry',
    IN_THEATER: 'In Theater',
    RECOVERY: 'Recovery',
    COMPLETED: 'Completed',
  };
  const statusLabel = statusLabelMap[caseData.status] ?? caseData.status.replace(/_/g, ' ');
  const statusTone = caseData.status === 'READY_FOR_WARD_PREP' || caseData.status === 'IN_WARD_PREP' ? 'ward' : 'other';
  const wardChecklistState =
    caseData.wardChecklist?.isComplete
      ? { kind: 'complete' as const, signedBy: caseData.wardChecklist.signedBy }
      : caseData.wardChecklist?.isStarted
        ? { kind: 'started' as const }
        : { kind: 'not_started' as const };

  return (
    <div className="animate-in fade-in duration-500 pb-10">

      <NursePageHeader />

      <div className="space-y-6">

        {/* Navigation & Header */}
        <WardPrepCaseHeader
          caseId={caseId}
          patientName={patient?.fullName || 'Unknown Patient'}
          procedureName={caseData.procedureName || 'Procedure not specified'}
          statusLabel={statusLabel}
          statusTone={statusTone}
          wardChecklistState={wardChecklistState}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            <WardChecklistPanel caseId={caseId} wardChecklist={caseData.wardChecklist} />

            <ClinicalNotesPanel
              initialPreOpNotes={casePlan?.preOpNotes || ''}
              initialRiskFactors={casePlan?.riskFactors || ''}
              isSaving={updateCase.isPending}
              onSave={async ({ preOpNotes, riskFactors }) => {
                await updateCase.mutateAsync({
                  caseId,
                  updates: {
                    casePlanUpdates: {
                      preOpNotes,
                      riskFactors,
                    },
                  },
                });
                await refetch();
              }}
            />

          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            <PatientDetailsCard patient={patient} />
            <SurgicalTeamCard surgeon={surgeon} />
            <CaseInfoCard createdAt={caseData.createdAt} urgency={caseData.urgency} diagnosis={caseData.diagnosis} />

          </div>
        </div>

      </div>

    </div>
  );
}
