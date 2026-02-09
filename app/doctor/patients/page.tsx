'use client';

/**
 * Doctor Patients Page — Redesigned
 *
 * Purpose-built patient roster for the doctor's clinical context.
 * Shows medically relevant data (blood group, allergies, conditions)
 * alongside visit history and quick actions.
 *
 * Data sources:
 *   1. useDoctorPatients → GET /api/doctors/me/patients (PatientResponseDto[])
 *   2. useDoctorAppointments → GET /api/appointments/doctor/:id (AppointmentResponseDto[])
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { useDoctorPatients } from '@/hooks/doctor/useDoctorPatients';
import { useDoctorAppointments } from '@/hooks/doctor/useDoctorAppointments';
import { ClinicalDashboardShell } from '@/components/layouts/ClinicalDashboardShell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Users,
  ChevronRight,
  Phone,
  Mail,
  Calendar,
  Clock,
  Activity,
  Droplets,
  AlertTriangle,
  Heart,
  Shield,
  FileText,
  RefreshCw,
  ArrowUpDown,
  Filter,
  Eye,
} from 'lucide-react';
import { format, isThisMonth, isThisYear, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import Link from 'next/link';

// ============================================================================
// TYPES
// ============================================================================

type SortKey = 'name' | 'recent' | 'visits';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name A–Z' },
  { key: 'recent', label: 'Recent Visit' },
  { key: 'visits', label: 'Most Visits' },
];

// ============================================================================
// PAGE
// ============================================================================

export default function DoctorPatientsPage() {
  const router = useRouter();
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
  } = useDoctorAppointments(user?.id, !!user);

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Patients</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Patients you&apos;ve seen or have upcoming appointments with
            </p>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Patients', value: stats.total, icon: Users, color: 'text-slate-900', bg: 'bg-white' },
            { label: 'New This Month', value: stats.newThisMonth, icon: Calendar, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'With Allergies', value: stats.withAllergies, icon: AlertTriangle, color: 'text-amber-700', bg: 'bg-amber-50' },
            { label: 'Medical Conditions', value: stats.withConditions, icon: Heart, color: 'text-rose-700', bg: 'bg-rose-50' },
          ].map((stat) => (
            <div
              key={stat.label}
              className={cn("flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100", stat.bg)}
            >
              <stat.icon className={cn("h-4 w-4 flex-shrink-0", stat.color)} />
              <div>
                <p className={cn("text-lg font-bold leading-none", stat.color)}>
                  {loading ? '–' : stat.value}
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Search + Sort Bar ──────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search name, email, phone, file #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-white border-slate-200 rounded-lg"
            />
          </div>

          {/* Sort Tabs */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                  sortBy === opt.key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Result count */}
          <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
            {loading ? '...' : `${sortedPatients.length} patient${sortedPatients.length !== 1 ? 's' : ''}`}
          </span>
        </div>

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

// ============================================================================
// PATIENT ROW — Compact, clinically-relevant card
// ============================================================================

function PatientRow({
  patient,
  appointmentCount,
  lastVisit,
}: {
  patient: PatientResponseDto;
  appointmentCount: number;
  lastVisit?: Date;
}) {
  const router = useRouter();
  const fullName = `${patient.firstName} ${patient.lastName}`;
  const initials = `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase();

  const age = patient.age ?? (patient.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / 31557600000) : null);

  const hasAllergies = !!patient.allergies?.trim();
  const hasConditions = !!patient.medicalConditions?.trim();

  // Recency badge
  const recencyLabel = lastVisit
    ? differenceInDays(new Date(), lastVisit) <= 7
      ? 'This week'
      : differenceInDays(new Date(), lastVisit) <= 30
        ? 'This month'
        : format(lastVisit, 'MMM d, yyyy')
    : null;

  return (
    <div
      className="group flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => router.push(`/doctor/patients/${patient.id}`)}
    >
      {/* Avatar */}
      <Avatar className="h-10 w-10 rounded-lg flex-shrink-0">
        <AvatarImage src={patient.profileImage ?? undefined} alt={fullName} />
        <AvatarFallback
          className="rounded-lg text-xs font-bold text-white"
          style={{ backgroundColor: patient.colorCode || '#64748b' }}
        >
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-800 truncate">{fullName}</p>
          {patient.fileNumber && (
            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              {patient.fileNumber}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {patient.gender && (
            <span className="text-[11px] text-slate-400 capitalize">{patient.gender.toLowerCase()}</span>
          )}
          {age !== null && (
            <>
              <span className="text-slate-200">·</span>
              <span className="text-[11px] text-slate-400">{age} yrs</span>
            </>
          )}
          {patient.bloodGroup && (
            <>
              <span className="text-slate-200">·</span>
              <span className="text-[11px] text-slate-500 flex items-center gap-0.5">
                <Droplets className="h-2.5 w-2.5 text-red-400" />
                {patient.bloodGroup}
              </span>
            </>
          )}
          {patient.phone && (
            <>
              <span className="text-slate-200">·</span>
              <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
                <Phone className="h-2.5 w-2.5" />
                {patient.phone}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Clinical Badges */}
      <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
        {hasAllergies && (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold px-1.5 py-0 h-5 border gap-0.5">
            <AlertTriangle className="h-2.5 w-2.5" />
            Allergies
          </Badge>
        )}
        {hasConditions && (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold px-1.5 py-0 h-5 border gap-0.5">
            <Heart className="h-2.5 w-2.5" />
            Conditions
          </Badge>
        )}
        {patient.insuranceProvider && (
          <Badge className="bg-blue-50 text-blue-600 border-blue-200 text-[10px] font-bold px-1.5 py-0 h-5 border gap-0.5">
            <Shield className="h-2.5 w-2.5" />
            Insured
          </Badge>
        )}
      </div>

      {/* Visit Stats */}
      <div className="hidden md:flex flex-col items-end gap-0.5 flex-shrink-0 min-w-[90px]">
        {recencyLabel && (
          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {recencyLabel}
          </span>
        )}
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          <Activity className="h-2.5 w-2.5" />
          {appointmentCount} visit{appointmentCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Action */}
      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
    </div>
  );
}
