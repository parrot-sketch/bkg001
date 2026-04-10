'use client';

/**
 * Theater Tech Patients Page
 * 
 * Simple patient listing for theater tech to select patients for surgical planning.
 * Reuses existing patient data - follows DRY principle.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, User, FileText, Scissors, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const PAGE_SIZE = 20;

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
          `/api/admin/patients?page=${page}&search=${encodeURIComponent(searchQuery)}`
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
        toast.success('Surgical case created');
        router.push(`/theater-tech/surgical-cases/${data.surgicalCaseId}/plan`);
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Patients</h1>
        <p className="text-xs text-slate-500">Select a patient to plan surgery</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by name or file number..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {/* Patient List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : patients.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {searchQuery ? 'No patients match your search' : 'No patients found'}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Patient</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">File #</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Contact</th>
                  <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-400" />
                        <span className="font-medium text-sm">
                          {patient.first_name} {patient.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-500">
                        {patient.file_number || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-500">
                        {patient.phone || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => handleCreateSurgicalCase(patient.id)}
                          disabled={creatingCase === patient.id}
                        >
                          {creatingCase === patient.id ? (
                            <ChevronRight className="h-4 w-4 animate-spin" />
                          ) : (
                            <Scissors className="h-4 w-4 mr-1" />
                          )}
                          Plan Surgery
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
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