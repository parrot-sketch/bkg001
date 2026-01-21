import { Pagination } from "@/components/pagination";
import { ProfileImage } from "@/components/profile-image";
import SearchInput from "@/components/search-input";
import { Button } from "@/components/ui/button";
import { SearchParamsProps } from "@/types";
import { calculateAge } from "@/lib/utils";
import { DATA_LIMIT } from "@/lib/utils/settings";
import { getAllPatients } from "@/utils/services/patient";
import { Patient } from "@prisma/client";
import { format } from "date-fns";
import { Users, Calendar, Eye, Search, UserPlus, Phone, Mail, MapPin, Clock } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const dynamic = 'force-dynamic';

interface PatientProps extends Patient {
  appointments: {
    medical_records: {
      created_at: Date;
      treatment_plan: string | null;
    }[];
  }[];
}

const FrontdeskPatientsPage = async (props: SearchParamsProps) => {
  const searchParams = await props.searchParams;
  const page = (searchParams?.p || "1") as string;
  const searchQuery = (searchParams?.q || "") as string;

  const { data, totalPages, totalRecords, currentPage } = await getAllPatients({
    page,
    search: searchQuery,
  });

  if (!data) return null;

  return (
    <div className="space-y-6 w-full">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-foreground tracking-tight">
              All Patients
            </h1>
            <p className="text-sm text-muted-foreground">
              Browse and manage patient records
            </p>
          </div>
          <Link href="/frontdesk/patient-intake">
            <Button size="lg">
              <UserPlus className="mr-2 h-5 w-5" />
              Register New Patient
            </Button>
          </Link>
        </div>

        {/* Stats Card */}
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-brand-primary to-brand-dusk flex items-center justify-center shadow-lg">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Total Patients
                  </p>
                  <p className="text-3xl font-semibold text-foreground mt-1">
                    {totalRecords.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="hidden md:block h-16 w-px bg-border" />
              <div className="hidden md:flex items-center gap-2 text-muted-foreground">
                <div className="h-3 w-3 rounded-full bg-brand-secondary animate-pulse" />
                <span className="text-sm font-medium">System Active</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filters */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Search Patients</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <SearchInput />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modern Table */}
        <Card className="border-gray-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-4 xl:px-6 py-4 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider min-w-[200px]">
                      Patient
                    </th>
                    <th className="px-4 xl:px-6 py-4 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell min-w-[140px]">
                      File Number
                    </th>
                    <th className="px-4 xl:px-6 py-4 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell min-w-[180px]">
                      Contact
                    </th>
                    <th className="px-4 xl:px-6 py-4 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell min-w-[200px]">
                      Location
                    </th>
                    <th className="px-4 xl:px-6 py-4 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell min-w-[140px]">
                      Last Visit
                    </th>
                    <th className="px-4 xl:px-6 py-4 text-center text-sm font-medium text-muted-foreground uppercase tracking-wider min-w-[180px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 xl:px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Users className="h-12 w-12 text-muted-foreground/50" />
                          <p className="text-foreground font-medium">No patients found</p>
                          <p className="text-sm text-muted-foreground">
                            {searchQuery ? "Try adjusting your search criteria" : "Start by registering a new patient"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    data.map((item: PatientProps) => {
                      const lastVisit = item?.appointments[0]?.medical_records[0] || null;
                      const name = `${item?.first_name} ${item?.last_name}`;

                      return (
                        <tr
                          key={item?.id}
                          className="hover:bg-muted/50 transition-colors duration-150 group"
                        >
                          {/* Patient Name & Avatar */}
                          <td className="px-4 xl:px-6 py-5">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <ProfileImage
                                  url={item?.img!}
                                  name={name}
                                  bgColor={item?.colorCode!}
                                  textClassName="text-white font-semibold"
                                />
                                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-brand-secondary border-2 border-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base font-semibold text-foreground truncate">
                                  {name}
                                </h3>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-sm text-muted-foreground capitalize">
                                    {item?.gender?.toLowerCase()}
                                  </span>
                                  <span className="text-muted-foreground/50">•</span>
                                  <span className="text-sm text-muted-foreground">
                                    {calculateAge(item?.date_of_birth)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* File Number */}
                          <td className="px-4 xl:px-6 py-5 hidden md:table-cell">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-semibold text-foreground bg-muted px-3 py-1 rounded-md">
                                {item?.file_number || 'N/A'}
                              </span>
                            </div>
                          </td>

                          {/* Contact Info */}
                          <td className="px-4 xl:px-6 py-5 hidden lg:table-cell">
                            <div className="space-y-2">
                              {item?.phone && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Phone className="h-3.5 w-3.5 text-brand-secondary" />
                                  <span className="truncate max-w-[220px]">{item.phone}</span>
                                </div>
                              )}
                              {item?.email && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Mail className="h-3.5 w-3.5 text-brand-secondary" />
                                  <span className="truncate max-w-[220px]">{item.email}</span>
                                </div>
                              )}
                              {!item?.phone && !item?.email && (
                                <span className="text-sm text-muted-foreground/70 italic">No contact info</span>
                              )}
                            </div>
                          </td>

                          {/* Address */}
                          <td className="px-4 xl:px-6 py-5 hidden xl:table-cell">
                            {item?.address ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4 text-brand-secondary flex-shrink-0" />
                                <span className="truncate max-w-[280px]">{item.address}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground/70 italic">Not provided</span>
                            )}
                          </td>

                          {/* Last Visit */}
                          <td className="px-4 xl:px-6 py-5 hidden lg:table-cell">
                            {lastVisit ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4 text-brand-secondary" />
                                <span>
                                  {format(lastVisit?.created_at, "MMM dd, yyyy")}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground/70 italic">No visits yet</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 xl:px-6 py-5">
                            <div className="flex items-center justify-center gap-2">
                              <Link href={`/frontdesk/patient/${item?.id}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                >
                                  <Eye className="h-4 w-4 mr-1.5" />
                                  View
                                </Button>
                              </Link>
                              <Link href={`/frontdesk/appointments?patientId=${item?.id}`}>
                                <Button
                                  size="sm"
                                  className="bg-brand-secondary hover:bg-brand-secondary/90 text-white"
                                >
                                  <Calendar className="h-4 w-4 mr-1.5" />
                                  Schedule
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages && totalPages > 1 && (
              <div className="border-t border-border bg-muted/30 px-4 xl:px-6 py-4">
                <Pagination
                  totalPages={totalPages}
                  currentPage={currentPage}
                  totalRecords={totalRecords}
                  limit={DATA_LIMIT}
                />
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
};

export default FrontdeskPatientsPage;
