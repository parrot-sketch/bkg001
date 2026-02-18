import { MedicalHistoryContainer } from "@/components/medical-history-container";
import { ProfileImage } from "@/components/profile-image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPatientFullDataById } from "@/utils/services/patient";
import { format } from "date-fns";
import Link from "next/link";
import React from "react";

export const dynamic = 'force-dynamic';

interface ParamsProps {
  params: Promise<{ patientId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

const FrontdeskPatientProfile = async (props: ParamsProps) => {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const id = params.patientId;
  const cat = searchParams?.cat || "medical-history";

  const { data } = await getPatientFullDataById(id);

  if (!data) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Patient not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">Patient Profile</h1>
          <p className="text-sm text-muted-foreground">Complete patient information and medical history</p>
        </div>
        <Link
          href="/frontdesk/patients"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Patients
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Header Card */}
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Profile Image */}
                <div className="flex-shrink-0">
                  <ProfileImage
                    url={data?.img!}
                    name={data?.first_name + " " + data?.last_name}
                    className="h-24 w-24 md:h-32 md:w-32"
                    bgColor={data?.colorCode!}
                    textClassName="text-4xl"
                  />
                </div>

                {/* Patient Info */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground">
                      {data?.first_name + " " + data?.last_name}
                    </h2>
                    {data?.file_number && (
                      <p className="text-sm font-mono text-brand-primary mt-1">
                        File: {data.file_number}
                      </p>
                    )}
                    {!data?.file_number && data?.id && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ID: {data.id.slice(0, 8)}...
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">{data?.email}</p>
                  </div>

                  {/* Quick Stats */}
                  <div className="flex gap-6 pt-4 border-t border-border">
                    <div>
                      <p className="text-2xl font-semibold text-foreground">{data?.totalAppointments || 0}</p>
                      <p className="text-xs text-muted-foreground">Appointments</p>
                    </div>
                    {data?.lastVisit && (
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {format(data.lastVisit, "MMM dd, yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground">Last Visit</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Basic patient details and demographics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-1">
                  <span className="text-sm font-medium text-muted-foreground">Gender</span>
                  <p className="text-sm text-foreground capitalize">{data?.gender?.toLowerCase()}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium text-muted-foreground">Date of Birth</span>
                  <p className="text-sm text-foreground">{format(data?.date_of_birth!, "MMMM dd, yyyy")}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium text-muted-foreground">Phone Number</span>
                  <p className="text-sm text-foreground">{data?.phone || "Not provided"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium text-muted-foreground">Marital Status</span>
                  <p className="text-sm text-foreground capitalize">{data?.marital_status || "Not provided"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium text-muted-foreground">Blood Group</span>
                  <p className="text-sm text-foreground">{data?.blood_group || "Not provided"}</p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-muted-foreground">Address</span>
                  <p className="text-sm text-foreground">{data?.address || "Not provided"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
              <CardDescription>Emergency contact information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-1">
                  <span className="text-sm font-medium text-muted-foreground">Contact Person</span>
                  <p className="text-sm text-foreground">{data?.emergency_contact_name || "Not provided"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium text-muted-foreground">Contact Number</span>
                  <p className="text-sm text-foreground">{data?.emergency_contact_number || "Not provided"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium text-muted-foreground">Relationship</span>
                  <p className="text-sm text-foreground capitalize">{data?.relation || "Not provided"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Medical History Section */}
          <div className="mt-6">
            {cat === "medical-history" && (
              <MedicalHistoryContainer patientId={id} />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Links */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href={`/frontdesk/appointments?patientId=${id}`}
                className="block w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-brand-primary/50 transition-colors"
              >
                <p className="text-sm font-medium text-foreground">Patient&apos;s Appointments</p>
                <p className="text-xs text-muted-foreground">View and manage appointments</p>
              </Link>
              <Link
                href={`/frontdesk/patient/${id}?cat=medical-history`}
                className="block w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-brand-primary/50 transition-colors"
              >
                <p className="text-sm font-medium text-foreground">Medical Records</p>
                <p className="text-xs text-muted-foreground">View medical history</p>
              </Link>
              <Link
                href={`/frontdesk/billing?q=${data?.first_name}+${data?.last_name}`}
                className="block w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-brand-primary/50 transition-colors"
              >
                <p className="text-sm font-medium text-foreground">Billing & Payments</p>
                <p className="text-xs text-muted-foreground">View patient&apos;s billing and payments</p>
              </Link>
              <Link
                href={`/frontdesk/appointments?patientId=${id}&action=schedule`}
                className="block w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-brand-primary/50 transition-colors"
              >
                <p className="text-sm font-medium text-foreground">Schedule Appointment</p>
                <p className="text-xs text-muted-foreground">Book a new appointment</p>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FrontdeskPatientProfile;
