'use client';

/**
 * Nurse Pre-Op Case Detail Page
 *
 * View and manage detailed pre-operative readiness for a surgical case.
 * Refactored for modern aesthetic and improved checklist interaction.
 */

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { usePreOpCaseDetails, useUpdatePreOpCase, useMarkCaseReady } from '@/hooks/nurse/usePreOpCases';
// import { NursePreOpChecklist } from '@/components/nurse/NursePreOpChecklist'; // Removed
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  User2,
  Phone,
  Mail,
  Calendar,
  Stethoscope,
  CheckCircle2,
  Camera,
  FileSignature,
  ClipboardList,
  Activity,
  Edit,
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import Link from 'next/link';
import { NursePageHeader } from '@/components/nurse/NursePageHeader';

/**
 * Checklist Item Component
 */
function ChecklistItem({
  label,
  description,
  complete,
  icon: Icon,
  onAction,
  actionLabel,
}: {
  label: string;
  description: string;
  complete: boolean;
  icon: React.ElementType;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 ${complete
      ? 'bg-emerald-50/30 border-emerald-100'
      : 'bg-white border-slate-200 hover:border-blue-200 hover:shadow-sm'
      }`}>
      <div
        className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 ${complete ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
          }`}
      >
        {complete ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-semibold text-sm text-slate-900">{label}</h4>
          {complete ? (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] uppercase tracking-wide">
              Complete
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] uppercase tracking-wide">
              Pending
            </Badge>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </div>
      {onAction && !complete && (
        <Button variant="outline" size="sm" onClick={onAction} className="h-8 text-xs font-medium border-slate-200 hover:bg-slate-50">
          {actionLabel || 'Complete'}
        </Button>
      )}
    </div>
  );
}

