'use client';

import { useMemo, useState, useCallback } from 'react';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { format, isToday, startOfDay, startOfWeek, startOfMonth, isWithinInterval, parseISO } from 'date-fns';

export type DateRangePreset = 'today' | 'week' | 'month' | 'all';

interface UseAppointmentFiltersOptions {
  appointments: AppointmentResponseDto[];
}

interface UseAppointmentFiltersReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  dateRange: DateRangePreset;
  setDateRange: (range: DateRangePreset) => void;
  selectedStatuses: Set<AppointmentStatus>;
  toggleStatus: (status: AppointmentStatus) => void;
  clearFilters: () => void;
  filteredAppointments: AppointmentResponseDto[];
}

const STATUS_OPTIONS: AppointmentStatus[] = [
  AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.READY_FOR_CONSULTATION,
  AppointmentStatus.IN_CONSULTATION,
  AppointmentStatus.COMPLETED,
  AppointmentStatus.CANCELLED,
  AppointmentStatus.NO_SHOW,
];

export function useAppointmentFilters({ appointments }: UseAppointmentFiltersOptions): UseAppointmentFiltersReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<Set<AppointmentStatus>>(new Set());
  const [dateRange, setDateRange] = useState<DateRangePreset>('all');

  const toggleStatus = useCallback((status: AppointmentStatus) => {
    setSelectedStatuses(prev => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedStatuses(new Set());
    setDateRange('all');
  }, []);

  const statusFilter = useMemo(() => {
    if (selectedStatuses.size === 0) return 'ALL';
    if (selectedStatuses.size === 1) return Array.from(selectedStatuses)[0];
    return 'MULTI';
  }, [selectedStatuses]);

  const setStatusFilter = useCallback((status: string) => {
    if (status === 'ALL') {
      setSelectedStatuses(new Set());
    } else if (status === 'MULTI') {
      // Keep existing selection
    } else {
      setSelectedStatuses(new Set([status as AppointmentStatus]));
    }
  }, []);

  const filteredAppointments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = new Date();

    return appointments.filter((apt) => {
      const aptDate = new Date(apt.appointmentDate);

      if (dateRange !== 'all') {
        if (dateRange === 'today' && !isToday(aptDate)) return false;
        if (dateRange === 'week') {
          const weekStart = startOfWeek(now, { weekStartsOn: 1 });
          const weekEnd = startOfWeek(now, { weekStartsOn: 1 });
          weekEnd.setDate(weekEnd.getDate() + 7);
          if (!isWithinInterval(aptDate, { start: weekStart, end: weekEnd })) return false;
        }
        if (dateRange === 'month') {
          const monthStart = startOfMonth(now);
          const monthEnd = startOfMonth(now);
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          if (!isWithinInterval(aptDate, { start: monthStart, end: monthEnd })) return false;
        }
      }

      if (selectedStatuses.size > 0 && !selectedStatuses.has(apt.status as AppointmentStatus)) {
        return false;
      }

      if (q) {
        const patientName = apt.patient ? `${apt.patient.firstName} ${apt.patient.lastName}` : '';
        const fileNumber = apt.patient?.fileNumber ? String(apt.patient.fileNumber) : '';
        const type = apt.type ?? '';
        const note = apt.note ?? '';
        const date = apt.appointmentDate ? format(new Date(apt.appointmentDate), 'yyyy-MM-dd') : '';
        const time = apt.time ?? '';
        return (
          patientName.toLowerCase().includes(q) ||
          fileNumber.toLowerCase().includes(q) ||
          type.toLowerCase().includes(q) ||
          note.toLowerCase().includes(q) ||
          date.includes(q) ||
          time.includes(q)
        );
      }

      return true;
    }).sort((a, b) => {
      const dateCompare = new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime();
      if (dateCompare !== 0) return dateCompare;
      return (a.time || '').localeCompare(b.time || '');
    });
  }, [appointments, searchQuery, selectedStatuses, dateRange]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    dateRange,
    setDateRange,
    selectedStatuses,
    toggleStatus,
    clearFilters,
    filteredAppointments,
  };
}
