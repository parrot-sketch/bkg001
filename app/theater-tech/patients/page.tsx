'use client';

/**
 * Theater Tech Patients Page
 * 
 * Clean, modern patient listing with compact, well-organized UI.
 * Allows theater tech to select patients for surgical planning.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, User, Scissors, ChevronLeft, ChevronRight, Phone, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  file_number: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
}

const PAGE_SIZE = 15;

export default function TheaterTechPatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [creatingCase, setCreatingCase] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/theater-tech/patients?page=${page}&search=${encodeURIComponent(searchQuery)}`
        );
        const data = await res.json();
        if (data.success) {
          setPatients(data.data || []);
          setTotalPages(data.totalPages || 1);
        }
      } catch (error) {
        console.error('Error fetching patients:', error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchPatients, 300);
    return () => clearTimeout(timer);
  }, [page, searchQuery]);

  const handleCreateSurgicalCase = async (patientId: string) => {
    setCreatingCase(patientId);
    try {
      const res = await fetch('/api/theater-tech/surgical-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId }),
      });
      const data = await res.json();
      
      if (data.success && data.surgicalCaseId) {
        toast.success('Case created');
        router.push(`/theater-tech/surgical-cases/${data.surgicalCaseId}/edit`);
      } else {
        toast.error(data.error || 'Failed to create case');
      }
    } catch (error) {
      toast.error('Failed to create case');
    } finally {
      setCreatingCase(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Patients</h1>
          <p className="text-sm text-slate-500">Select patient for surgical planning</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {patients.length} records
        </Badge>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by name or file number..."
          className="pl-9 h-9 bg-white"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {/* Table Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : patients.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {searchQuery ? 'No patients match your search' : 'No patients found'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-2.5">Patient</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-2.5 hidden md:table-cell">File #</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-2.5 hidden lg:table-cell">Contact</th>
                    <th className="text-right text-xs font-medium text-slate-500 px-4 py-2.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {patient.first_name} {patient.last_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <FileText className="h-3.5 w-3.5" />
                          <span className="text-sm">{patient.file_number || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Phone className="h-3.5 w-3.5" />
                          <span className="text-sm">{patient.phone || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1.5 border-slate-200 hover:bg-slate-800 hover:text-white"
                            onClick={() => handleCreateSurgicalCase(patient.id)}
                            disabled={creatingCase === patient.id}
                          >
                            {creatingCase === patient.id ? (
                              <div className="h-3 w-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                            ) : (
                              <Scissors className="h-3 w-3" />
                            )}
                            Plan Surgery
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-slate-500"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-slate-500"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}