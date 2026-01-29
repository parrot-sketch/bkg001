'use client';

/**
 * Consultation Session Page
 * 
 * Clinical workstation for live patient consultations.
 * 
 * This is NOT a generic dashboard - it's a professional surgical workstation designed for:
 * - Medico-legally critical documentation
 * - Photography-centered clinical decision-making
 * - Minimal cognitive load
 * - Fast capture
 * - Zero data loss
 * 
 * Route: /doctor/consultations/[appointmentId]/session
 */

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { useConsultation } from '@/hooks/consultation/useConsultation';
import { useSaveConsultationDraft } from '@/hooks/consultation/useSaveConsultationDraft';
import { usePatientConsultationHistory } from '@/hooks/consultation/usePatientConsultationHistory';
import { ConsultationSessionHeader } from '@/components/consultation/ConsultationSessionHeader';
import { PatientInfoSidebar } from '@/components/consultation/PatientInfoSidebar';
import { ConsultationWorkspace } from '@/components/consultation/ConsultationWorkspace';
import { CompleteConsultationDialog } from '@/components/consultation/CompleteConsultationDialog';
import { StartConsultationDialog } from '@/components/doctor/StartConsultationDialog';
import { ConsultationState } from '@/domain/enums/ConsultationState';
import { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '@/domain/enums/PatientDecision';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { toast } from 'sonner';
import { debounce } from 'lodash';
import { format } from 'date-fns';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

// Note: Requires @tanstack/react-query
// Install: npm install @tanstack/react-query
// Also requires: npm install lodash @types/lodash for debounce

export default function ConsultationSessionPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const appointmentId = params.appointmentId ? parseInt(params.appointmentId as string, 10) : null;

  // Fetch appointment
  const [appointment, setAppointment] = useState<AppointmentResponseDto | null>(null);
  const [patient, setPatient] = useState<PatientResponseDto | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch consultation
  const {
    consultation,
    isLoading: consultationLoading,
    isConsultationActive,
    canSaveDraft,
    isNotStarted,
  } = useConsultation(appointmentId);

  // Fetch patient consultation history
  const { data: consultationHistory } = usePatientConsultationHistory(patient?.id || null);

  // Save draft mutation
  const saveDraftMutation = useSaveConsultationDraft();

  // Local form state (structured notes)
  const [structuredNotes, setStructuredNotes] = useState<{
    rawText?: string;
    structured?: {
      chiefComplaint?: string;
      examination?: string;
      assessment?: string;
      plan?: string;
    };
  }>({});
  const [outcomeType, setOutcomeType] = useState<ConsultationOutcomeType | undefined>(undefined);
  const [patientDecision, setPatientDecision] = useState<PatientDecision | undefined>(undefined);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);

  // Auto-save status
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Load appointment and patient on mount
  useEffect(() => {
    if (!appointmentId || !user) return;

    const loadData = async () => {
      try {
        setLoading(true);

        // Load appointment
        const appointmentResponse = await doctorApi.getAppointment(appointmentId);
        if (!appointmentResponse.success || !appointmentResponse.data) {
          toast.error('Appointment not found');
          router.push('/doctor/appointments');
          return;
        }

        const apt = appointmentResponse.data;
        setAppointment(apt);

        // Load patient
        const patientResponse = await doctorApi.getPatient(apt.patientId);
        if (!patientResponse.success || !patientResponse.data) {
          toast.error('Patient not found');
          return;
        }

        setPatient(patientResponse.data);

        // Get doctor ID from user
        const doctorResponse = await doctorApi.getDoctorByUserId(user.id);
        if (doctorResponse.success && doctorResponse.data) {
          setDoctorId(doctorResponse.data.id);
        }

        // Restore draft from localStorage if exists AND is newer than server data
        const savedDraft = localStorage.getItem(`consultation-draft-${appointmentId}`);
        if (savedDraft) {
          try {
            const draft = JSON.parse(savedDraft);

            // Compare timestamps - only restore if draft is newer than server data
            if (draft.timestamp && draft.structuredNotes) {
              const draftTime = new Date(draft.timestamp);
              const serverTime = consultation?.updatedAt ? new Date(consultation.updatedAt) : new Date(0);

              if (draftTime > serverTime) {
                setStructuredNotes(draft.structuredNotes);
                toast.info('Restored unsaved changes from local backup', {
                  description: `Last saved locally at ${format(draftTime, 'HH:mm:ss')}`
                });
              } else {
                // Server data is newer, clear old localStorage
                localStorage.removeItem(`consultation-draft-${appointmentId}`);
              }
            }
          } catch (e) {
            console.error('Failed to restore draft:', e);
            // Clear corrupted localStorage
            localStorage.removeItem(`consultation-draft-${appointmentId}`);
          }
        }
      } catch (error) {
        console.error('Error loading consultation session:', error);
        toast.error('Failed to load consultation session');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [appointmentId, user, router]);

  // Restore notes from consultation if available
  useEffect(() => {
    if (consultation?.notes) {
      if (consultation.notes.structured && !structuredNotes.structured) {
        setStructuredNotes({
          rawText: consultation.notes.fullText,
          structured: consultation.notes.structured,
        });
      } else if (consultation.notes.fullText && !structuredNotes.rawText) {
        setStructuredNotes({
          rawText: consultation.notes.fullText,
        });
      }
      if (consultation.outcomeType) {
        setOutcomeType(consultation.outcomeType);
      }
      if (consultation.patientDecision) {
        setPatientDecision(consultation.patientDecision);
      }
    }
  }, [consultation]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const hasContent = structuredNotes.rawText?.trim() ||
      structuredNotes.structured?.chiefComplaint?.trim() ||
      structuredNotes.structured?.examination?.trim() ||
      structuredNotes.structured?.assessment?.trim() ||
      structuredNotes.structured?.plan?.trim();

    const hasUnsaved = hasContent && autoSaveStatus !== 'saved';

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsaved) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [structuredNotes, autoSaveStatus]);

  // Track the latest version token to avoid conflicts
  const latestVersionTokenRef = useRef<string | null>(null);
  const saveInProgressRef = useRef<boolean>(false);

  // Initialize version token from consultation
  useEffect(() => {
    if (consultation?.updatedAt && !latestVersionTokenRef.current) {
      const token = new Date(consultation.updatedAt).toISOString();
      latestVersionTokenRef.current = token;
      console.log('[Version Token] Initialized:', token);
    }
  }, [consultation?.updatedAt]);

  // Debounced auto-save
  const debouncedSave = useMemo(
    () =>
      debounce(async (notes: typeof structuredNotes) => {
        if (!appointmentId || !user || !canSaveDraft || !consultation) return;

        // Skip if save already in progress
        if (saveInProgressRef.current) {
          console.log('[Auto-save] Save already in progress, skipping...');
          return;
        }

        // Ensure we have a version token
        if (!latestVersionTokenRef.current) {
          latestVersionTokenRef.current = new Date(consultation.updatedAt).toISOString();
          console.log('[Auto-save] Version token was null, initialized:', latestVersionTokenRef.current);
        }

        console.log('[Auto-save] Starting save with version token:', latestVersionTokenRef.current);
        setAutoSaveStatus('saving');
        saveInProgressRef.current = true;

        if (!doctorId) {
          console.error('Doctor ID not available');
          saveInProgressRef.current = false;
          return;
        }

        try {
          const result = await saveDraftMutation.mutateAsync({
            appointmentId,
            doctorId,
            notes: {
              rawText: notes.rawText,
              structured: notes.structured,
            },
            versionToken: latestVersionTokenRef.current,
          });

          // Update version token from server response
          if (result?.updatedAt) {
            const newToken = new Date(result.updatedAt).toISOString();
            latestVersionTokenRef.current = newToken;
            console.log('[Auto-save] Updated version token from server:', newToken);
          }
          setAutoSaveStatus('saved');

          // Save to localStorage as backup
          localStorage.setItem(
            `consultation-draft-${appointmentId}`,
            JSON.stringify({
              structuredNotes: notes,
              timestamp: new Date().toISOString()
            })
          );

          // Clear saved status after 2 seconds
          setTimeout(() => {
            setAutoSaveStatus('idle');
            saveInProgressRef.current = false;
          }, 2000);
        } catch (error: any) {
          setAutoSaveStatus('error');
          saveInProgressRef.current = false;
          console.error('[Auto-save] Save failed:', error);

          // Check if it's a version conflict
          if (error?.message?.includes('updated by another session') ||
            error?.message?.includes('VERSION_CONFLICT')) {
            console.log('[Auto-save] Version conflict detected, canceling pending saves and refetching...');

            // Cancel any pending debounced saves
            debouncedSave.cancel();

            // Refetch consultation to get latest version
            queryClient.invalidateQueries({ queryKey: ['consultation', appointmentId] });

            // Reset version token so it will be re-initialized from fresh data
            latestVersionTokenRef.current = null;

            toast.error('Document was updated. Please wait for refresh...');

            // Don't save to localStorage on version conflict - data might be stale
            return;
          }

          // Save to localStorage as backup (only for non-conflict errors)
          localStorage.setItem(
            `consultation-draft-${appointmentId}`,
            JSON.stringify({
              structuredNotes: notes,
              timestamp: new Date().toISOString()
            })
          );
        }
      }, 3000), // Increased from 2000ms to 3000ms to reduce version conflicts
    [appointmentId, user, canSaveDraft, consultation, doctorId, saveDraftMutation]
  );

  // Trigger auto-save on notes change
  useEffect(() => {
    if (isConsultationActive && (structuredNotes.rawText || structuredNotes.structured)) {
      debouncedSave(structuredNotes);
    }

    return () => {
      debouncedSave.cancel();
    };
  }, [structuredNotes, isConsultationActive]); // Removed debouncedSave to prevent infinite loop

  // Manual save handler
  const handleSaveDraft = useCallback(async () => {
    if (!appointmentId || !doctorId || !canSaveDraft || !consultation) return;

    // Check if there's anything to save
    const hasContent = structuredNotes.rawText?.trim() ||
      structuredNotes.structured?.chiefComplaint?.trim() ||
      structuredNotes.structured?.examination?.trim() ||
      structuredNotes.structured?.assessment?.trim() ||
      structuredNotes.structured?.plan?.trim();

    if (!hasContent) {
      toast.info('No content to save');
      return;
    }

    setAutoSaveStatus('saving');

    // Ensure we have a version token
    if (!latestVersionTokenRef.current) {
      latestVersionTokenRef.current = new Date(consultation.updatedAt).toISOString();
      console.log('[Manual save] Version token was null, initialized:', latestVersionTokenRef.current);
    }

    console.log('[Manual save] Starting save with version token:', latestVersionTokenRef.current);

    try {
      const result = await saveDraftMutation.mutateAsync({
        appointmentId,
        doctorId,
        notes: {
          rawText: structuredNotes.rawText,
          structured: structuredNotes.structured,
        },
        versionToken: latestVersionTokenRef.current,
      });

      // Update version token from server response
      if (result?.updatedAt) {
        const newToken = new Date(result.updatedAt).toISOString();
        latestVersionTokenRef.current = newToken;
        console.log('[Manual save] Updated version token from server:', newToken);
      }
      setAutoSaveStatus('saved');
      toast.success('Draft saved');

      // Save to localStorage as backup
      localStorage.setItem(
        `consultation-draft-${appointmentId}`,
        JSON.stringify({
          structuredNotes,
          timestamp: new Date().toISOString()
        })
      );
    } catch (error) {
      setAutoSaveStatus('error');
      console.error('Save failed:', error);
      toast.error('Failed to save draft');
    }
  }, [appointmentId, doctorId, canSaveDraft, consultation, structuredNotes, saveDraftMutation]);

  // Handle structured notes change
  const handleNotesChange = useCallback((notes: typeof structuredNotes) => {
    setStructuredNotes(notes);
  }, []);

  // Handle outcome type change
  const handleOutcomeChange = useCallback((outcome: ConsultationOutcomeType) => {
    setOutcomeType(outcome);
    // Note: outcomeType is saved when completing consultation, not in draft
  }, []);

  // Handle patient decision change
  const handlePatientDecisionChange = useCallback((decision: PatientDecision) => {
    setPatientDecision(decision);
    // Note: patientDecision is saved when completing consultation, not in draft
  }, []);

  // Handle start consultation
  const handleStartConsultation = useCallback(() => {
    if (!appointment || appointment.status !== AppointmentStatus.SCHEDULED) {
      toast.error('Appointment must be scheduled to start consultation');
      return;
    }
    setShowStartDialog(true);
  }, [appointment]);

  // Handle consultation started
  const handleConsultationStarted = useCallback((startedAppointmentId: number) => {
    setShowStartDialog(false);
    // Invalidate and refetch consultation data
    if (appointmentId) {
      queryClient.invalidateQueries({ queryKey: ['consultation', appointmentId] });
    }
  }, [appointmentId, queryClient]);

  // Handle complete consultation
  const handleCompleteConsultation = useCallback(() => {
    if (!isConsultationActive) {
      toast.error('Consultation must be active to complete');
      return;
    }
    setShowCompleteDialog(true);
  }, [isConsultationActive]);

  // Handle consultation completed
  const handleConsultationCompleted = useCallback((redirectPath?: string) => {
    setShowCompleteDialog(false);
    // Navigate to appointments or refresh
    if (typeof redirectPath === 'string') {
      router.push(redirectPath);
    } else {
      router.push('/doctor/appointments');
    }
  }, [router]);

  // Loading state
  if (loading || consultationLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading consultation session...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!appointment || !patient) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Failed to load consultation session</p>
          <button
            onClick={() => router.push('/doctor/appointments')}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Return to Appointments
          </button>
        </div>
      </div>
    );
  }

  // Not started state
  if (isNotStarted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <h2 className="text-lg font-semibold mb-2">Consultation Not Started</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Start the consultation to begin the session.
          </p>
          <button
            onClick={handleStartConsultation}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Start Consultation
          </button>
        </div>
      </div>
    );
  }

  const patientName = `${patient.firstName} ${patient.lastName}`;
  const isReadOnly = consultation?.state === ConsultationState.COMPLETED;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <ConsultationSessionHeader
        patientName={patientName}
        consultation={consultation ?? null}
        userRole={user?.role as any}
        onSaveDraft={handleSaveDraft}
        onUploadPhoto={() => toast.info('Photo upload coming soon')}
        onViewHistory={() => router.push(`/doctor/patients/${patient.id}/consultations`)}
        onComplete={handleCompleteConsultation}
        autoSaveStatus={autoSaveStatus}
        isSaving={saveDraftMutation.isPending}
      />

      {/* Main Layout - 3 Column Grid (Left Sidebar + Workspace which has Center/Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Patient Info Sidebar - Column 1 */}
        <div className="w-80 border-r bg-muted/30 flex flex-col shrink-0">
          <div className="flex-1 overflow-y-auto p-4">
            <PatientInfoSidebar
              patient={patient}
              appointment={appointment}
              consultationHistory={consultationHistory?.consultations}
              photoCount={consultation?.photoCount || 0}
              onViewFullProfile={() => router.push(`/doctor/patients/${patient.id}?from=consultation&appointmentId=${appointmentId}`)}
              onViewCasePlans={() => router.push(`/doctor/patients/${patient.id}/case-plans`)}
              onViewPhotos={() => router.push(`/doctor/patients/${patient.id}/photos`)}
            />
          </div>
        </div>

        {/* Middle: Consultation Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          <ConsultationWorkspace
            consultation={consultation ?? null}
            onNotesChange={handleNotesChange}
            onOutcomeChange={handleOutcomeChange}
            onPatientDecisionChange={handlePatientDecisionChange}
            onSave={handleSaveDraft}
            onComplete={handleCompleteConsultation}
            isSaving={saveDraftMutation.isPending}
            isReadOnly={isReadOnly}
          />
        </div>
      </div>

      {/* Dialogs */}
      {showStartDialog && (
        <StartConsultationDialog
          open={showStartDialog}
          onClose={() => setShowStartDialog(false)}
          onSuccess={handleConsultationStarted}
          appointment={appointment}
          doctorId={doctorId || ''}
        />
      )}

      {showCompleteDialog && consultation && doctorId && (
        <CompleteConsultationDialog
          open={showCompleteDialog}
          onClose={() => setShowCompleteDialog(false)}
          onSuccess={handleConsultationCompleted}
          consultation={consultation}
          appointment={appointment}
          doctorId={doctorId}
        />
      )}
    </div>
  );
}
