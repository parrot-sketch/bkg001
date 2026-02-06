'use client';

/**
 * Frontdesk Appointment Detail Page
 * 
 * Shows appointment details for frontdesk staff.
 * Read-only view with check-in capabilities.
 */

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  Stethoscope,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { useCheckIn } from '@/hooks/frontdesk/useTodaysSchedule';
import { AppointmentStatus, canCheckIn } from '@/domain/enums/AppointmentStatus';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function FrontdeskAppointmentDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const appointmentId = parseInt(id, 10);
  
  const { data: appointment, isLoading, error } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      const response = await frontdeskApi.getAppointment(appointmentId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load appointment');
      }
      return response.data;
    },
    enabled: !isNaN(appointmentId),
  });
  const { mutate: checkIn, isPending: isCheckingIn } = useCheckIn();

  const handleCheckIn = () => {
    checkIn({ appointmentId }, {
      onSuccess: () => {
        // Refresh the page data
        router.refresh();
      },
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
      PENDING_DOCTOR_CONFIRMATION: 'bg-blue-100 text-blue-800 border-blue-200',
      CONFIRMED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      SCHEDULED: 'bg-violet-100 text-violet-800 border-violet-200',
      CHECKED_IN: 'bg-teal-100 text-teal-800 border-teal-200',
      IN_CONSULTATION: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      COMPLETED: 'bg-green-100 text-green-800 border-green-200',
      CANCELLED: 'bg-red-100 text-red-800 border-red-200',
      NO_SHOW: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'Pending',
      PENDING_DOCTOR_CONFIRMATION: 'Awaiting Confirmation',
      CONFIRMED: 'Confirmed',
      SCHEDULED: 'Scheduled',
      CHECKED_IN: 'Checked In',
      READY_FOR_CONSULTATION: 'Ready',
      IN_CONSULTATION: 'In Consultation',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      NO_SHOW: 'No Show',
    };
    return labels[status] || status.replace(/_/g, ' ');
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, 'EEEE, MMMM d, yyyy');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Appointment Not Found</h2>
        <p className="text-slate-500 mb-4">The appointment you're looking for doesn't exist.</p>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const showCheckInButton = canCheckIn(appointment.status as AppointmentStatus);
  const patientName = appointment.patient 
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim()
    : 'Unknown Patient';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Appointment #{appointment.id}
            </h1>
            <p className="text-slate-500">View appointment details</p>
          </div>
        </div>
        <Badge className={getStatusColor(appointment.status)}>
          {getStatusLabel(appointment.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-slate-500" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-slate-600">
                    {patientName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{patientName}</h3>
                  {appointment.patient?.email && (
                    <p className="text-sm text-slate-500">{appointment.patient.email}</p>
                  )}
                  {appointment.patient?.phone && (
                    <p className="text-sm text-slate-500">{appointment.patient.phone}</p>
                  )}
                </div>
              </div>
              {appointment.patient?.fileNumber && (
                <div className="pt-4 border-t">
                  <span className="text-sm text-slate-500">File Number: </span>
                  <span className="text-sm font-medium">{appointment.patient.fileNumber}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Appointment Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-slate-500" />
                Appointment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="font-medium">{formatDate(appointment.appointmentDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Time</p>
                  <p className="font-medium flex items-center gap-1">
                    <Clock className="h-4 w-4 text-slate-400" />
                    {appointment.time}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Type</p>
                  <p className="font-medium capitalize">{appointment.type || 'General'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Doctor</p>
                  <p className="font-medium flex items-center gap-1">
                    <Stethoscope className="h-4 w-4 text-slate-400" />
                    {appointment.doctor?.name || 'Not assigned'}
                  </p>
                </div>
              </div>

              {appointment.note && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-slate-500 mb-1">Notes</p>
                  <p className="text-sm bg-slate-50 p-3 rounded-lg">{appointment.note}</p>
                </div>
              )}

              {appointment.reason && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-slate-500 mb-1">Reason</p>
                  <p className="text-sm bg-slate-50 p-3 rounded-lg">{appointment.reason}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {showCheckInButton && (
                <Button 
                  className="w-full bg-teal-600 hover:bg-teal-700"
                  onClick={handleCheckIn}
                  disabled={isCheckingIn}
                >
                  {isCheckingIn ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Checking In...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Check In Patient
                    </>
                  )}
                </Button>
              )}

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => router.push(`/frontdesk/patient/${appointment.patientId}`)}
              >
                <User className="h-4 w-4 mr-2" />
                View Patient Profile
              </Button>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => router.push('/frontdesk/appointments')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Back to Appointments
              </Button>
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {appointment.createdAt && (
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-slate-400 mt-2" />
                    <div>
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(appointment.createdAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                )}
                {appointment.checkedInAt && (
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-teal-500 mt-2" />
                    <div>
                      <p className="text-sm font-medium">Checked In</p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(appointment.checkedInAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                )}
                {appointment.consultationStartedAt && (
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-indigo-500 mt-2" />
                    <div>
                      <p className="text-sm font-medium">Consultation Started</p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(appointment.consultationStartedAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                )}
                {appointment.consultationEndedAt && (
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
                    <div>
                      <p className="text-sm font-medium">Consultation Completed</p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(appointment.consultationEndedAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
