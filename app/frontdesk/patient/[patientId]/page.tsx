import { Suspense } from "react";
import { PatientOverviewPanel } from "@/components/patient/PatientOverviewPanel";
import { getPatientFullDataById } from "@/utils/services/patient";
import { getCurrentUser } from "@/lib/auth/server-auth";
import { container } from "@/lib/container";
import { PatientDetailActions } from "@/components/frontdesk/PatientDetailActions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { calculateAge } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const dynamic = "force-dynamic";

interface ParamsProps {
  params: Promise<{ patientId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

const FrontdeskPatientProfile = async (props: ParamsProps) => {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const id = params.patientId;

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

  try {
    const result = await getPatientFullDataById(id);
    data = result.data;
    success = result.success;
    status = result.status ?? 500;
  } catch (error) {
    console.error('[PatientProfile] Error loading patient:', error);
    data = null;
    success = false;
    status = 500;
  }

  if (!success || !data) {
    const isNotFound = status === 404;
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-foreground">
            {isNotFound ? "Patient not found" : "Unable to load patient"}
          </p>
          <p className="text-sm text-muted-foreground">
            {isNotFound
              ? "The patient record you're looking for doesn't exist."
              : "There was a problem loading the patient data. Please try again."}
          </p>
          <Link
            href="/frontdesk/patients"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-2"
          >
            <ArrowLeft size={14} />
            Back to Patients
          </Link>
        </div>
      </div>
    );
  }

  const fullName = `${data.first_name} ${data.last_name}`;
  const ageLabel = data.date_of_birth ? `${calculateAge(data.date_of_birth)} yrs` : undefined;

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
    totalAppointments: data.totalAppointments,
    lastVisitAt: data.lastVisit?.toISOString() ?? null,
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between bg-white/95 backdrop-blur border border-[#e7d6bf] rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            href="/frontdesk/patients"
            className="inline-flex items-center gap-1.5 text-sm text-[#2c2e4b]/70 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/30 px-2.5 py-1.5 rounded-lg border border-[#e7d6bf] transition-colors bg-white font-medium"
          >
            <ArrowLeft size={14} className="text-[#caa26a]" />
            Back
          </Link>
        </div>
        <PatientDetailActions patient={patientDetail} />
      </div>

      <div className="bg-white/95 backdrop-blur border border-[#e7d6bf] rounded-xl px-5 py-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 rounded-lg border border-[#e7d6bf] shrink-0">
            {data.img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.img} alt={fullName} className="h-14 w-14 rounded-lg object-cover" />
            ) : null}
            <AvatarFallback className="rounded-lg bg-[#e7d6bf] text-[#2c2e4b] text-sm font-semibold">
              {data.first_name?.[0]}{data.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-[#2c2e4b] truncate">{fullName}</h1>
              {data.file_number ? (
                <span className="inline-flex items-center font-mono text-xs font-medium text-[#2c2e4b] bg-[#e7d6bf]/15 border border-[#e7d6bf] px-2 py-0.5 rounded">
                  {data.file_number}
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#2c2e4b]/60">
              {data.gender ? <span className="capitalize">{data.gender.toLowerCase()}</span> : null}
              {data.gender && ageLabel ? <span className="text-[#e7d6bf]">|</span> : null}
              {ageLabel ? <span>{ageLabel}</span> : null}
              {data.phone ? (
                <>
                  <span className="text-[#e7d6bf]">|</span>
                  <span>{data.phone}</span>
                </>
              ) : null}
              {data.email ? (
                <>
                  <span className="text-[#e7d6bf]">|</span>
                  <span className="truncate">{data.email}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white/95 backdrop-blur border border-[#e7d6bf] rounded-xl px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2c2e4b]/50">Appointments</p>
          <p className="mt-1 text-base font-semibold text-[#2c2e4b] tracking-tight">{data.totalAppointments ?? 0}</p>
        </div>
        <div className="bg-white/95 backdrop-blur border border-[#e7d6bf] rounded-xl px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2c2e4b]/50">Last visit</p>
          <p className="mt-1 text-base font-semibold text-[#2c2e4b] tracking-tight">
            {data.lastVisit ? format(data.lastVisit, "MMM d, yyyy") : "—"}
          </p>
        </div>
        <div className="bg-white/95 backdrop-blur border border-[#e7d6bf] rounded-xl px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2c2e4b]/50">Blood group</p>
          <p className="mt-1 text-base font-semibold text-[#2c2e4b] tracking-tight">{data.blood_group ?? "—"}</p>
        </div>
        <div className="bg-white/95 backdrop-blur border border-[#e7d6bf] rounded-xl px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2c2e4b]/50">Registered</p>
          <p className="mt-1 text-base font-semibold text-[#2c2e4b] tracking-tight">
            {data.created_at ? format(data.created_at, "MMM d, yyyy") : "—"}
          </p>
        </div>
      </div>

      <PatientOverviewPanel
        patient={{
          gender: data.gender,
          date_of_birth: data.date_of_birth,
          phone: data.phone,
          marital_status: data.marital_status,
          occupation: data.occupation,
          referral_source: data.referral_source,
          blood_group: data.blood_group,
          address: data.address,
          whatsapp_phone: data.whatsapp_phone,
          emergency_contact_name: data.emergency_contact_name,
          emergency_contact_number: data.emergency_contact_number,
          relation: data.relation,
          allergies: data.allergies,
          medical_conditions: data.medical_conditions,
          medical_history: data.medical_history,
        }}
        patientId={id}
        patientName={fullName}
      />
    </div>
  );
};

export default FrontdeskPatientProfile;
