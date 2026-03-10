'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useAllPatients } from '@/hooks/patients/usePatients';
import { Search, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PatientHeader } from './_components/PatientHeader';
import { PatientStats } from './_components/PatientStats';
import { PatientTable } from './_components/PatientTable';
import { cn } from '@/lib/utils';

export default function AdminPatientsPage() {
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const { 
    data: patients = [], 
    isLoading,
    refetch,
    isRefetching
  } = useAllPatients(isAuthenticated && !!user);

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const query = searchQuery.toLowerCase();
    return patients.filter(
      (p) =>
        p.firstName?.toLowerCase().includes(query) ||
        p.lastName?.toLowerCase().includes(query) ||
        p.email?.toLowerCase().includes(query) ||
        p.phone?.toLowerCase().includes(query) ||
        p.fileNumber?.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query)
    );
  }, [patients, searchQuery]);

  if (!isAuthenticated || !user) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 max-w-md mx-auto text-center">
        <div className="h-16 w-16 bg-slate-100 rounded-2xl flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Protected Directory</h3>
        <p className="text-sm text-slate-500 font-medium">
          Please verify your institutional access to view global patient records.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PatientHeader />
      
      <PatientStats patients={patients} />

      {/* Modern Search Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <Card className="flex-1 rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardContent className="p-0">
                <div className="relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    <Input
                        placeholder="Search clinical directory by name, file number, or contact..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-14 pl-14 pr-6 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent font-medium placeholder:text-slate-400"
                    />
                </div>
            </CardContent>
        </Card>
        <Button 
            variant="outline" 
            size="icon" 
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-14 w-14 rounded-3xl shrink-0 bg-white border-slate-200 hover:bg-slate-50"
        >
            <RefreshCw className={cn("h-5 w-5 text-slate-500", isRefetching && "animate-spin")} />
        </Button>
      </div>

      <PatientTable patients={filteredPatients} isLoading={isLoading} />
    </div>
  );
}
