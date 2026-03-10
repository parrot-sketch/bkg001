import { Suspense } from "react";
import { PatientProfileHero } from "@/components/patient/PatientProfileHero";
import { PatientProfileTabs } from "@/components/patient/PatientProfileTabs";
import { PatientOverviewPanel } from "@/components/patient/PatientOverviewPanel";
import { PatientAppointmentsPanel } from "@/components/patient/PatientAppointmentsPanel";
import { PatientBillingPanel } from "@/components/patient/PatientBillingPanel";
import { getPatientFullDataById } from "@/utils/services/patient";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

interface ParamsProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminPatientProfilePage(props: ParamsProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const patientId = params.id;
  const cat = (searchParams?.cat as string) || "overview";

  const { data } = await getPatientFullDataById(patientId);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-sm">
          <div className="h-16 w-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-rose-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">Patient Record Not Found</p>
            <p className="text-sm text-slate-500 mt-1">
              The clinical record you are looking for does not exist or has been removed.
            </p>
          </div>
          <Link
            href="/admin/patients"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Patient Directory
          </Link>
        </div>
      </div>
    );
  }

  const fullName = `${data.first_name} ${data.last_name}`;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Patient Profile</h2>
          <p className="text-slate-500 font-medium mt-0.5">
            Complete clinical record for {fullName}
          </p>
        </div>
        <Link
          href="/admin/patients"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Directory
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

      {/* Tab Navigation & Content */}
      <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-white">
        <Suspense fallback={null}>
          <PatientProfileTabs patientId={patientId} />
        </Suspense>

        <div className="grid gap-6 lg:grid-cols-3 p-6 lg:p-8">
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
                    <div className="text-sm text-slate-400 font-medium animate-pulse">
                      Loading appointment history…
                    </div>
                  </div>
                }
              >
                <PatientAppointmentsPanel patientId={patientId} />
              </Suspense>
            )}

            {cat === "billing" && (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-16">
                    <div className="text-sm text-slate-400 font-medium animate-pulse">
                      Loading billing records…
                    </div>
                  </div>
                }
              >
                <PatientBillingPanel patientId={patientId} />
              </Suspense>
            )}
          </div>

          {/* Admin Read-Only Sidebar */}
          <div className="space-y-6">
            <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50 space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Record Metadata</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Patient ID</span>
                  <span className="font-mono text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">{data.id.slice(0, 8)}…</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">File Number</span>
                  <span className="font-bold text-slate-900">{data.file_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Total Appointments</span>
                  <span className="font-bold text-slate-900">{data.totalAppointments || 0}</span>
                </div>
                {data.lastVisit && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Last Visit</span>
                    <span className="font-bold text-slate-900">{new Date(data.lastVisit).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