/**
 * Loading Skeleton
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function PreOpCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const caseId = params?.id as string;

  const { data: caseData, isLoading, error, refetch } = usePreOpCaseDetails(caseId);
  const updateCase = useUpdatePreOpCase();
  const markReady = useMarkCaseReady();

  const [editingNotes, setEditingNotes] = useState(false);
  const [preOpNotes, setPreOpNotes] = useState('');
  const [riskFactors, setRiskFactors] = useState('');
  const [showMarkReadyDialog, setShowMarkReadyDialog] = useState(false);
  // const [showChecklistDialog, setShowChecklistDialog] = useState(false); // Removed

  // Initialize form values when data loads
  const initializeForm = () => {
    if (caseData?.casePlan) {
      setPreOpNotes(caseData.casePlan.preOpNotes || '');
      setRiskFactors(caseData.casePlan.riskFactors || '');
    }
  };

  const handleSaveNotes = async () => {
    try {
      await updateCase.mutateAsync({
        caseId,
        updates: {
          casePlanUpdates: {
            preOpNotes,
            riskFactors,
          },
        },
      });
      toast.success('Notes saved successfully');
      setEditingNotes(false);
      refetch();
    } catch (error) {
      toast.error('Failed to save notes');
    }
  };

  const handleMarkReady = async () => {
    try {
      await markReady.mutateAsync(caseId);
      toast.success('Case marked as ready for scheduling');
      setShowMarkReadyDialog(false);
      refetch();
    } catch (error) {
      toast.error('Failed to mark case as ready');
    }
  };

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
        <LoadingSkeleton />
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="animate-in fade-in space-y-6 pb-10">
        <NursePageHeader />
        <Button variant="ghost" size="sm" asChild className="text-slate-500">
          <Link href="/nurse/ward-prep">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to List
          </Link>
        </Button>
        <Card className="border-rose-100 bg-rose-50/30">
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
            <h3 className="font-semibold text-lg text-rose-900 mb-2">Failed to load case</h3>
            <p className="text-rose-600 mb-6">{(error as Error)?.message || 'Case not found'}</p>
            <Button onClick={() => router.push('/nurse/ward-prep')}>Return to Ward Prep</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const readiness = caseData.readiness;
  const patient = caseData.patient;
  const surgeon = caseData.primarySurgeon;
  const casePlan = caseData.casePlan;

  return (
    <div className="animate-in fade-in duration-500 pb-10">

      <NursePageHeader />

      <div className="space-y-6">

        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Button variant="ghost" size="sm" asChild className="-ml-3 w-fit text-slate-500 hover:text-slate-900">
              <Link href="/nurse/ward-prep">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Ward List
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {patient?.fullName || 'Unknown Patient'}
              </h1>
              <Badge variant={caseData.status === 'READY_FOR_SCHEDULING' ? 'default' : 'secondary'}>
                {caseData.status.replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className="text-slate-500 text-sm">
              {caseData.procedureName || 'Procedure not specified'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              asChild
              className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm"
            >
              <Link href={`/nurse/ward-prep/${caseId}/checklist`}>
                <ClipboardList className="w-4 h-4 mr-2" />
                Complete Ward Checklist
              </Link>
            </Button>

            {readiness?.isReady && caseData.status !== 'READY_FOR_SCHEDULING' && caseData.status !== 'SCHEDULED' && (
              <Button
                onClick={() => setShowMarkReadyDialog(true)}
                className="bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark Ready for Scheduling
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Readiness Card */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">Pre-Op Readiness Checklist</h3>
                  <p className="text-xs text-slate-500">Complete all required items to proceed</p>
                </div>
                <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-sm">
                  <span className="text-xs font-medium text-slate-600">Progress</span>
                  <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${readiness?.percentage === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      style={{ width: `${readiness?.percentage || 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-900">{readiness?.percentage}%</span>
                </div>
              </div>

              <CardContent className="p-6 space-y-4">
                <ChecklistItem
                  label="Pre-Op Intake Form"
                  description="Complete pre-operative intake assessment"
                  complete={readiness?.intakeFormComplete || false}
                  icon={ClipboardList}
                  onAction={() => {
                    initializeForm();
                    setEditingNotes(true);
                  }}
                  actionLabel="Add Notes / Assessment"
                />
                <ChecklistItem
                  label="Medical History Review"
                  description="Review and document risk factors"
                  complete={readiness?.medicalHistoryComplete || false}
                  icon={Activity}
                  onAction={() => {
                    initializeForm();
                    setEditingNotes(true);
                  }}
                  actionLabel="Review Risks"
                />
                <ChecklistItem
                  label="Clinical Photos"
                  description="Upload pre-operative clinical photographs"
                  complete={readiness?.photosUploaded || false}
                  icon={Camera}
                  onAction={() => toast.info('Photo upload feature coming soon')}
                  actionLabel="Upload Photos"
                />
                <ChecklistItem
                  label="Consent Form"
                  description="Obtain patient signature on consent form"
                  complete={readiness?.consentSigned || false}
                  icon={FileSignature}
                  onAction={() => toast.info('Consent management coming soon')}
                  actionLabel="Sign Consent"
                />
                <ChecklistItem
                  label="Procedure Plan"
                  description="Confirm procedure plan is documented"
                  complete={readiness?.procedurePlanComplete || false}
                  icon={Calendar}
                />
              </CardContent>
            </Card>

            {/* Notes Section */}
            <Card className="border-slate-200 shadow-sm">
              <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">Clinical Notes & Assessment</h3>
                </div>
                {!editingNotes && (
                  <Button variant="outline" size="sm" onClick={() => {
                    initializeForm();
                    setEditingNotes(true);
                  }} className="h-8">
                    <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit
                  </Button>
                )}
              </div>
              <CardContent className="p-6">
                {editingNotes ? (
                  <div className="space-y-4 animate-in fade-in">
                    <div>
                      <Label htmlFor="preOpNotes" className="text-slate-700">Pre-Op Notes</Label>
                      <Textarea
                        id="preOpNotes"
                        value={preOpNotes}
                        onChange={(e) => setPreOpNotes(e.target.value)}
                        placeholder="Enter pre-operative assessment notes..."
                        className="mt-2 min-h-[120px] bg-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="riskFactors" className="text-slate-700">Risk Factors</Label>
                      <Textarea
                        id="riskFactors"
                        value={riskFactors}
                        onChange={(e) => setRiskFactors(e.target.value)}
                        placeholder="Document any risk factors (e.g. allergies, previous complications)..."
                        className="mt-2 min-h-[120px] bg-white border-amber-200 focus:border-amber-400 focus:ring-amber-100"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setEditingNotes(false)}
                        disabled={updateCase.isPending}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleSaveNotes} disabled={updateCase.isPending} className="bg-blue-600 hover:bg-blue-700">
                        {updateCase.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Notes
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Pre-Op Notes</h4>
                      <div
                        className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: casePlan?.preOpNotes || '<span class="text-slate-400 italic">No notes recorded yet.</span>' }}
                      />
                    </div>
                    <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-100">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-2">Risk Factors</h4>
                      <div
                        className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: casePlan?.riskFactors || '<span class="text-slate-400 italic">No risk factors documented.</span>' }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-sm font-semibold text-slate-800">Patient Details</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                    <User2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{patient?.fullName}</p>
                    <p className="text-xs text-slate-500">File: {patient?.fileNumber || '--'}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  {patient?.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {patient.phone}
                    </div>
                  )}
                  {patient?.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{patient.email}</span>
                    </div>
                  )}
                  {patient?.dateOfBirth && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {format(new Date(patient.dateOfBirth), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-sm font-semibold text-slate-800">Surgical Team</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Stethoscope className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase">Primary Surgeon</p>
                    <p className="text-sm font-medium text-slate-900">{surgeon?.name || 'Unassigned'}</p>
                    {surgeon?.specialty && (
                      <p className="text-xs text-slate-500">{surgeon.specialty}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-sm font-semibold text-slate-800">Case Info</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Urgency</span>
                  <Badge variant={caseData.urgency === 'ELECTIVE' ? 'outline' : 'secondary'} className={caseData.urgency === 'EMERGENCY' ? 'bg-rose-100 text-rose-700' : ''}>
                    {caseData.urgency}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Created</span>
                  <span className="font-medium text-slate-700">{format(new Date(caseData.createdAt), 'MMM d, yyyy')}</span>
                </div>
                {caseData.diagnosis && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Diagnosis</p>
                    <p className="text-sm text-slate-800">{caseData.diagnosis}</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>

      </div>

      {/* Mark Ready Confirmation Dialog */}
      <Dialog open={showMarkReadyDialog} onOpenChange={setShowMarkReadyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Case Ready for Scheduling?</DialogTitle>
            <DialogDescription>
              This will mark the case as ready and notify the scheduling team. The case will move to
              the ready-for-scheduling queue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMarkReadyDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMarkReady}
              disabled={markReady.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {markReady.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Ready
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ward Checklist Dialog */}
      {/* Ward Checklist Dialog Removed based on refactor to dedicated page */}

    </div>
  );
}
