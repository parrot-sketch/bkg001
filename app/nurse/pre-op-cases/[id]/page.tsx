'use client';

/**
 * Nurse Pre-Op Case Detail Page
 *
 * View and manage detailed pre-operative readiness for a surgical case.
 * Complete readiness checklist items and update case plan details.
 */

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { usePreOpCaseDetails, useUpdatePreOpCase, useMarkCaseReady } from '@/hooks/nurse/usePreOpCases';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
  Circle,
  AlertCircle,
  Camera,
  FileSignature,
  ClipboardList,
  Activity,
  Edit,
  Save,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

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
    <div className="flex items-start gap-4 p-4 rounded-lg border border-border">
      <div
        className={`flex items-center justify-center w-10 h-10 rounded-full ${
          complete ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
        }`}
      >
        {complete ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">{label}</h4>
          {complete ? (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              Complete
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              Pending
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      {onAction && !complete && (
        <Button variant="outline" size="sm" onClick={onAction}>
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
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Main Case Detail Page
 */
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
          <p className="text-muted-foreground">Please log in to view case details</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/nurse/pre-op-cases">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Cases
          </Link>
        </Button>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/nurse/pre-op-cases">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Cases
          </Link>
        </Button>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Failed to load case</h3>
            <p className="text-muted-foreground mb-4">{(error as Error)?.message || 'Case not found'}</p>
            <Button onClick={() => router.push('/nurse/pre-op-cases')}>Go Back</Button>
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
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/nurse/pre-op-cases">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cases
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {patient?.fullName || 'Unknown Patient'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {caseData.procedureName || 'Procedure not specified'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={caseData.status === 'READY_FOR_SCHEDULING' ? 'default' : 'secondary'}>
            {caseData.status.replace(/_/g, ' ')}
          </Badge>
          {readiness?.isReady && caseData.status !== 'READY_FOR_SCHEDULING' && (
            <Button
              onClick={() => setShowMarkReadyDialog(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Mark Ready for Scheduling
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Readiness Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Pre-Op Readiness</CardTitle>
              <CardDescription>
                Complete all items to mark this case ready for scheduling
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Overall Progress</span>
                  <span
                    className={`font-medium ${
                      readiness?.percentage === 100
                        ? 'text-emerald-600'
                        : readiness?.percentage >= 50
                          ? 'text-amber-600'
                          : 'text-slate-500'
                    }`}
                  >
                    {readiness?.percentage || 0}%
                  </span>
                </div>
                <Progress
                  value={readiness?.percentage || 0}
                  className={`h-3 ${readiness?.percentage === 100 ? '[&>div]:bg-emerald-500' : ''}`}
                />
              </div>

              <div className="space-y-3">
                <ChecklistItem
                  label="Pre-Op Intake Form"
                  description="Complete pre-operative intake assessment"
                  complete={readiness?.intakeFormComplete || false}
                  icon={ClipboardList}
                  onAction={() => {
                    initializeForm();
                    setEditingNotes(true);
                  }}
                  actionLabel="Add Notes"
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
                  actionLabel="Add Risk Factors"
                />
                <ChecklistItem
                  label="Clinical Photos"
                  description="Upload pre-operative clinical photographs"
                  complete={readiness?.photosUploaded || false}
                  icon={Camera}
                  onAction={() => toast.info('Photo upload coming soon')}
                  actionLabel="Upload Photos"
                />
                <ChecklistItem
                  label="Consent Form"
                  description="Obtain patient signature on consent form"
                  complete={readiness?.consentSigned || false}
                  icon={FileSignature}
                  onAction={() => toast.info('Consent form management coming soon')}
                  actionLabel="Add Consent"
                />
                <ChecklistItem
                  label="Procedure Plan"
                  description="Confirm procedure plan is documented"
                  complete={readiness?.procedurePlanComplete || false}
                  icon={Calendar}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pre-Op Notes & Risk Factors</CardTitle>
                <CardDescription>Document pre-operative assessment findings</CardDescription>
              </div>
              {!editingNotes && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    initializeForm();
                    setEditingNotes(true);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingNotes ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="preOpNotes">Pre-Op Notes</Label>
                    <Textarea
                      id="preOpNotes"
                      value={preOpNotes}
                      onChange={(e) => setPreOpNotes(e.target.value)}
                      placeholder="Enter pre-operative assessment notes..."
                      className="mt-2 min-h-[120px]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="riskFactors">Risk Factors</Label>
                    <Textarea
                      id="riskFactors"
                      value={riskFactors}
                      onChange={(e) => setRiskFactors(e.target.value)}
                      placeholder="Document any risk factors..."
                      className="mt-2 min-h-[120px]"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setEditingNotes(false)}
                      disabled={updateCase.isPending}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveNotes} disabled={updateCase.isPending}>
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
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Pre-Op Notes</h4>
                    <p className="text-sm whitespace-pre-wrap">
                      {casePlan?.preOpNotes || 'No notes recorded yet'}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Risk Factors</h4>
                    <p className="text-sm whitespace-pre-wrap">
                      {casePlan?.riskFactors || 'No risk factors documented'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Patient Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Patient Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <User2 className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{patient?.fullName}</p>
                  {patient?.fileNumber && (
                    <p className="text-xs text-muted-foreground">File: {patient.fileNumber}</p>
                  )}
                </div>
              </div>
              {patient?.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm">{patient.phone}</p>
                </div>
              )}
              {patient?.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm">{patient.email}</p>
                </div>
              )}
              {patient?.dateOfBirth && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm">
                    DOB: {format(new Date(patient.dateOfBirth), 'MMM d, yyyy')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Surgeon Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Primary Surgeon</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Stethoscope className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{surgeon?.name || 'Not assigned'}</p>
                  {surgeon?.specialty && (
                    <p className="text-xs text-muted-foreground">{surgeon.specialty}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Case Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Case Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Urgency</span>
                <Badge variant="outline">{caseData.urgency}</Badge>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{format(new Date(caseData.createdAt), 'MMM d, yyyy')}</span>
              </div>
              {caseData.diagnosis && (
                <>
                  <Separator />
                  <div>
                    <span className="text-muted-foreground">Diagnosis</span>
                    <p className="mt-1">{caseData.diagnosis}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
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
    </div>
  );
}
