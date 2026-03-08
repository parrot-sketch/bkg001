import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useAppointmentsByDate } from '@/hooks/appointments/useAppointments';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { format, addDays, subDays, isToday, isTomorrow, isYesterday } from 'date-fns';
import { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

export function useAppointmentsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parse query params
  const dateParam = searchParams.get('date');
  const statusParam = searchParams.get('status');
  const highlightedId = searchParams.get('highlight') ? parseInt(searchParams.get('highlight')!) : null;
  const patientIdFilter = searchParams.get('patientId');

  // Date state
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (dateParam) {
      const [year, month, day] = dateParam.split('-').map(Number);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month - 1, day);
      }
    }
    return new Date();
  });

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    if (statusParam) {
      // Basic validation or just accept it as is; usually better to validate against known statuses
      return statusParam;
    }
    return 'ALL';
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Data fetch
  const {
    data: appointments = [],
    isLoading: loading,
    isRefetching,
    refetch,
  } = useAppointmentsByDate(selectedDate, isAuthenticated && !!user);

  /* ── Filtering ── */
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    if (patientIdFilter) {
      filtered = filtered.filter((apt: AppointmentResponseDto) => apt.patientId === patientIdFilter);
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((apt: AppointmentResponseDto) => apt.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((apt: AppointmentResponseDto) => {
        const patientName = apt.patient
          ? `${apt.patient.firstName} ${apt.patient.lastName}`.toLowerCase()
          : '';
        const doctorName = apt.doctor?.name?.toLowerCase() || '';
        const type = apt.type?.toLowerCase() || '';
        const time = apt.time?.toLowerCase() || '';
        const fileNumber = apt.patient?.fileNumber?.toLowerCase() || '';

        return (
          patientName.includes(q) ||
          doctorName.includes(q) ||
          type.includes(q) ||
          time.includes(q) ||
          fileNumber.includes(q)
        );
      });
    }

    return filtered;
  }, [appointments, statusFilter, searchQuery, patientIdFilter]);

  /* ── Status counts ── */
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: appointments.length };
    for (const apt of appointments) {
      counts[apt.status] = (counts[apt.status] || 0) + 1;
    }
    return counts;
  }, [appointments]);

  /* ── Pipeline stats ── */
  const pipelineStats = useMemo(() => ({
    awaitingDoctor: statusCounts[AppointmentStatus.PENDING_DOCTOR_CONFIRMATION] || 0,
    pendingCheckIns: (statusCounts[AppointmentStatus.SCHEDULED] || 0) + (statusCounts[AppointmentStatus.CONFIRMED] || 0),
    checkedIn: (statusCounts[AppointmentStatus.CHECKED_IN] || 0) + (statusCounts[AppointmentStatus.READY_FOR_CONSULTATION] || 0),
    inConsultation: statusCounts[AppointmentStatus.IN_CONSULTATION] || 0,
    completed: statusCounts[AppointmentStatus.COMPLETED] || 0,
  }), [statusCounts]);

  /* ── Handlers ── */
  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate((prev) =>
      direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1)
    );
  };

  const goToToday = () => setSelectedDate(new Date());

  /* ── Date label ── */
  const dateLabel = isToday(selectedDate)
    ? 'Today'
    : isTomorrow(selectedDate)
      ? 'Tomorrow'
      : isYesterday(selectedDate)
        ? 'Yesterday'
        : format(selectedDate, 'EEEE');

  return {
    user,
    isAuthenticated,
    authLoading,
    selectedDate,
    setSelectedDate,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    appointments,
    filteredAppointments,
    loading,
    isRefetching,
    refetch,
    pipelineStats,
    statusCounts,
    navigateDate,
    goToToday,
    dateLabel,
    patientIdFilter,
    highlightedId,
    router,
  };
}
