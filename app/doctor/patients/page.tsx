'use client';

/**
 * Doctor Patients Page — Redesigned
 *
 * Purpose-built patient roster for the doctor's clinical context.
 * Modularized for better maintainability.
 */

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useDoctorPatients } from '@/hooks/doctor/useDoctorPatients';
import { useDoctorAppointments } from '@/hooks/doctor/useDoctorAppointments';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { isThisMonth } from 'date-fns';

// Modular Components
import { PatientRow } from './components/PatientRow';
import { PatientStats } from './components/PatientStats';
import { PatientFilters } from './components/PatientFilters';

// ============================================================================
// TYPES
// ============================================================================

type SortKey = 'name' | 'recent' | 'visits';

// ============================================================================
// PAGE
// ============================================================================

export default function DoctorPatientsPage() {
  const { user, isAuthenticated } = useAuth();

  const {
    data: patients = [],
    isLoading: isLoadingPatients,
    error: patientsError,
    refetch: refetchPatients,
  } = useDoctorPatients(!!user);

  const {
    data: appointments = [],
    isLoading: isLoadingAppointments,
  } = useDoctorAppointments(user?.id, undefined, !!user);

  const loading = isLoadingPatients || isLoadingAppointments;

  // ── Local state ──
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [refreshing, setRefreshing] = useState(false);

  // ── Derived: appointment maps ──
  const { patientAppointmentCount, patientLastVisit } = useMemo(() => {
    const countMap: Record<string, number> = {};
    const lastVisitMap: Record<string, Date> = {};

    for (const apt of appointments) {
      const pid = apt.patientId;
      if (!pid) continue;
      countMap[pid] = (countMap[pid] || 0) + 1;

      const aptDate = new Date(apt.appointmentDate);
      if (!lastVisitMap[pid] || aptDate > lastVisitMap[pid]) {
        lastVisitMap[pid] = aptDate;
      }
    }
    return { patientAppointmentCount: countMap, patientLastVisit: lastVisitMap };
  }, [appointments]);

  // ── Stats ──
  const stats = useMemo(() => {
    const total = patients.length;
    const newThisMonth = patients.filter((p) => p.createdAt && isThisMonth(new Date(p.createdAt))).length;
    const withAllergies = patients.filter((p) => p.allergies && p.allergies.trim().length > 0).length;
    const withConditions = patients.filter((p) => p.medicalConditions && p.medicalConditions.trim().length > 0).length;
    return { total, newThisMonth, withAllergies, withConditions };
  }, [patients]);

  // ── Filter + Sort ──
  const sortedPatients = useMemo(() => {
    let list = [...patients];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q) ||
        p.fileNumber?.toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'name') {
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      }
      if (sortBy === 'recent') {
        const dateA = patientLastVisit[a.id]?.getTime() || 0;
        const dateB = patientLastVisit[b.id]?.getTime() || 0;
        return dateB - dateA;
      }
      if (sortBy === 'visits') {
        return (patientAppointmentCount[b.id] || 0) - (patientAppointmentCount[a.id] || 0);
      }
      return 0;
    });

    return list;
  }, [patients, searchQuery, sortBy, patientLastVisit, patientAppointmentCount]);

  // ── Handlers ──
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchPatients();
    setRefreshing(false);
  };

  // ── Auth guard ──
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 bg-[#e7d6bf] rounded-full mx-auto animate-pulse" />
          <p className="text-sm text-[#2c2e4b]/60">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (patientsError) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-full max-w-md border border-[#e7d6bf] bg-white p-6 text-center">
            <p className="text-sm font-semibold text-[#2c2e4b]">Unable to load patient roster</p>
            <p className="text-xs text-[#2c2e4b]/60 mt-1">Please retry.</p>
            <Button variant="outline" size="sm" className="mt-4 rounded-lg border-[#e7d6bf] text-[#2c2e4b]" onClick={handleRefresh}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-base font-semibold text-[#2c2e4b]">My Patients</h1>
        <Button
          variant="outline"
          size="sm"
          className="text-xs self-start sm:self-auto rounded-lg border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <PatientStats stats={stats} loading={loading} />

        {/* Search + Sort */}
        <PatientFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortBy={sortBy}
          setSortBy={setSortBy}
          resultCount={sortedPatients.length}
          loading={loading}
        />

        {/* Patient List */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-white border border-[#e7d6bf]">
                <Skeleton className="h-9 w-9 rounded-lg bg-[#e7d6bf]/30" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-44 bg-[#e7d6bf]/30" />
                  <Skeleton className="h-3 w-28 bg-[#e7d6bf]/30" />
                </div>
                <Skeleton className="h-8 w-20 rounded-lg bg-[#e7d6bf]/30" />
              </div>
            ))}
          </div>
        ) : sortedPatients.length > 0 ? (
          <div className="border border-[#e7d6bf] bg-white overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#2c2e4b]/60 border-b border-[#e7d6bf]">
              <div className="col-span-4">Patient</div>
              <div className="col-span-2">File</div>
              <div className="col-span-2">Phone</div>
              <div className="col-span-2">Last visit</div>
              <div className="col-span-1">Visits</div>
              <div className="col-span-1">Flags</div>
            </div>
            <div className="divide-y divide-[#e7d6bf]">
              {sortedPatients.map((patient) => (
                <PatientRow
                  key={patient.id}
                  patient={patient}
                  appointmentCount={patientAppointmentCount[patient.id] || 0}
                  lastVisit={patientLastVisit[patient.id]}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 bg-white border border-[#e7d6bf]">
            <h3 className="text-sm font-semibold text-[#2c2e4b]">
              {searchQuery ? 'No patients match your search' : 'No patients yet'}
            </h3>
            <p className="text-xs text-[#2c2e4b]/60 max-w-xs text-center mt-1">
              {searchQuery
                ? 'Try different search terms.'
                : 'Patients will appear here after their first appointment with you.'
              }
            </p>
          </div>
        )}
    </div>
  );
}
