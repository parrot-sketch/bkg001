import { Suspense } from "react";
import { MedicalHistoryContainer } from "@/components/medical-history-container";
import { PatientProfileHero } from "@/components/patient/PatientProfileHero";
import { PatientProfileTabs } from "@/components/patient/PatientProfileTabs";
import { PatientOverviewPanel } from "@/components/patient/PatientOverviewPanel";
import { FrontdeskPatientSidebar } from "@/components/patient/FrontdeskPatientSidebar";
import { PatientAppointmentsPanel } from "@/components/patient/PatientAppointmentsPanel";
import { PatientBillingPanel } from "@/components/patient/PatientBillingPanel";
import { Card, CardContent } from "@/components/ui/card";
import { getPatientFullDataById } from "@/utils/services/patient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

interface ParamsProps {
  params: Promise<{ patientId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

const FrontdeskPatientProfile = async (props: ParamsProps) => {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const id = params.patientId;
  const cat = (searchParams?.cat as string) || "overview";

  const { data } = await getPatientFullDataById(id);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-foreground">Patient not found</p>
          <p className="text-sm text-muted-foreground">
            The patient record you&apos;re looking for doesn&apos;t exist.
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
        <Suspense fallback={null}>
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
                  allergies: data.allergies,
                  medical_conditions: data.medical_conditions,
                  medical_history: data.medical_history,
                }}
              />
            )}

            {cat === "medical-history" && (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-16">
                    <div className="text-sm text-muted-foreground animate-pulse">
                      Loading medical records…
                    </div>
                  </div>
                }
              >
                <MedicalHistoryContainer patientId={id} />
              </Suspense>
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
