import { Pagination } from "@/components/pagination";
import { ProfileImage } from "@/components/profile-image";
import { Button } from "@/components/ui/button";
import { SearchParamsProps } from "@/types";
import { calculateAge } from "@/lib/utils";
import { DATA_LIMIT } from "@/lib/utils/settings";
import { getAllPatients } from "@/utils/services/patient";
import { format } from "date-fns";
import { Users, UserPlus, Phone, Mail, Clock, Eye, Calendar } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PatientDataTable } from "@/components/patient/PatientDataTable";
import { columns, PatientColumn } from "@/components/patient/PatientColumns";

export const dynamic = 'force-dynamic';

const FrontdeskPatientsPage = async (props: SearchParamsProps) => {
  const searchParams = await props.searchParams;
  const page = (searchParams?.p || "1") as string;
  const searchQuery = (searchParams?.q || "") as string;

  const { data, totalPages, totalRecords, currentPage } = await getAllPatients({
    page,
    search: searchQuery,
  });

  if (!data) return null;

  // Map data to the column shape
  const tableData: PatientColumn[] = data.map((p: any) => ({
    id: p.id,
    file_number: p.file_number,
    first_name: p.first_name,
    last_name: p.last_name,
    email: p.email,
    phone: p.phone,
    date_of_birth: p.date_of_birth,
    gender: p.gender,
    address: p.address,
    img: p.img,
    colorCode: p.colorCode,
    created_at: p.created_at,
    updated_at: p.updated_at,
    last_visit_date: p.appointments?.[0]?.medical_records?.[0]?.created_at || null,
  }));

  return (
    <div className="space-y-6 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Patients</h1>
          <p className="text-muted-foreground">Manage and view all registered patients.</p>
        </div>
        <Link href="/frontdesk/patient-intake">
          <Button size="lg" className="bg-brand-primary hover:bg-brand-primary/90 shadow-sm w-full sm:w-auto">
            <UserPlus className="mr-2 h-5 w-5" />
            Register New Patient
          </Button>
        </Link>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Patients</p>
              <h3 className="text-2xl font-bold">{totalRecords.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>
        {/* Add more stats here if needed later */}
      </div>

      {/* DATA TABLE (Desktop) & MOBILE CARDS (Handled inside custom responsive wrapper or manually here) */}
      {/* Since PatientDataTable is desktop-only for now, we keep the mobile view here for responsiveness */}

      <div className="hidden md:block">
        <PatientDataTable
          columns={columns}
          data={tableData}
          totalPages={totalPages}
          currentPage={currentPage}
          totalRecords={totalRecords}
          limit={DATA_LIMIT}
          manualPagination={true}
          placeholder="Search patients by name..."
        // Enhance: Pass search query to the input if needed, but the current component manages its own state or needs URL sync. 
        // For now, since getAllPatients uses URL params, we rely on the Page to fetch.
        // ideally PatientDataTable should sync input with URL.
        />
      </div>

      {/* MOBILE VIEW (< 768px) - Preserving the "Card" layout for mobile users */}
      <div className="md:hidden space-y-4">
        {/* Mobile Search Input could go here if separate */}

        {data.length === 0 ? (
          <div className="text-center py-10 bg-muted/20 rounded-lg">
            <p className="text-muted-foreground">No patients found.</p>
          </div>
        ) : (
          data.map((item: any) => {
            const lastVisit = item.appointments?.[0]?.medical_records?.[0]?.created_at;
            const name = `${item.first_name} ${item.last_name}`;

            return (
              <Card key={item.id} className="overflow-hidden border-border/60 shadow-sm">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start gap-4">
                    <ProfileImage
                      url={item.img}
                      name={name}
                      bgColor={item.colorCode}
                      className="h-12 w-12 text-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold truncate pr-2">{name}</h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                          {item.file_number}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{calculateAge(item.date_of_birth)} • {item.gender}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-sm">
                    {item.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{item.phone}</span>
                      </div>
                    )}
                    {lastVisit && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Last visit: {format(new Date(lastVisit), "MMM d, yyyy")}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Link href={`/frontdesk/patient/${item.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">View</Button>
                    </Link>
                    <Link href={`/frontdesk/appointments?patientId=${item.id}`} className="flex-1">
                      <Button size="sm" className="w-full bg-brand-secondary">Schedule</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="pt-4 pb-8">
            <Pagination
              totalPages={totalPages}
              currentPage={currentPage}
              totalRecords={totalRecords}
              limit={DATA_LIMIT}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FrontdeskPatientsPage;
