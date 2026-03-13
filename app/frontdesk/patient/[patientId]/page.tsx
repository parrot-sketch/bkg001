import { Suspense } from "react";
import { PatientProfileHero } from "@/components/patient/PatientProfileHero";
import { PatientProfileTabs } from "@/components/patient/PatientProfileTabs";
import { PatientOverviewPanel } from "@/components/patient/PatientOverviewPanel";
import { FrontdeskPatientSidebar } from "@/components/patient/FrontdeskPatientSidebar";
import { PatientAppointmentsPanel } from "@/components/patient/PatientAppointmentsPanel";
import { PatientBillingPanel } from "@/components/patient/PatientBillingPanel";
import { Card, CardContent } from "@/components/ui/card";
import { getPatientFullDataById } from "@/utils/services/patient";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

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

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Patient Profile</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Complete patient information and medical history
          </p>
        </div>
        <Link
          href="/frontdesk/patients"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Patients
        </Link>
      </div>

      {/* Hero Banner */}
      <PatientProfileHero
        patient={{
          id: data.id,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          file_number: data.file_number,
          img: data.img,
          colorCode: data.colorCode,
          blood_group: data.blood_group,
          gender: data.gender,
          totalAppointments: data.totalAppointments,
          lastVisit: data.lastVisit,
        }}
      />

      {/* Tab Navigation */}
      <div className="rounded-xl overflow-hidden border border-border shadow-sm bg-white">
        <Suspense fallback={<div className="h-12 border-b border-border" />}>
          <PatientProfileTabs patientId={id} />
        </Suspense>

        {/* Tab Content */}
        <div className="grid gap-6 lg:grid-cols-3 p-6 lg:p-8" data-content-area>
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
