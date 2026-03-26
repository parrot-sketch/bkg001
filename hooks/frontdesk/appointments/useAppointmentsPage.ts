import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useAppointmentsByDate } from '@/hooks/appointments/useAppointments';
import { useSearchParams, useRouter } from 'next/navigation';
import { format, addDays, subDays, isToday, isTomorrow, isYesterday } from 'date-fns';
import { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { APPOINTMENT_CONFIG, PipelineStats, StatusCounts } from '@/lib/constants/frontdesk';

interface UseAppointmentsPageResult {
  user: ReturnType<typeof useAuth>['user'];
  isAuthenticated: boolean;
  authLoading: boolean;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  appointments: AppointmentResponseDto[];
  filteredAppointments: AppointmentResponseDto[];
  loading: boolean;
  error: Error | null;
  isRefetching: boolean;
  refetch: () => void;
  pipelineStats: PipelineStats;
  statusCounts: StatusCounts;
  handleNavigateDate: (direction: 'prev' | 'next') => void;
  handleGoToToday: () => void;
  dateLabel: string;
  patientIdFilter: string | null;
  highlightedId: number | null;
  router: ReturnType<typeof useRouter>;
}

export function useAppointmentsPage(): UseAppointmentsPageResult {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const dateParam = searchParams.get('date');
  const statusParam = searchParams.get('status');
  const highlightedId = searchParams.get('highlight')
    ? parseInt(searchParams.get('highlight')!, 10)
    : null;
  const patientIdFilter = searchParams.get('patientId');

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (dateParam) {
      const [year, month, day] = dateParam.split('-').map(Number);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month - 1, day);
      }
    }
    return new Date();
  });

  const [statusFilter, setStatusFilter] = useState<string>(() => {
    if (statusParam) {
      return statusParam;
    }
    return APPOINTMENT_CONFIG.DEFAULT_STATUS_FILTER;
  });
  const [searchQuery, setSearchQuery] = useState<string>('');

  const {
    data: appointments = [],
    isLoading: loading,
    isError: isAppointmentsError,
    error: appointmentsError,
    isRefetching,
    refetch,
  } = useAppointmentsByDate(selectedDate, isAuthenticated && !!user);

  const error = isAppointmentsError ? appointmentsError : null;

  const filteredAppointments = useMemo((): AppointmentResponseDto[] => {
    let filtered = appointments;

    if (patientIdFilter) {
      filtered = filtered.filter((apt: AppointmentResponseDto) => apt.patientId === patientIdFilter);
    }

    if (statusFilter !== APPOINTMENT_CONFIG.ALL_STATUSES_FILTER) {
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

  const statusCounts = useMemo((): StatusCounts => {
    const counts: StatusCounts = {
      [APPOINTMENT_CONFIG.ALL_STATUSES_FILTER]: appointments.length,
    };
    for (const apt of appointments) {
      counts[apt.status] = (counts[apt.status] || 0) + 1;
    }
    return counts;
  }, [appointments]);

  const pipelineStats = useMemo((): PipelineStats => ({
    awaitingDoctor: statusCounts[AppointmentStatus.PENDING_DOCTOR_CONFIRMATION] || 0,
    pendingCheckIns: (statusCounts[AppointmentStatus.SCHEDULED] || 0) + (statusCounts[AppointmentStatus.CONFIRMED] || 0),
    checkedIn: (statusCounts[AppointmentStatus.CHECKED_IN] || 0) + (statusCounts[AppointmentStatus.READY_FOR_CONSULTATION] || 0),
    inConsultation: statusCounts[AppointmentStatus.IN_CONSULTATION] || 0,
    completed: statusCounts[AppointmentStatus.COMPLETED] || 0,
  }), [statusCounts]);

  const handleNavigateDate = useCallback((direction: 'prev' | 'next'): void => {
    setSelectedDate((prev: Date): Date =>
      direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1)
    );
  }, []);

  const handleGoToToday = useCallback((): void => {
    setSelectedDate(new Date());
  }, []);

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
    error,
    isRefetching,
    refetch,
    pipelineStats,
    statusCounts,
    handleNavigateDate,
    handleGoToToday,
    dateLabel,
    patientIdFilter,
    highlightedId,
    router,
  };
}
