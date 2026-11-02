import { Suspense } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { FrontdeskPatientVisitHistory } from "@/components/frontdesk/patient/FrontdeskPatientVisitHistory";
import { PatientDetailActions } from "@/components/frontdesk/PatientDetailActions";
import { PatientProfileActions } from "@/components/frontdesk/patient/PatientProfileActions";
import { PatientProfileTabs, type PatientProfileTab } from "@/components/frontdesk/patient/PatientProfileTabs";
import { PatientOverviewDetails } from "@/components/frontdesk/patient/PatientOverviewDetails";
import { FrontdeskPatientBilling } from "@/components/frontdesk/patient/FrontdeskPatientBilling";
import { DoctorConsultationChargeSheet } from "@/app/doctor/patients/[patientId]/components/DoctorConsultationChargeSheet";
import { getPatientFullDataById } from "@/utils/services/patient";
import { getFrontdeskPatientVisitHistory } from "@/utils/services/patient-visits";
import { getCurrentUser } from "@/lib/auth/server-auth";
import { container } from "@/lib/container";
import { db } from "@/lib/db";
import { calculateAge } from "@/lib/utils";
import { realEmail, realPhone } from "@/lib/utils/patientContact";

export const dynamic = "force-dynamic";

const NEW_PATIENT_WINDOW_MS = 48 * 60 * 60 * 1000;

