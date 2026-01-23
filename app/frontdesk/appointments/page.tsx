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
import { AppointmentCard } from '@/components/patient/AppointmentCard';

export default function FrontdeskAppointmentsPage() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
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

  const pendingCheckIns = appointments.filter(
    (apt) => apt.status === AppointmentStatus.PENDING,
  ).length;
  const checkedIn = appointments.filter((apt) => apt.status === AppointmentStatus.SCHEDULED).length;

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
                <option value={AppointmentStatus.PENDING}>Pending</option>
                <option value={AppointmentStatus.SCHEDULED}>Checked In</option>
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
            <div className="space-y-3 sm:space-y-4">
              {filteredAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 rounded-lg border border-border p-3 sm:p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <AppointmentCard appointment={appointment} showDoctorInfo={true} />
                  </div>
                  <div className="flex items-center justify-end sm:justify-start space-x-2 flex-shrink-0 sm:ml-4">
                    {appointment.status === AppointmentStatus.PENDING && (
                      <Button 
                        size="sm" 
                        onClick={() => handleCheckIn(appointment)}
                        className="w-full sm:w-auto min-h-[44px]"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Check In
                      </Button>
                    )}
                    {appointment.status === AppointmentStatus.SCHEDULED && (
                      <span className="text-xs sm:text-sm font-medium text-green-600 whitespace-nowrap">
                        Checked In
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check-in Dialog */}
      {showCheckInDialog && selectedAppointment && (
        <CheckInDialog
          open={showCheckInDialog}
          onClose={() => {
            setShowCheckInDialog(false);
            setSelectedAppointment(null);
          }}
          onSuccess={handleCheckInSuccess}
          appointment={selectedAppointment}
          frontdeskUserId={user.id}
        />
      )}
    </div>
  );
}
