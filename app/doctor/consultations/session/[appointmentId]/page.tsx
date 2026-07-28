import { getCurrentUser } from '@/lib/auth/server-auth';
import { redirect } from 'next/navigation';
import { getConsultationPatientData } from '@/actions/doctor/get-consultation-patient';
import { SessionProvider } from '@/providers/session/SessionProvider';
import { ConsultationProvider } from '@/contexts/ConsultationContext';
import { ConsultationSessionContent } from './ConsultationSessionContent';
import type { SerializedSessionData } from '@/infrastructure/factories/ConsultationSessionFactory';

interface PageProps {
  params: Promise<{ appointmentId: string }>;
}

import type { ConsultationPatientData } from '@/actions/doctor/get-consultation-patient';

function buildEmptySession(): SerializedSessionData {
  return {
    appointment: {
      id: 0,
      patientId: '',
      doctorId: '',
      appointmentDate: '',
      time: '',
      status: '',
      type: '',
      note: undefined,
      reason: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      checkedInAt: undefined,
      checkedInBy: undefined,
      consultationStartedAt: undefined,
      consultationEndedAt: undefined,
      consultationDuration: undefined,
      reviewedAt: undefined,
      patient: undefined,
      doctor: undefined,
    },
    patient: {
      id: '',
      fileNumber: '',
      firstName: '',
      lastName: '',
      fullName: '',
      dateOfBirth: '',
      age: 0,
      gender: '',
      email: '',
      phone: '',
      whatsappPhone: undefined,
      address: undefined,
      occupation: undefined,
      maritalStatus: undefined,
      emergencyContactName: undefined,
      emergencyContactNumber: undefined,
      relation: undefined,
      bloodGroup: undefined,
      allergies: undefined,
      medicalConditions: undefined,
      medicalHistory: undefined,
      insuranceProvider: undefined,
      insuranceNumber: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      profileImage: undefined,
      colorCode: undefined,
      lastVisitDate: undefined,
      assignedAt: undefined,
      visitCount: undefined,
    },
    vitals: null,
    consultation: null,
    doctorId: '',
    workflowState: 'IDLE',
    isDirty: false,
    draftAvailable: false,
    notes: {},
    outcomeType: null,
    patientDecision: null,
  };
}

function buildInitialSession(data: ConsultationPatientData): SerializedSessionData {
  const patient = data.patient;
  const appointment = data.appointment;
  const fullName = `${patient.firstName} ${patient.lastName}`;

  const consultationNotes = data.consultation?.notes?.structured
    ? {
        chiefComplaint: data.consultation.notes.structured.chiefComplaint ?? '',
        examination: data.consultation.notes.structured.examination ?? '',
        assessment: data.consultation.notes.structured.assessment ?? '',
        plan: data.consultation.notes.structured.plan ?? '',
      }
    : {};

  return {
    appointment: {
      id: appointment.id,
      patientId: patient.id,
      doctorId: appointment.doctorId,
      appointmentDate: appointment.appointmentDate,
      time: appointment.time,
      status: appointment.status,
      type: appointment.type,
      note: undefined,
      reason: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      checkedInAt: undefined,
      checkedInBy: undefined,
      consultationStartedAt: undefined,
      consultationEndedAt: undefined,
      consultationDuration: undefined,
      reviewedAt: undefined,
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        fullName,
        fileNumber: patient.fileNumber,
        dateOfBirth: patient.dateOfBirth ?? '',
        gender: patient.gender ?? '',
        phone: patient.phone ?? undefined,
        profileImage: undefined,
      },
      doctor: undefined,
    },
    patient: {
      id: patient.id,
      fileNumber: patient.fileNumber,
      firstName: patient.firstName,
      lastName: patient.lastName,
      fullName,
      dateOfBirth: patient.dateOfBirth ?? '',
      age: patient.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 86400000)) : 0,
      gender: patient.gender ?? '',
      email: patient.email ?? '',
      phone: patient.phone ?? '',
      whatsappPhone: undefined,
      address: patient.address ?? undefined,
      occupation: undefined,
      maritalStatus: undefined,
      emergencyContactName: patient.emergencyContactName ?? undefined,
      emergencyContactNumber: patient.emergencyContactNumber ?? undefined,
      relation: patient.relation ?? undefined,
      bloodGroup: patient.bloodGroup ?? undefined,
      allergies: patient.allergies ?? undefined,
      medicalConditions: patient.medicalConditions ?? undefined,
      medicalHistory: undefined,
      insuranceProvider: undefined,
      insuranceNumber: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      profileImage: undefined,
      colorCode: undefined,
      lastVisitDate: undefined,
      assignedAt: undefined,
      visitCount: undefined,
    },
    vitals: data.vitals ?? null,
    consultation: data.consultation
      ? {
          id: data.consultation.id,
          appointmentId: appointment.id,
          doctorId: '',
          userId: undefined,
          state: data.consultation.state,
          startedAt: undefined,
          completedAt: undefined,
          durationMinutes: undefined,
          notes: data.consultation.notes ?? undefined,
          outcomeType: data.consultation.outcomeType as any,
          patientDecision: data.consultation.patientDecision as any,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          followUp: undefined,
        }
      : null,
    doctorId: appointment.doctorId,
    workflowState: data.consultation ? 'ACTIVE' : 'READY',
    isDirty: false,
    draftAvailable: false,
    notes: consultationNotes,
    outcomeType: data.consultation?.outcomeType as any ?? null,
    patientDecision: data.consultation?.patientDecision as any ?? null,
  };
}

export default async function ConsultationSessionPage({ params }: PageProps) {
  const resolvedParams = await params;
  const appointmentId = parseInt(resolvedParams.appointmentId, 10);

  if (isNaN(appointmentId)) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fcfbf8]">
        <div className="text-center p-8 bg-white border border-[#e7d6bf] rounded-2xl shadow-sm max-w-md">
          <h2 className="text-lg font-bold text-[#2c2e4b] mb-2">Invalid Appointment</h2>
          <p className="text-sm text-[#2c2e4b]/70">The appointment ID in the URL is not valid.</p>
        </div>
      </div>
    );
  }

  const authUser = await getCurrentUser();
  if (!authUser) {
    redirect('/login');
  }

  const result = await getConsultationPatientData(appointmentId);
  console.log('[PAGE DEBUG] getConsultationPatientData result=', JSON.stringify(result).slice(0, 500));
  const initialSession = result.success ? buildInitialSession(result.data) : buildEmptySession();

  const user = {
    id: authUser.userId,
    email: authUser.email,
    role: authUser.role,
    name: authUser.email.split('@')[0],
  };

  return (
    <SessionProvider initialSession={initialSession} user={user} restoredDraft={false}>
      <ConsultationProvider initialAppointmentId={appointmentId}>
        <ConsultationSessionContent />
      </ConsultationProvider>
    </SessionProvider>
  );
}