interface ParamsProps {
  params: Promise<{ patientId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

const FrontdeskPatientProfile = async (props: ParamsProps) => {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const id = params.patientId;
  const visitDateParam = searchParams?.visitDate;
  const visitDate =
    typeof visitDateParam === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(visitDateParam)
      ? visitDateParam
      : null;
  const tabParam = searchParams?.tab;
  const defaultTab: PatientProfileTab =
    tabParam === 'visits' || tabParam === 'billing' || tabParam === 'overview' || tabParam === 'charges'
      ? tabParam
      : visitDate ? 'visits' : 'overview';
  const appointmentParam = searchParams?.appointmentId;
  const chargeAppointmentId =
    typeof appointmentParam === 'string' && /^\d+$/.test(appointmentParam)
      ? Number(appointmentParam)
      : null;
  const fromIntake = searchParams?.from === 'intake';

  const user = await getCurrentUser();

  if (user) {
    try {
      await container.auditLogger.logPatientAccess(
        { userId: user.userId },
        id,
        'VIEW',
      );
    } catch {
      // Audit failure must never block the page
    }
  }

  let data;
  let success = false;
  let status = 500;
  let visitSummary = {
    totalVisits: 0,
    completedVisits: 0,
    upcomingVisits: 0,
    lastVisitAt: null as Date | null,
    selectedDate: null as string | null,
    visits: [] as Awaited<ReturnType<typeof getFrontdeskPatientVisitHistory>>['visits'],
  };
  let intakeSubmittedAt: Date | null = null;

  try {
    const [result, visits, intake] = await Promise.all([
      getPatientFullDataById(id),
      getFrontdeskPatientVisitHistory(id, { date: visitDate }),
      db.intakeSubmission.findFirst({
        where: { created_patient_id: id },
        select: { submitted_at: true },
      }),
    ]);
    data = result.data;
    success = result.success;
    status = result.status ?? 500;
    visitSummary = visits;
    intakeSubmittedAt = intake?.submitted_at ?? null;
  } catch (error) {
    console.error('[PatientProfile] Error loading patient:', error);
    data = null;
    success = false;
    status = 500;
  }

  if (!success || !data) {
    const isNotFound = status === 404;
    return (
      <div className="bg-white px-6 py-10 text-[#2c2e4b]">
        <Link href="/frontdesk/patients" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2c2e4b] hover:underline">
          <ArrowLeft size={14} />
          Patients
        </Link>
        <p className="mt-6 text-lg font-semibold">
          {isNotFound ? "Patient not found" : "Unable to load patient"}
        </p>
        <p className="mt-1 text-sm text-[#2c2e4b]/60">
          {isNotFound
            ? "The patient record you're looking for doesn't exist."
            : "There was a problem loading the patient data. Please try again."}
        </p>
      </div>
    );
  }

  const fullName = `${data.first_name} ${data.last_name}`;
  const age = data.date_of_birth ? calculateAge(data.date_of_birth) : null;
  const email = realEmail(data.email);
  const phone = realPhone(data.phone);
  const allergies = data.allergies?.trim();
  const registeredAt = intakeSubmittedAt ?? data.created_at;
  const isNewPatient =
    visitSummary.totalVisits === 0 &&
    (fromIntake || Date.now() - new Date(registeredAt).getTime() < NEW_PATIENT_WINDOW_MS);

  const patientDetail = {
    id: data.id,
    fileNumber: data.file_number,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    phone: data.phone,
    whatsappPhone: data.whatsapp_phone ?? undefined,
    dateOfBirth: data.date_of_birth.toISOString(),
    gender: data.gender,
    address: data.address ?? undefined,
    maritalStatus: data.marital_status ?? undefined,
    occupation: data.occupation ?? undefined,
    bloodGroup: data.blood_group ?? undefined,
    allergies: data.allergies ?? undefined,
    medicalConditions: data.medical_conditions ?? undefined,
    medicalHistory: data.medical_history ?? undefined,
    emergencyContactName: data.emergency_contact_name ?? undefined,
    emergencyContactNumber: data.emergency_contact_number ?? undefined,
    relation: data.relation ?? undefined,
    referralSource: data.referral_source ?? undefined,
    profileImage: data.img ?? undefined,
    colorCode: data.colorCode ?? undefined,
    createdAt: data.created_at.toISOString(),
    updatedAt: data.updated_at.toISOString(),
    totalAppointments: visitSummary.totalVisits,
    lastVisitAt: visitSummary.lastVisitAt?.toISOString() ?? null,
  };

  const stats = [
    { label: 'Visits', value: String(visitSummary.totalVisits) },
    { label: 'Upcoming', value: String(visitSummary.upcomingVisits) },
    { label: 'Last visit', value: visitSummary.lastVisitAt ? format(visitSummary.lastVisitAt, 'd MMM yyyy') : '—' },
    { label: 'Registered', value: format(registeredAt, 'd MMM yyyy') },
  ];

  const identity = [
    data.gender && data.gender.charAt(0) + data.gender.slice(1).toLowerCase(),
    age && age !== 'N/A' ? age : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="bg-white text-[#2c2e4b]">
      <header className="bg-[#2c2e4b] px-6 py-5 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Link
              href="/frontdesk/patients"
              className="inline-flex items-center text-sm font-medium text-white/80 hover:text-white"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Patients
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{fullName}</h1>
              {data.file_number && (
                <span className="border border-white/30 bg-white/10 px-2.5 py-1 font-mono text-xs font-semibold tracking-wide">
                  {data.file_number}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-white/80">
              {identity}
              {identity && (phone || email) ? ' · ' : ''}
              {phone ? (
                <a href={`tel:${phone}`} className="hover:underline">{phone}</a>
              ) : (
                <span className="text-[#caa26a]">No phone on file</span>
              )}
              {email ? (
                <>
                  {' · '}
                  <a href={`mailto:${email}`} className="hover:underline">{email}</a>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <PatientDetailActions patient={patientDetail} />
            <PatientProfileActions patientId={data.id} patientName={fullName} />
          </div>
        </div>
      </header>

      {isNewPatient && (
        <div className="border-b border-[#caa26a] bg-[#e7d6bf]/30 px-6 py-3">
          <p className="text-sm font-semibold text-[#2c2e4b]">
            New patient{intakeSubmittedAt ? ', registered via the intake form' : ''}{' '}
            <span className="font-normal text-[#2c2e4b]/60">
              {formatDistanceToNow(registeredAt, { addSuffix: true })}
            </span>
          </p>
          <p className="mt-0.5 text-sm text-[#2c2e4b]/70">
            Next step: add {data.first_name} to a doctor&apos;s queue if they&apos;re being seen today, or book an
            appointment for a later date.
          </p>
        </div>
      )}

      {allergies && (
        <div className="border-b border-[#9b2226]/25 bg-[#9b2226]/5 px-6 py-3 text-sm text-[#9b2226]">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Allergies</span>
          <p className="mt-0.5 font-medium">{allergies}</p>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-px bg-[#e7d6bf] sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-[#e7d6bf]/30 px-5 py-4">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#005f73]">{stat.label}</dt>
            <dd className="mt-1 text-base font-semibold text-[#2c2e4b] tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <Suspense fallback={null}>
      <PatientProfileTabs
        defaultTab={defaultTab}
        visitCount={visitSummary.totalVisits}
        overview={
          <PatientOverviewDetails
            patient={{
              gender: data.gender,
              date_of_birth: data.date_of_birth,
              marital_status: data.marital_status,
              occupation: data.occupation,
              referral_source: data.referral_source,
              phone: data.phone,
              whatsapp_phone: data.whatsapp_phone,
              email: data.email,
              address: data.address,
              emergency_contact_name: data.emergency_contact_name,
              emergency_contact_number: data.emergency_contact_number,
              relation: data.relation,
              blood_group: data.blood_group,
              allergies: data.allergies,
              medical_conditions: data.medical_conditions,
              medical_history: data.medical_history,
              insurance_provider: data.insurance_provider,
              insurance_number: data.insurance_number,
            }}
          />
        }
        visits={
          <FrontdeskPatientVisitHistory
            patientId={id}
            visits={visitSummary.visits}
            totalVisits={visitSummary.totalVisits}
            selectedDate={visitSummary.selectedDate}
          />
        }
        charges={
          <DoctorConsultationChargeSheet
            visits={visitSummary.visits.map((visit) => ({
              id: visit.id,
              date: visit.date.toISOString(),
              type: visit.type,
              doctor: visit.doctorName ? { name: visit.doctorName } : null,
            }))}
            isLoading={false}
            initialAppointmentId={chargeAppointmentId}
          />
        }
        billing={<FrontdeskPatientBilling patientId={id} />}
      />
      </Suspense>
    </div>
  );
};

export default FrontdeskPatientProfile;
