'use client';

/**
 * Frontdesk Patients Page
 * 
 * View all patients with server-side pagination and search.
 * Uses clean UI consistent with Doctor dashboard.
 */

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useFrontdeskPatients } from "@/hooks/frontdesk/useFrontdeskPatients";
import { PatientTable } from "@/components/patient/PatientTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, UserPlus } from "lucide-react";
import Link from "next/link";

function FrontdeskPatientsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 1. Get Params from URL
  const page = Number(searchParams.get("page")) || 1;
  // limit is hardcoded to 10 in UI, but API supports param
  const limit = 10;
  const urlSearch = searchParams.get("q") || "";

  // 2. Local State for Input (immediate feedback)
  const [searchInput, setSearchInput] = useState(urlSearch);

  // 3. Debounce Logic: Update URL only after user stops typing
  useEffect(() => {
    // If input matches URL, do nothing (avoids loops)
    if (searchInput === urlSearch) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      // Reset to page 1 on new search
      params.set("page", "1");

      if (searchInput) {
        params.set("q", searchInput);
      } else {
        params.delete("q");
      }

      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput, urlSearch, searchParams, pathname, router]);

  // Handle Page Change (Direct URL update, no debounce needed)
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newPage > 1) {
      params.set("page", newPage.toString());
    } else {
      params.delete("page");
    }

    // Search query is preserved automatically as we cloned searchParams
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // 4. Fetch Data Query
  // We use the URL params as source of truth for the Query
  const {
    data: apiResponse,
    isLoading
  } = useFrontdeskPatients({
    page,
    limit,
    search: urlSearch, // Fetch using URL param!
  });

  // Extract data safely
  const patients = apiResponse?.success ? apiResponse.data : [];
  const meta = apiResponse?.success && apiResponse.meta ? apiResponse.meta : { totalRecords: 0, totalPages: 1, currentPage: 1, limit: 10 };

  const totalDisplay = meta.totalRecords;

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
              <h3 className="text-2xl font-bold">{totalDisplay.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DATA TABLE */}
      <PatientTable
        patients={patients}
        loading={isLoading}
        role="frontdesk"
        showActions={true}
        manualPagination={true}
        totalPages={meta.totalPages}
        currentPage={page}
        onPageChange={handlePageChange}
        onSearchChange={setSearchInput}
        searchValue={searchInput} // Bind controlled input
      />
    </div>
  );
}

export default function FrontdeskPatientsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading patients...</div>
      </div>
    }>
      <FrontdeskPatientsContent />
    </Suspense>
  );
}
