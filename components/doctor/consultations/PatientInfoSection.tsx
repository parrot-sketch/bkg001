'use client';

import { format } from 'date-fns';

interface PatientInfoSectionProps {
  patient: {
    id?: string;
    firstName: string;
    lastName: string;
    fileNumber?: string | null;
    gender?: string | null | undefined;
    dateOfBirth?: string | Date | null | undefined;
    phone?: string | null | undefined;
    email?: string | null | undefined;
    img?: string | null;
    allergies?: string | null;
  };
  appointment: {
    type: string;
    outcomeType?: string | null | undefined;
  };
  hasSurgicalCase: boolean;
  isSurgicalPlanComplete?: boolean | undefined;
}

export function PatientInfoSection({
  patient,
  appointment,
  hasSurgicalCase,
  isSurgicalPlanComplete,
}: PatientInfoSectionProps) {
  const birthDate = patient.dateOfBirth ? new Date(patient.dateOfBirth) : null;
  const today = new Date();
  const patientAge = birthDate
    ? today.getFullYear() - birthDate.getFullYear()
    : null;

  return (
    <div className="border-2 border-[#e7d6bf] mb-8">
      <div className="bg-[#e7d6bf]/40 px-4 sm:px-6 py-2 border-b border-[#e7d6bf]">
        <h2 className="font-semibold text-[#2c2e4b] flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-[#caa26a]" />
          PATIENT INFORMATION
        </h2>
      </div>
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label="Patient Name" value={`${patient.firstName} ${patient.lastName}`} />
          <Field label="File No." value={patient.fileNumber || 'N/A'} mono />
          <Field label="Gender" value={patient.gender || 'Not specified'} capitalize />
          <Field label="Age" value={patientAge !== null ? `${patientAge} years` : 'N/A'} />
          {patient.phone && (
            <Field label="Phone" value={patient.phone} />
          )}
          <Field label="Appointment Type" value={appointment.type} />
          {appointment.outcomeType && (
            <Field label="Outcome" value={appointment.outcomeType.replace(/_/g, ' ')} />
          )}
          {hasSurgicalCase && (
            <div>
              <p className="text-xs text-[#2c2e4b]/60 uppercase tracking-wider">Surgical Case</p>
              <div className="mt-1">
                {isSurgicalPlanComplete ? (
                  <span className="inline-flex items-center rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-medium border border-emerald-200">
                    <CheckCircleIcon className="h-3 w-3 mr-1" />
                    Plan Complete
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-medium border border-amber-200">
                    Plan Incomplete
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  capitalize,
}: {
  label: string;
  value: string;
  mono?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-[#2c2e4b]/60 uppercase tracking-wider">{label}</p>
      <p className={`font-semibold text-[#2c2e4b] mt-1 ${mono ? 'font-mono' : ''} ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </p>
    </div>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 6v11.25a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
