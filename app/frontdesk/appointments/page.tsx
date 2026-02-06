'use client';

/**
 * Frontdesk Appointments Page
 * 
 * View and manage appointments with check-in functionality.
 * Filter by date or status, check-in patients when they arrive.
 * 
 * REFACTORED: Replaced manual useState/useEffect fetch with React Query hook
 * REASON: Eliminates manual loading state, error handling, and fetch logic.
 * Provides automatic caching, retries, and background refetching.
 */

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useAppointmentsByDate } from '@/hooks/appointments/useAppointments';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, CheckCircle, Clock, Filter, Search } from 'lucide-react';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { format } from 'date-fns';
import { CheckInDialog } from '@/components/frontdesk/CheckInDialog';
import { FrontdeskAppointmentCard } from '@/components/frontdesk/FrontdeskAppointmentCard';

export default function FrontdeskAppointmentsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  // Initialize status filter from URL params if available, otherwise default to ALL
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams?.status || 'ALL'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentResponseDto | null>(null);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);

  // REFACTORED: Replaced manual useState/useEffect with React Query
  // Using existing useAppointmentsByDate hook from hooks/appointments/useAppointments.ts
  const {
    data: appointments = [],
    isLoading: loading
  } = useAppointmentsByDate(
    new Date(selectedDate),
    isAuthenticated && !!user
  );

  // REFACTORED: Use useMemo for filtering instead of useEffect + useState
  // More efficient and follows React best practices
  // Note: AppointmentResponseDto has patientId and doctorId, not nested patient/doctor objects
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((apt) => apt.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (apt) =>
          apt.patientId?.toLowerCase().includes(query) ||
          apt.doctorId?.toLowerCase().includes(query) ||
          apt.type?.toLowerCase().includes(query) ||
          apt.time?.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [appointments, statusFilter, searchQuery]);

  const handleCheckIn = (appointment: AppointmentResponseDto) => {
    setSelectedAppointment(appointment);
    setShowCheckInDialog(true);
  };

  const handleCheckInSuccess = () => {
    setShowCheckInDialog(false);
    setSelectedAppointment(null);
    // REFACTORED: Invalidate query cache to refetch updated data
    queryClient.invalidateQueries({ queryKey: ['appointments', 'date', selectedDate] });
    toast.success('Patient checked in successfully');
  };

  // Appointments awaiting check-in: PENDING, SCHEDULED, CONFIRMED (patient can be checked in)
  const pendingCheckIns = appointments.filter(
    (apt) => apt.status === AppointmentStatus.PENDING ||
             apt.status === AppointmentStatus.SCHEDULED ||
             apt.status === AppointmentStatus.CONFIRMED,
  ).length;
  // Patients who have been checked in (waiting for consultation)
  const checkedIn = appointments.filter(
    (apt) => apt.status === AppointmentStatus.CHECKED_IN ||
             apt.status === AppointmentStatus.READY_FOR_CONSULTATION,
  ).length;

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view appointments</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0 pb-4 sm:pb-6 max-w-full overflow-x-hidden">
      {/* REFACTORED: Removed titles/subtitles - function-driven UI */}
      {/* Filters */}
      <Card>
        <CardHeader className="px-3 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="ALL">All Statuses</option>
                <option value={AppointmentStatus.PENDING}>Pending (Awaiting)</option>
                <option value={AppointmentStatus.SCHEDULED}>Scheduled (Confirmed)</option>
                <option value={AppointmentStatus.CHECKED_IN}>Checked In</option>
                <option value={AppointmentStatus.READY_FOR_CONSULTATION}>Ready for Doctor</option>
                <option value={AppointmentStatus.IN_CONSULTATION}>In Consultation</option>
                <option value={AppointmentStatus.COMPLETED}>Completed</option>
                <option value={AppointmentStatus.CANCELLED}>Cancelled</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by patient, type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-2xl sm:text-3xl font-semibold text-foreground">{appointments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-2xl font-bold">{pendingCheckIns}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Checked In</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-2xl font-bold">{checkedIn}</div>
          </CardContent>
        </Card>
      </div>

      {/* Appointments List */}
      <Card>
        <CardHeader className="px-3 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Appointments List</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Appointments for {format(new Date(selectedDate), 'MMMM d, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading sessions...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'No sessions match your filters'
                  : 'No sessions found for this date'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAppointments.map((appointment) => (
                <FrontdeskAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onCheckIn={handleCheckIn}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check-in Dialog */}
      {showCheckInDialog && selectedAppointment && (
        <CheckInDialog
          open={showCheckInDialog}
          onOpenChange={(isOpen) => {
            setShowCheckInDialog(isOpen);
            if (!isOpen) {
              setSelectedAppointment(null);
            }
            // Refresh data on close if success occurred (handled internally via react-query cache invalidation)
            // But if we want to ensure specific actions, we rely on the component's internal logic
            // or pass a callback if the component supports it.
            // Looking at CheckInDialog.tsx, it calls onOpenChange(false) on success.
            // To ensure we refresh data, we should probably check if query invalidation happened.
            // The CheckInDialog handles invalidation internally via useCheckIn hook.
            // So just closing the dialog is sufficient here.
          }}
          appointment={selectedAppointment}
        />
      )}
    </div>
  );
}
