import { Suspense } from "react";
import { PatientProfileTabs } from "@/components/patient/PatientProfileTabs";
import { PatientOverviewPanel } from "@/components/patient/PatientOverviewPanel";
import { FrontdeskPatientSidebar } from "@/components/patient/FrontdeskPatientSidebar";
import { PatientAppointmentsPanel } from "@/components/patient/PatientAppointmentsPanel";
import { PatientBillingPanel } from "@/components/patient/PatientBillingPanel";
import { getPatientFullDataById } from "@/utils/services/patient";
import { getCurrentUser } from "@/lib/auth/server-auth";
import { container } from "@/lib/container";
import { PatientDetailActions } from "@/components/frontdesk/PatientDetailActions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { calculateAge } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface ParamsProps {
  params: Promise<{ patientId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

function PatientLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>
      <div className="h-48 bg-slate-200 rounded-xl animate-pulse" />
      <div className="border rounded-xl p-6 space-y-4">
        <div className="h-10 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-32 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

const FrontdeskPatientProfile = async (props: ParamsProps) => {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const id = params.patientId;
  const cat = (searchParams?.cat as string) || "overview";

  // Server-side auth check
  const user = await getCurrentUser();

  // HIPAA audit: log who viewed this patient's full record
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

  // Build PatientDetailDto for the edit dialog
  const patientDetail = {
    id: data.id,
    fileNumber: data.file_number,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    phone: data.phone,
    dateOfBirth: data.date_of_birth.toISOString(),
    gender: data.gender,
    address: data.address ?? undefined,
    maritalStatus: data.marital_status ?? undefined,
    bloodGroup: data.blood_group ?? undefined,
    allergies: data.allergies ?? undefined,
    medicalConditions: data.medical_conditions ?? undefined,
    medicalHistory: data.medical_history ?? undefined,
    emergencyContactName: data.emergency_contact_name ?? undefined,
    emergencyContactNumber: data.emergency_contact_number ?? undefined,
    relation: data.relation ?? undefined,
    profileImage: data.img ?? undefined,
    colorCode: data.colorCode ?? undefined,
    createdAt: data.created_at.toISOString(),
    updatedAt: data.updated_at.toISOString(),
    totalAppointments: data.totalAppointments,
    lastVisitAt: data.lastVisit?.toISOString() ?? null,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Clinical Header Card */}
      <div className="flex flex-col gap-4 border border-[#e7d6bf] bg-white p-5 rounded-xl shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#2c2e4b] truncate">{fullName}</h1>
              {data.file_number ? (
                <span className="inline-flex items-center font-mono text-xs font-medium text-[#2c2e4b] bg-[#e7d6bf]/15 border border-[#e7d6bf] px-2 py-0.5 rounded">
                  {data.file_number}
                </span>
              ) : null}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#2c2e4b]/60">
              {data.gender ? <span className="capitalize">{data.gender.toLowerCase()}</span> : null}
              {data.gender && ageLabel ? <span className="text-[#e7d6bf]">·</span> : null}
              {ageLabel ? <span>{ageLabel}</span> : null}
              {data.phone ? (
                <>
                  <span className="text-[#e7d6bf]">·</span>
                  <span>{data.phone}</span>
                </>
              ) : null}
              {data.email ? (
                <>
                  <span className="text-[#e7d6bf]">·</span>
                  <span className="truncate">{data.email}</span>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PatientDetailActions patient={patientDetail} />
            <Link
              href="/frontdesk/patients"
              className="inline-flex items-center gap-1.5 text-xs text-[#2c2e4b]/60 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/30 px-2.5 py-1.5 rounded-lg border border-[#e7d6bf] transition-colors bg-white font-medium shadow-sm"
            >
              <ArrowLeft size={14} className="text-[#caa26a]" />
              Back
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="border border-[#e7d6bf] bg-white rounded-lg p-3 shadow-sm transition-all hover:border-[#caa26a]/60">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2c2e4b]/50">Appointments</p>
            <p className="mt-1 text-base font-semibold text-[#2c2e4b] tracking-tight">{data.totalAppointments ?? 0}</p>
          </div>
          <div className="border border-[#e7d6bf] bg-white rounded-lg p-3 shadow-sm transition-all hover:border-[#caa26a]/60">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2c2e4b]/50">Last visit</p>
            <p className="mt-1 text-base font-semibold text-[#2c2e4b] tracking-tight">
              {data.lastVisit ? format(data.lastVisit, "MMM d, yyyy") : "—"}
            </p>
          </div>
          <div className="border border-[#e7d6bf] bg-white rounded-lg p-3 shadow-sm transition-all hover:border-[#caa26a]/60">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2c2e4b]/50">Blood group</p>
            <p className="mt-1 text-base font-semibold text-[#2c2e4b] tracking-tight">{data.blood_group ?? "—"}</p>
          </div>
          <div className="border border-[#e7d6bf] bg-white rounded-lg p-3 shadow-sm transition-all hover:border-[#caa26a]/60">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2c2e4b]/50">Registered</p>
            <p className="mt-1 text-base font-semibold text-[#2c2e4b] tracking-tight">
              {data.created_at ? format(data.created_at, "MMM d, yyyy") : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation & Content Card */}
      <div className="border border-[#e7d6bf] bg-white rounded-xl shadow-sm overflow-hidden">
        <Suspense fallback={<div className="h-12 border-b border-[#e7d6bf] bg-[#e7d6bf]/5" />}>
          <PatientProfileTabs 
            patientId={id} 
            containerClassName="border-b border-[#e7d6bf] bg-[#e7d6bf]/5"
            activeClassName="text-[#caa26a] border-b-2 border-[#caa26a]"
            inactiveClassName="text-[#2c2e4b]/60 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/10"
          />
        </Suspense>

        {/* Tab Content */}
        <div className="grid gap-6 lg:grid-cols-3 p-5 lg:p-6" data-content-area>
          {/* Main Content */}
          <div className="lg:col-span-2">
            {cat === "overview" && (
              <PatientOverviewPanel
                patient={{
                  gender: data.gender,
                  date_of_birth: data.date_of_birth,
                  phone: data.phone,
                  marital_status: data.marital_status,
                  blood_group: data.blood_group,
                  address: data.address,
                  emergency_contact_name: data.emergency_contact_name,
                  emergency_contact_number: data.emergency_contact_number,
                  relation: data.relation,
                }}
              />
            )}

            {cat === "appointments" && (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-16">
                    <div className="text-sm text-muted-foreground animate-pulse">
                      Loading appointments…
                    </div>
                  </div>
                }
              >
                <PatientAppointmentsPanel patientId={id} />
              </Suspense>
            )}

            {cat === "billing" && (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-16">
                    <div className="text-sm text-muted-foreground animate-pulse">
                      Loading billing information…
                    </div>
                  </div>
                }
              >
                <PatientBillingPanel patientId={id} />
              </Suspense>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <FrontdeskPatientSidebar
              patientId={id}
              patientName={fullName}
              lastVisit={data.lastVisit}
              totalAppointments={data.totalAppointments}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FrontdeskPatientProfile;
