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

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { toast } from 'sonner';
import { debounce } from 'lodash';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

// Note: Requires @tanstack/react-query
// Install: npm install @tanstack/react-query
// Also requires: npm install lodash @types/lodash for debounce

export default function ConsultationSessionPage() {
  const params = useParams();
  const router = useRouter();
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

  // Local form state (aggregated from all tabs)
  const [localNotes, setLocalNotes] = useState('');
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

        // Restore draft from localStorage if exists
        const savedDraft = localStorage.getItem(`consultation-draft-${appointmentId}`);
        if (savedDraft) {
          try {
            const draft = JSON.parse(savedDraft);
            setLocalNotes(draft.notes || '');
          } catch (e) {
            console.error('Failed to restore draft:', e);
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
    if (consultation?.notes?.fullText && !localNotes) {
      setLocalNotes(consultation.notes.fullText);
    }
  }, [consultation, localNotes]);

  // Debounced auto-save
  const debouncedSave = useMemo(
    () =>
      debounce(async (notes: string) => {
        if (!appointmentId || !user || !canSaveDraft || !consultation) return;

        setAutoSaveStatus('saving');

        if (!doctorId) {
          console.error('Doctor ID not available');
          return;
        }

        try {
          await saveDraftMutation.mutateAsync({
            appointmentId,
            doctorId,
            notes: { rawText: notes },
            versionToken: consultation.updatedAt.toISOString(),
          });

          setAutoSaveStatus('saved');
          
          // Save to localStorage as backup
          localStorage.setItem(
            `consultation-draft-${appointmentId}`,
            JSON.stringify({ notes, timestamp: new Date().toISOString() })
          );

          // Clear saved status after 2 seconds
          setTimeout(() => {
            setAutoSaveStatus('idle');
          }, 2000);
        } catch (error) {
          setAutoSaveStatus('error');
          console.error('Auto-save failed:', error);
          
          // Save to localStorage as backup
          localStorage.setItem(
            `consultation-draft-${appointmentId}`,
            JSON.stringify({ notes, timestamp: new Date().toISOString() })
          );
        }
      }, 30000), // 30 seconds
    [appointmentId, doctorId, canSaveDraft, consultation, saveDraftMutation]
  );

  // Trigger auto-save on notes change
  useEffect(() => {
    if (isConsultationActive && localNotes) {
      debouncedSave(localNotes);
    }

    return () => {
      debouncedSave.cancel();
    };
  }, [localNotes, isConsultationActive, debouncedSave]);

  // Manual save handler
  const handleSaveDraft = useCallback(async () => {
    if (!appointmentId || !doctorId || !canSaveDraft || !consultation || !localNotes.trim()) {
      return;
    }

    setAutoSaveStatus('saving');

    try {
      await saveDraftMutation.mutateAsync({
        appointmentId,
        doctorId,
        notes: { rawText: localNotes },
        versionToken: consultation.updatedAt.toISOString(),
      });

      setAutoSaveStatus('saved');
      toast.success('Draft saved');
    } catch (error) {
      setAutoSaveStatus('error');
      console.error('Save failed:', error);
    }
  }, [appointmentId, doctorId, canSaveDraft, consultation, localNotes, saveDraftMutation]);

  // Handle start consultation
  const handleStartConsultation = useCallback(() => {
    if (!appointment || appointment.status !== AppointmentStatus.SCHEDULED) {
      toast.error('Appointment must be scheduled to start consultation');
      return;
    }
    setShowStartDialog(true);
  }, [appointment]);

  // Handle consultation started
  const handleConsultationStarted = useCallback(() => {
    setShowStartDialog(false);
    // Refetch consultation
    window.location.reload(); // Simple refresh for now
  }, []);

  // Handle complete consultation
  const handleCompleteConsultation = useCallback(() => {
    if (!isConsultationActive) {
      toast.error('Consultation must be active to complete');
      return;
    }
    setShowCompleteDialog(true);
  }, [isConsultationActive]);

  // Handle consultation completed
  const handleConsultationCompleted = useCallback(() => {
    setShowCompleteDialog(false);
    // Navigate to appointments or refresh
    router.push('/doctor/appointments');
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

      {/* Main Layout - 3 Column Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Patient Info Sidebar */}
        <div className="border-r bg-muted/30 p-4">
          <PatientInfoSidebar
            patient={patient}
            appointment={appointment}
            consultationHistory={consultationHistory?.consultations}
            photoCount={consultation?.photoCount || 0}
            onViewFullProfile={() => router.push(`/doctor/patients/${patient.id}`)}
            onViewCasePlans={() => router.push(`/doctor/patients/${patient.id}/case-plans`)}
            onViewPhotos={() => router.push(`/doctor/patients/${patient.id}/photos`)}
          />
        </div>

        {/* Middle: Consultation Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          <ConsultationWorkspace
            consultation={consultation ?? null}
            onNotesChange={setLocalNotes}
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
