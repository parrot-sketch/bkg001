import type { ReactNode } from 'react';
import { format } from 'date-fns';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { calculateAge } from '@/lib/utils';

function humanize(value?: string | null) {
  if (!value) return null;
  return value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function Field({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="grid grid-cols-[9.5rem_1fr] gap-3 border-b border-[#e7d6bf]/70 px-5 py-2.5 last:border-b-0">
      <dt className="text-xs text-[#2c2e4b]/55">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium text-[#2c2e4b]">
        {value || <span className="font-normal text-[#2c2e4b]/35">Not recorded</span>}
      </dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-[#e7d6bf] last:border-b-0">
      <h2 className="border-b-2 border-[#2c2e4b] bg-[#e7d6bf]/30 px-5 py-2.5 text-sm font-semibold text-[#2c2e4b]">{title}</h2>
      <dl>{children}</dl>
    </section>
  );
}

export function DoctorPatientRecord({ patient }: { patient: PatientResponseDto }) {
  const dob = patient.dateOfBirth ? format(new Date(patient.dateOfBirth), 'd MMMM yyyy') : null;
  const age = patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : null;

  return (
    <div>
      <div className="grid lg:grid-cols-2 lg:divide-x lg:divide-[#e7d6bf]">
        <Section title="Clinical">
          <Field label="Age" value={age} />
          <Field label="Date of birth" value={dob} />
          <Field label="Sex" value={humanize(patient.gender)} />
          <Field label="Blood group" value={patient.bloodGroup} />
          <Field label="Allergies" value={patient.allergies} />
          <Field label="Conditions" value={patient.medicalConditions} />
          <Field label="History" value={patient.medicalHistory} />
        </Section>
        <Section title="Contact">
          <Field
            label="Phone"
            value={patient.phone ? <a href={`tel:${patient.phone}`} className="hover:underline">{patient.phone}</a> : null}
          />
          <Field label="WhatsApp" value={patient.whatsappPhone} />
          <Field
            label="Email"
            value={patient.email ? <a href={`mailto:${patient.email}`} className="hover:underline">{patient.email}</a> : null}
          />
          <Field label="Address" value={patient.address} />
          <Field label="Occupation" value={patient.occupation} />
          <Field label="Emergency contact" value={patient.emergencyContactName} />
          <Field
            label="Emergency phone"
            value={
              patient.emergencyContactNumber
                ? `${patient.emergencyContactNumber}${patient.relation ? ` (${humanize(patient.relation)})` : ''}`
                : null
            }
          />
          <Field
            label="Insurance"
            value={
              patient.insuranceProvider
                ? `${patient.insuranceProvider}${patient.insuranceNumber ? ` · ${patient.insuranceNumber}` : ''}`
                : null
            }
          />
        </Section>
      </div>
    </div>
  );
}
