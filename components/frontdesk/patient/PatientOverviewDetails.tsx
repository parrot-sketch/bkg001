import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { realAddress, realEmail, realPhone } from '@/lib/utils/patientContact';

interface PatientOverviewDetailsProps {
  patient: {
    gender?: string | null;
    date_of_birth?: Date | null;
    marital_status?: string | null;
    occupation?: string | null;
    referral_source?: string | null;
    phone?: string | null;
    whatsapp_phone?: string | null;
    email?: string | null;
    address?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_number?: string | null;
    relation?: string | null;
    blood_group?: string | null;
    allergies?: string | null;
    medical_conditions?: string | null;
    medical_history?: string | null;
    insurance_provider?: string | null;
    insurance_number?: string | null;
  };
}

const humanize = (value?: string | null) =>
  value ? value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : null;

function Field({ label, value, mono, empty = 'Not provided' }: { label: string; value?: ReactNode; mono?: boolean; empty?: string }) {
  return (
    <div className="grid grid-cols-[9.5rem_1fr] gap-3 border-b border-[#e7d6bf]/70 px-5 py-2.5 last:border-b-0">
      <dt className="text-xs text-[#2c2e4b]/55">{label}</dt>
      <dd className={`min-w-0 break-words text-sm font-medium text-[#2c2e4b] ${mono ? 'font-mono' : ''}`}>
        {value || <span className="font-normal text-[#2c2e4b]/35">{empty}</span>}
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

export function PatientOverviewDetails({ patient }: PatientOverviewDetailsProps) {
  const dob = patient.date_of_birth ? format(patient.date_of_birth, 'd MMMM yyyy') : null;
  const email = realEmail(patient.email);
  const phone = realPhone(patient.phone);
  const emergencyPhone = realPhone(patient.emergency_contact_number);
  const address = realAddress(patient.address);

  return (
    <div>
      <div className="grid lg:grid-cols-2 lg:divide-x lg:divide-[#e7d6bf]">
        <Section title="Personal details">
          <Field label="Date of birth" value={dob} />
          <Field label="Gender" value={humanize(patient.gender)} />
          <Field label="Marital status" value={humanize(patient.marital_status)} />
          <Field label="Occupation" value={patient.occupation} />
          <Field label="Referral source" value={humanize(patient.referral_source)} />
          <Field
            label="Insurance"
            value={
              patient.insurance_provider
                ? `${patient.insurance_provider}${patient.insurance_number ? ` · ${patient.insurance_number}` : ''}`
                : null
            }
          />
        </Section>

        <Section title="Contact and emergency">
          <Field
            label="Phone"
            value={phone ? <a href={`tel:${phone}`} className="hover:underline">{phone}</a> : null}
            empty="No phone on file"
          />
          <Field label="WhatsApp" value={patient.whatsapp_phone} />
          <Field label="Email" value={email} />
          <Field label="Address" value={address} />
          <Field label="Emergency contact" value={patient.emergency_contact_name} />
          <Field
            label="Emergency phone"
            value={
              emergencyPhone
                ? `${emergencyPhone}${patient.relation ? ` (${humanize(patient.relation)})` : ''}`
                : null
            }
          />
        </Section>
      </div>

      <Section title="Medical overview">
        <div className="grid lg:grid-cols-2 lg:divide-x lg:divide-[#e7d6bf]">
          <div>
            <Field label="Blood group" value={patient.blood_group} />
            <Field label="Allergies" value={patient.allergies} />
          </div>
          <div>
            <Field label="Medical conditions" value={patient.medical_conditions} />
            <Field label="Medical history" value={patient.medical_history} />
          </div>
        </div>
      </Section>
    </div>
  );
}
