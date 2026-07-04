'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { ConsultationRecord } from '@/components/doctor/consultations/types';
import { DocumentHeader } from '@/components/doctor/consultations/DocumentHeader';
import { DocumentFooter } from '@/components/doctor/consultations/DocumentFooter';
import { PatientInfoSection } from '@/components/doctor/consultations/PatientInfoSection';
import { ClinicalNotesSection } from '@/components/doctor/consultations/ClinicalNotesSection';
import { ChargeSheetSection } from '@/components/doctor/consultations/ChargeSheetSection';
import { SurgicalCaseActions } from '@/components/doctor/consultations/SurgicalCaseActions';
import { Calendar } from 'lucide-react';

interface ConsultationDetailPageContentProps {
  recordData: ConsultationRecord;
}

export default function ConsultationDetailPageContent({ recordData }: ConsultationDetailPageContentProps) {
  const handlePrint = useCallback(() => {
    const printUrl = `/doctor/consultations/${recordData.id}/print`;
    window.open(printUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
  }, [recordData.id]);

  const patient = recordData.appointment.patient as {
    id?: string | undefined;
    firstName: string;
    lastName: string;
    fileNumber?: string | null | undefined;
    gender?: string | null | undefined;
    dateOfBirth?: string | Date | null | undefined;
    phone?: string | null | undefined;
    email?: string | null | undefined;
    img?: string | null;
    allergies?: string | null;
  };

  const clinicalNotes = [
    { title: 'Subjective', content: recordData.chiefComplaint, icon: 'user' as const },
    { title: 'Objective', content: recordData.examination, icon: 'activity' as const },
    { title: 'Assessment', content: recordData.assessment, icon: 'clipboard' as const },
    { title: 'Plan', content: recordData.plan, icon: 'fileText' as const },
  ];

  return (
    <div className="min-h-screen bg-white">
      <DocumentHeader
        recordId={recordData.id}
        appointmentDate={recordData.appointment.appointmentDate}
        time={recordData.appointment.time}
        durationMinutes={recordData.durationMinutes}
        onPrint={handlePrint}
      />

      <PatientInfoSection
        patient={patient}
        appointment={recordData.appointment}
        hasSurgicalCase={recordData.hasSurgicalCase}
        isSurgicalPlanComplete={recordData.isSurgicalPlanComplete}
      />

      <ClinicalNotesSection notes={clinicalNotes} />

      <ChargeSheetSection payment={recordData.payment} appointmentId={recordData.appointmentId} />

      {recordData.hasSurgicalCase && recordData.surgicalCaseId && (
        <SurgicalCaseActions
          surgicalCaseId={recordData.surgicalCaseId}
          isSurgicalPlanComplete={recordData.isSurgicalPlanComplete}
        />
      )}

      {/* Action Buttons - Hidden on Print */}
      {patient && (
        <div className="print:hidden flex flex-wrap gap-3 justify-end pt-4 border-t border-[#e7d6bf]">
          <Link
            href={`/doctor/appointments/new?patientId=${patient.id}&type=Follow-up&source=DOCTOR_FOLLOW_UP&parentConsultationId=${recordData.id}&parentAppointmentId=${recordData.appointmentId}`}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-[#e7d6bf] bg-white text-[#2c2e4b] hover:bg-[#e7d6bf]/30 transition-colors"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Follow-up
          </Link>
        </div>
      )}

      <DocumentFooter generatedAt={recordData.completedAt ? new Date(recordData.completedAt) : undefined} />
    </div>
  );
}
