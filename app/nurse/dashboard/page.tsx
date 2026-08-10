'use client';

/**
 * Nurse Dashboard — Consolidated Command Center
 *
 * Clean, minimal design with calm neutral palette.
 * Provides unified view of all nurse workflows without visual noise.
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Users,
  Clock,
  CheckCircle2,
  ClipboardList,
  Activity,
  HeartPulse,
  Calendar,
  ChevronRight,
  FileText,
  DoorOpen,
  Stethoscope,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/patient/useAuth';
import { useTodayCheckedInPatients } from '@/hooks/nurse/useNurseDashboard';
import { usePreOpSummary, usePreOpCases } from '@/hooks/nurse/usePreOpCases';
import { useMarkInTheater } from '@/hooks/nurse/useMarkInTheater';
import { useIntraOpCases } from '@/hooks/nurse/useIntraOpCases';
import { useRecoveryCases } from '@/hooks/nurse/useRecoveryCases';
import { WardPrepTableRow } from '@/components/nurse/WardPrepTableRow';
import { TheatreSupportTableRow } from '@/components/nurse/TheatreSupportTableRow';
import { RecoveryCaseTableRow } from '@/components/nurse/RecoveryCaseTableRow';
import { QueueManagementPanels } from '@/components/frontdesk/QueueManagementPanels';
import { RecordVitalsDialog } from '@/components/nurse/RecordVitalsDialog';
import { AddCareNoteDialog } from '@/components/nurse/AddCareNoteDialog';
import Link from 'next/link';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface WardPrepCase {
  id: string;
  patient?: { fullName?: string; fileNumber?: string };
  procedureName?: string;
  primarySurgeon?: { name?: string };
  status: string;
  wardChecklist?: { isComplete: boolean; isStarted: boolean };
  createdAt: string;
  urgency?: string;
}

interface IntraOpCase {
  id: string;
  patient?: { fullName?: string };
  procedureName?: string;
  primarySurgeon?: { name?: string };
  status: string;
  theaterName?: string;
  startTime?: string;
}

interface RecoveryCase {
  id: string;
  patient?: { fullName?: string; fileNumber?: string };
  procedureName?: string;
  primarySurgeon?: { name?: string };
  status: string;
  hasIntraOpRecord?: boolean;
  createdAt: string;
  urgency?: string;
}


// ─── Status Config (monochrome) ────────────────────────────────────────────────

const WARD_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  PLANNING: { label: 'Planning', variant: 'secondary' },
  READY_FOR_WARD_PREP: { label: 'Ready for Ward Prep', variant: 'secondary' },
  IN_WARD_PREP: { label: 'In Ward Prep', variant: 'secondary' },
  READY_FOR_THEATER_BOOKING: { label: 'Ready for Booking', variant: 'outline' },
  SCHEDULED: { label: 'Scheduled', variant: 'outline' },
  IN_PREP: { label: 'Awaiting Theater Entry', variant: 'outline' },
  IN_THEATER: { label: 'In Theater', variant: 'outline' },
  RECOVERY: { label: 'In Recovery', variant: 'outline' },
  COMPLETED: { label: 'Completed', variant: 'outline' },
};

const INTRA_OP_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  SCHEDULED: { label: 'Scheduled', variant: 'outline' },
  IN_PREP: { label: 'In Prep', variant: 'secondary' },
  IN_THEATER: { label: 'In Theater', variant: 'secondary' },
};

const URGENCY_CONFIG: Record<string, { label: string }> = {
  ELECTIVE: { label: 'Elective' },
  URGENT: { label: 'Urgent' },
  EMERGENCY: { label: 'Emergency' },
};

// ─── Helper: Monochrome Stat Card ─────────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  onClick,
  loading,
}: {
  title: string;
  value: number;
  subtitle: string;
  onClick?: () => void;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-12 mb-1" />
          <Skeleton className="h-3 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'border border-slate-200 transition-all duration-200 cursor-pointer',
        onClick && 'hover:bg-slate-50 hover:border-slate-300'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-[11px] text-slate-500 mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

// ─── Row Components ────────────────────────────────────────────────────────────


// ─── Main Component ────────────────────────────────────────────────────────────

export default function NurseDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  // Data hooks
  const { data: checkedInPatients = [], isLoading: loadingCheckedIn, refetch: refetchCheckedIn } = useTodayCheckedInPatients(isAuthenticated && !!user);
  const { summary: preOpSummary, isLoading: loadingPreOp } = usePreOpSummary();
  const { data: preOpCasesData, isLoading: loadingPreOpCases } = usePreOpCases();
  const { data: intraOpData, isLoading: loadingIntraOp } = useIntraOpCases();
  const { data: recoveryData, isLoading: loadingRecovery } = useRecoveryCases();
  const markInTheater = useMarkInTheater();

  // Nurse queue actions
  const [selectedQueuePatient, setSelectedQueuePatient] = useState<{ patientId: string; appointmentId?: number } | null>(null);
  const [showVitalsDialog, setShowVitalsDialog] = useState(false);
  const [showCareNoteDialog, setShowCareNoteDialog] = useState(false);

  const findPatientForQueueAction = (patientId: string, appointmentId?: number) => {
    const appointment = checkedInPatients.find((a) => a.patientId === patientId);
    const patient = appointment?.patient;
    if (!patient) return null;
    return {
      patientId,
      appointmentId,
      patient: {
        id: patient.id,
        fileNumber: patient.fileNumber || '',
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        fullName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown',
        dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth) : new Date(),
        age: patient.dateOfBirth ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : 0,
        gender: patient.gender || '',
        email: patient.email || '',
        phone: patient.phone || '',
        hasPrivacyConsent: false,
        hasServiceConsent: false,
        hasMedicalConsent: false,
      } as any,
    };
  };

  const handleRecordVitals = (patientId: string, appointmentId?: number) => {
    const context = findPatientForQueueAction(patientId, appointmentId);
    if (!context) return;
    setSelectedQueuePatient(context);
    setShowVitalsDialog(true);
  };

  const handleAddCareNote = (patientId: string, appointmentId?: number) => {
    const context = findPatientForQueueAction(patientId, appointmentId);
    if (!context) return;
    setSelectedQueuePatient(context);
    setShowCareNoteDialog(true);
  };

  const handlePreOpChecklist = (patientId: string, _appointmentId?: number) => {
    router.push('/nurse/ward-prep');
  };

  const handleDialogSuccess = () => {
    setShowVitalsDialog(false);
    setShowCareNoteDialog(false);
    setSelectedQueuePatient(null);
    refetchCheckedIn?.();
  };

  // Derived data
  const wardPrepCases = (preOpCasesData?.cases || []).filter(
    (c: any) => c.status === 'READY_FOR_WARD_PREP' || c.status === 'IN_WARD_PREP'
  ).slice(0, 5);

  const activeIntraOpCases = (intraOpData?.cases || []).slice(0, 5);
  const activeRecoveryCases = (recoveryData?.cases || []).slice(0, 5);
  const todayPatients = (checkedInPatients || []).slice(0, 5);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-slate-500">Please log in to access your dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-300">

      {/* ── QUICK STATS ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Ward Prep"
          value={preOpSummary?.total || 0}
          subtitle="Pending checklists"
          loading={loadingPreOp}
          onClick={() => router.push('/nurse/ward-prep')}
        />
        <StatCard
          title="In Theater"
          value={intraOpData?.cases.length || 0}
          subtitle="Active surgeries"
          loading={loadingIntraOp}
          onClick={() => router.push('/nurse/theatre-support')}
        />
        <StatCard
          title="Recovery"
          value={recoveryData?.cases.length || 0}
          subtitle="PACU monitoring"
          loading={loadingRecovery}
          onClick={() => router.push('/nurse/recovery-discharge')}
        />
        <StatCard
          title="Clinic Queue"
          value={checkedInPatients.length}
          subtitle="Awaiting vitals"
          loading={loadingCheckedIn}
          onClick={() => router.push('/nurse/patients')}
        />
      </div>

      {/* ── WARD PREP PRIORITY QUEUE ───────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Ward Prep — Checklist Required</h2>
            <p className="text-[12px] text-slate-500">Patients awaiting pre-operative nursing assessment</p>
          </div>
          <Button variant="ghost" size="sm" className="text-[12px] text-slate-600 h-8" asChild>
            <Link href="/nurse/ward-prep">
              View All <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>

        <Card className="border-slate-200">
          {loadingPreOpCases ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 bg-slate-50 animate-pulse rounded-lg border border-slate-100" />
              ))}
            </div>
          ) : wardPrepCases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50/50 rounded-xl border border-dashed">
              <CheckCircle2 className="h-10 w-10 text-slate-300 mb-3" />
              <h3 className="text-sm font-medium text-slate-900">All caught up!</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">No ward prep checklists pending.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="w-[200px]">Patient</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead>Surgeon</TableHead>
                  <TableHead className="w-[100px]">Created</TableHead>
                  <TableHead className="w-[130px]">Checklist</TableHead>
                  <TableHead className="text-right w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {wardPrepCases.map((caseItem: any) => (
                  <WardPrepTableRow key={caseItem.id} surgicalCase={caseItem} />
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </section>

      {/* ── THREE-COLUMN WORKFLOW GRID ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Column 1: In‑Theater Cases ───────────────────────────────────────── */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">In Theater</CardTitle>
                <CardDescription className="text-[11px] mt-0.5">Active surgeries</CardDescription>
              </div>
              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <Activity className="h-4 w-4 text-slate-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingIntraOp ? (
              <div className="p-4 space-y-3">
                {[1, 2].map(i => <div key={i} className="h-12 bg-slate-50 animate-pulse rounded-lg" />)}
              </div>
            ) : activeIntraOpCases.length === 0 ? (
              <div className="py-10 text-center">
                <Activity className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-600">No active surgeries</p>
                <p className="text-[10px] text-slate-400 mt-1">Theater is currently clear</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Theater</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeIntraOpCases.map((c) => (
                      <TheatreSupportTableRow key={c.id} surgicalCase={c} />
                    ))}
                  </TableBody>
                </Table>
                <div className="p-3 border-t border-slate-100">
                  <Button variant="ghost" size="sm" className="w-full text-[11px] text-slate-600 h-8" asChild>
                    <Link href="/nurse/theatre-support">
                      View Theatre Board <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Column 2: Recovery Cases ──────────────────────────────────────────── */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">Recovery</CardTitle>
                <CardDescription className="text-[11px] mt-0.5">PACU patients</CardDescription>
              </div>
              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <HeartPulse className="h-4 w-4 text-slate-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingRecovery ? (
              <div className="p-4 space-y-3">
                {[1, 2].map(i => <div key={i} className="h-12 bg-slate-50 animate-pulse rounded-lg" />)}
              </div>
            ) : activeRecoveryCases.length === 0 ? (
              <div className="py-10 text-center">
                <HeartPulse className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-600">No patients in recovery</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Procedure</TableHead>
                      <TableHead>Surgeon</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeRecoveryCases.map((c) => (
                      <RecoveryCaseTableRow key={c.id} surgicalCase={c} />
                    ))}
                  </TableBody>
                </Table>
                <div className="p-3 border-t border-slate-100">
                  <Button variant="ghost" size="sm" className="w-full text-[11px] text-slate-600 h-8" asChild>
                    <Link href="/nurse/recovery-discharge">
                      View All <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Column 3: Placeholder for balance ─────────────────────────────────── */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">Quick Actions</CardTitle>
                <CardDescription className="text-[11px] mt-0.5">Common nursing workflows</CardDescription>
              </div>
              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <ClipboardList className="h-4 w-4 text-slate-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-col gap-2">
              <Button size="sm" variant="outline" className="h-8 text-[11px] border-slate-200 justify-start" asChild>
                <Link href="/nurse/ward-prep">
                  <ClipboardList className="h-3.5 w-3.5 mr-2" />
                  Ward Checklists
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-[11px] border-slate-200 justify-start" asChild>
                <Link href="/nurse/theatre-support">
                  <Activity className="h-3.5 w-3.5 mr-2" />
                  Theatre Board
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-[11px] border-slate-200 justify-start" asChild>
                <Link href="/nurse/recovery-discharge">
                  <HeartPulse className="h-3.5 w-3.5 mr-2" />
                  Recovery
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-[11px] border-slate-200 justify-start" asChild>
                <Link href="/nurse/patients">
                  <Users className="h-3.5 w-3.5 mr-2" />
                  Patients
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── PATIENT QUEUE ───────────────────────────────────────────────────── */}
      <QueueManagementPanels
        role="NURSE"
        onRecordVitals={handleRecordVitals}
        onAddCareNote={handleAddCareNote}
        onPreOpChecklist={handlePreOpChecklist}
      />

      {/* ── QUICK ACTIONS BAR ───────────────────────────────────────────────────── */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Quick Actions</h3>
              <p className="text-[11px] text-slate-500">Common nursing workflows</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" className="h-8 text-[11px] border-slate-200" asChild>
                <Link href="/nurse/ward-prep">
                  <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                  Ward Checklists
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-[11px] border-slate-200" asChild>
                <Link href="/nurse/theatre-support">
                  <Activity className="h-3.5 w-3.5 mr-1.5" />
                  Theatre Board
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-[11px] border-slate-200" asChild>
                <Link href="/nurse/recovery-discharge">
                  <HeartPulse className="h-3.5 w-3.5 mr-1.5" />
                  Recovery
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-[11px] border-slate-200" asChild>
                <Link href="/nurse/patients">
                  <Users className="h-3.5 w-3.5 mr-1.5" />
                  Patients
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── DIALOGS ───────────────────────────────────────────────────────── */}
      {selectedQueuePatient && (
        <>
          <RecordVitalsDialog
            open={showVitalsDialog}
            onClose={handleDialogSuccess}
            onSuccess={handleDialogSuccess}
            patient={selectedQueuePatient.patient}
            appointment={selectedQueuePatient.appointmentId ? { id: selectedQueuePatient.appointmentId } as any : null}
            nurseId={user.id}
          />
          <AddCareNoteDialog
            open={showCareNoteDialog}
            onClose={handleDialogSuccess}
            onSuccess={handleDialogSuccess}
            patient={selectedQueuePatient.patient}
            appointment={selectedQueuePatient.appointmentId ? { id: selectedQueuePatient.appointmentId } as any : null}
            nurseId={user.id}
          />
        </>
      )}
    </div>
  );
}
