import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { AlertTriangle, ArrowLeft, ChevronRight, Mail, Phone, Sparkles } from "lucide-react";
import { FrontdeskPatientVisitHistory } from "@/components/frontdesk/patient/FrontdeskPatientVisitHistory";
import { PatientDetailActions } from "@/components/frontdesk/PatientDetailActions";
import { PatientProfileActions } from "@/components/frontdesk/patient/PatientProfileActions";
import { PatientProfileTabs, type PatientProfileTab } from "@/components/frontdesk/patient/PatientProfileTabs";
import { PatientOverviewDetails } from "@/components/frontdesk/patient/PatientOverviewDetails";
import { FrontdeskPatientBilling } from "@/components/frontdesk/patient/FrontdeskPatientBilling";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
    tabParam === 'visits' || tabParam === 'billing' || tabParam === 'overview'
      ? tabParam
      : visitDate ? 'visits' : 'overview';
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
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="space-y-2 rounded-xl border border-[#e7d6bf] bg-white/95 px-8 py-10 text-center">
          <p className="text-lg font-semibold text-[#2c2e4b]">
            {isNotFound ? "Patient not found" : "Unable to load patient"}
          </p>
          <p className="text-sm text-[#2c2e4b]/60">
            {isNotFound
              ? "The patient record you're looking for doesn't exist."
              : "There was a problem loading the patient data. Please try again."}
          </p>
          <Link
            href="/frontdesk/patients"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[#2c2e4b] hover:underline"
          >
            <ArrowLeft size={14} className="text-[#caa26a]" />
            Back to patients
          </Link>
        </div>
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

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
          <Link
            href="/frontdesk/patients"
            className="inline-flex items-center gap-1.5 font-medium text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft size={14} className="text-[#caa26a]" />
            Patients
          </Link>
          <ChevronRight size={14} className="shrink-0 text-white/40" />
          <span className="truncate font-medium text-white">{fullName}</span>
        </nav>
        <PatientDetailActions patient={patientDetail} />
      </div>

      {/* New patient guidance */}
      {isNewPatient && (
        <div className="flex items-start gap-3 rounded-xl border border-[#caa26a] bg-[#fcfbf8] px-4 py-3.5 shadow-sm">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#caa26a]/15">
            <Sparkles className="h-4 w-4 text-[#b8913e]" />
          </div>
          <div className="min-w-0">
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
        </div>
      )}

      {/* Identity + actions */}
      <section className="rounded-xl border border-[#e7d6bf] bg-white/95 p-5 backdrop-blur">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="h-16 w-16 shrink-0 rounded-xl border border-[#e7d6bf]">
              {data.img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.img} alt={fullName} className="h-16 w-16 rounded-xl object-cover" />
              ) : null}
              <AvatarFallback className="rounded-xl bg-[#2c2e4b] text-lg font-semibold text-[#e7d6bf]">
                {data.first_name?.[0]}{data.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-semibold tracking-tight text-[#2c2e4b] sm:text-2xl">{fullName}</h1>
                {data.file_number && (
                  <span className="rounded-md border border-[#e7d6bf] bg-[#e7d6bf]/20 px-2 py-0.5 font-mono text-xs font-semibold text-[#2c2e4b]">
                    {data.file_number}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-[#2c2e4b]/60">
                {[data.gender && data.gender.charAt(0) + data.gender.slice(1).toLowerCase(), age !== null && `${age} years`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                {phone ? (
                  <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 text-[#2c2e4b] hover:underline">
                    <Phone className="h-3.5 w-3.5 text-[#caa26a]" />
                    {phone}
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-amber-700">
                    <Phone className="h-3.5 w-3.5" />
                    No phone on file
                  </span>
                )}
                {email && (
                  <a href={`mailto:${email}`} className="inline-flex min-w-0 items-center gap-1.5 text-[#2c2e4b] hover:underline">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-[#caa26a]" />
                    <span className="truncate">{email}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          <PatientProfileActions patientId={data.id} patientName={fullName} className="lg:shrink-0" />
        </div>

        {allergies && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p><span className="font-semibold">Allergies:</span> {allergies}</p>
          </div>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#e7d6bf] bg-[#e7d6bf] sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white px-4 py-2.5">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#2c2e4b]/50">{stat.label}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-[#2c2e4b] tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

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
        billing={<FrontdeskPatientBilling patientId={id} />}
      />
    </div>
  );
};

export default FrontdeskPatientProfile;
