import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { HeartPulse, PhoneCall, UserRound } from 'lucide-react';
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
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#2c2e4b]/50">{label}</dt>
      <dd className={`mt-0.5 break-words text-sm text-[#2c2e4b] ${mono ? 'font-mono' : ''}`}>
        {value || <span className="text-[#2c2e4b]/30">{empty}</span>}
      </dd>
    </div>
  );
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#e7d6bf] bg-white/95 backdrop-blur">
      <header className="flex items-center gap-2 border-b border-[#e7d6bf]/70 px-5 py-3">
        <span className="text-[#caa26a]">{icon}</span>
        <h2 className="text-sm font-semibold text-[#2c2e4b]">{title}</h2>
      </header>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2">{children}</dl>
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
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Section icon={<UserRound className="h-4 w-4" />} title="Personal details">
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

      <Section icon={<PhoneCall className="h-4 w-4" />} title="Contact & emergency">
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

      <div className="xl:col-span-2">
        <Section icon={<HeartPulse className="h-4 w-4" />} title="Medical overview">
          <Field label="Blood group" value={patient.blood_group} />
          <Field label="Allergies" value={patient.allergies} />
          <Field label="Medical conditions" value={patient.medical_conditions} />
          <Field label="Medical history" value={patient.medical_history} />
        </Section>
      </div>
    </div>
  );
}
