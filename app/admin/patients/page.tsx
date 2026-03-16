'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/patient/useAuth';
import { useAllPatients } from '@/hooks/patients/usePatients';
import { Search, Loader2, ChevronLeft, ChevronRight, Phone, Mail, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function AdminPatientsPage() {
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const { data: patients = [], isLoading, isRefetching } = useAllPatients(isAuthenticated && !!user);

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const query = searchQuery.toLowerCase();
    return patients.filter(
      (p) =>
        p.firstName?.toLowerCase().includes(query) ||
        p.lastName?.toLowerCase().includes(query) ||
        p.email?.toLowerCase().includes(query) ||
        p.phone?.toLowerCase().includes(query) ||
        p.fileNumber?.toLowerCase().includes(query)
    );
  }, [patients, searchQuery]);

  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPatients.slice(start, start + pageSize);
  }, [filteredPatients, currentPage]);

  const totalPages = Math.ceil(filteredPatients.length / pageSize);

  const stats = useMemo(() => {
    const thisMonth = patients.filter(p => {
      if (!p.createdAt) return false;
      const date = new Date(p.createdAt);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
    
    return {
      total: patients.length,
      thisMonth,
      withFile: patients.filter(p => !!p.fileNumber).length,
    };
  }, [patients]);

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

  const handleSearch = (term: string) => {
    setSearchQuery(term);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
          <p className="text-sm text-slate-500 mt-1">
            View and manage all patient records
          </p>
        </div>
      </div>

      {/* Stats Row - Clean without icons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Total Patients</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">New This Month</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.thisMonth}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">With File Number</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.withFile}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Showing</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{filteredPatients.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, file number, phone, or email..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-slate-50/50">
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">File No.</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Patient</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Contact</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Demographics</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Registered</th>
              <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-4 py-4"><div className="h-5 w-20 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-4 py-4"><div className="h-5 w-32 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-4 py-4"><div className="h-5 w-40 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-4 py-4"><div className="h-5 w-24 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-4 py-4"><div className="h-5 w-20 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-4 py-4"><div className="h-8 w-8 bg-slate-100 rounded animate-pulse ml-auto" /></td>
                </tr>
              ))
            ) : paginatedPatients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  {searchQuery ? 'No patients found matching your search.' : 'No patients registered yet.'}
                </td>
              </tr>
            ) : (
              paginatedPatients.map((patient) => (
                <tr key={patient.id} className="border-b hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                      {patient.fileNumber || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{patient.firstName} {patient.lastName}</p>
                      <p className="text-xs text-slate-500 capitalize">{patient.gender || 'N/A'} • {patient.age ? `${patient.age} yrs` : 'N/A'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {patient.phone && (
                        <p className="text-xs text-slate-600 flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" /> {patient.phone}
                        </p>
                      )}
                      {patient.email && (
                        <p className="text-xs text-slate-600 flex items-center gap-1">
                          <Mail className="h-3 w-3 text-slate-400" /> {patient.email}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">
                      {patient.gender || 'N/A'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-slate-500">
                      {patient.createdAt ? format(new Date(patient.createdAt), 'MMM d, yyyy') : '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/patients/${patient.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50/50">
            <p className="text-sm text-slate-500">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredPatients.length)} of {filteredPatients.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
