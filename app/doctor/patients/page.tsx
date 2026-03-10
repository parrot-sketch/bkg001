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
import { ClinicalDashboardShell } from '@/components/layouts/ClinicalDashboardShell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { isThisMonth } from 'date-fns';
import { cn } from '@/lib/utils';

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
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 bg-slate-200 rounded-full mx-auto animate-pulse" />
          <p className="text-sm text-slate-400">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (patientsError) {
    return (
      <ClinicalDashboardShell>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertTriangle className="h-8 w-8 text-red-400 mb-3" />
          <p className="text-sm font-medium text-red-600">Failed to load patients</p>
          <p className="text-xs text-slate-400 mt-1">Please try refreshing the page.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
          </Button>
        </div>
      </ClinicalDashboardShell>
    );
  }

  return (
    <ClinicalDashboardShell>
      <div className="space-y-5 animate-in fade-in duration-500 pb-8">

        {/* ─── Header ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Your Patient Roster</p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">My Patients</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-slate-500 gap-1.5 self-start sm:self-auto"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* ─── Stats Strip ───────────────────────────────────── */}
        <PatientStats stats={stats} loading={loading} />

        {/* ─── Search + Sort Bar ──────────────────────────────── */}
        <PatientFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortBy={sortBy}
          setSortBy={setSortBy}
          resultCount={sortedPatients.length}
          loading={loading}
        />

        {/* ─── Patient List ──────────────────────────────────── */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-100">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : sortedPatients.length > 0 ? (
          <div className="space-y-1.5">
            {sortedPatients.map((patient) => (
              <PatientRow
                key={patient.id}
                patient={patient}
                appointmentCount={patientAppointmentCount[patient.id] || 0}
                lastVisit={patientLastVisit[patient.id]}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
            <Users className="h-8 w-8 text-slate-300 mb-3" />
            <h3 className="text-sm font-semibold text-slate-700">
              {searchQuery ? 'No patients match your search' : 'No patients yet'}
            </h3>
            <p className="text-xs text-slate-400 max-w-xs text-center mt-1">
              {searchQuery
                ? 'Try different search terms.'
                : 'Patients will appear here after their first appointment with you.'
              }
            </p>
          </div>
        )}
      </div>
    </ClinicalDashboardShell>
  );
}
