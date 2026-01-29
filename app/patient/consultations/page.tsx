'use client';

/**
 * Patient Consultation Requests Page
 * 
 * Lists all consultation requests submitted by the patient.
 * Shows request status and allows viewing details.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { patientApi } from '@/lib/api/patient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, FileText, AlertCircle, CheckCircle2, ArrowRight, X } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { ConsultationRequestStatus } from '@/domain/enums/ConsultationRequestStatus';
import { getConsultationRequestStatusLabel } from '@/domain/enums/ConsultationRequestStatus';

export default function PatientConsultationsPage() {
  const { user, isAuthenticated } = useAuth();
  const [requests, setRequests] = useState<AppointmentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadConsultationRequests();
    }
  }, [isAuthenticated, user]);

  const loadConsultationRequests = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await patientApi.getAppointments(user.id);

      if (response.success && response.data) {
        // Filter for consultation requests (have consultation_request_status)
        const consultationRequests = response.data.filter(
          (apt) => apt.consultationRequestStatus !== undefined && apt.consultationRequestStatus !== null
        );
        setRequests(consultationRequests);
      }
    } catch (error) {
      console.error('Error loading consultation requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: ConsultationRequestStatus | undefined) => {
    if (!status) return null;

    const configs: Record<ConsultationRequestStatus, { className: string; icon: any }> = {
      [ConsultationRequestStatus.SUBMITTED]: {
        className: 'bg-blue-50 text-blue-700 border border-blue-200',
        icon: FileText,
      },
      [ConsultationRequestStatus.PENDING_REVIEW]: {
        className: 'bg-amber-50 text-amber-700 border border-amber-200',
        icon: Clock,
      },
      [ConsultationRequestStatus.NEEDS_MORE_INFO]: {
        className: 'bg-orange-50 text-orange-700 border border-orange-200',
        icon: AlertCircle,
      },
      [ConsultationRequestStatus.APPROVED]: {
        className: 'bg-green-50 text-green-700 border border-green-200',
        icon: CheckCircle2,
      },
      [ConsultationRequestStatus.SCHEDULED]: {
        className: 'bg-teal-50 text-teal-700 border border-teal-200',
        icon: Calendar,
      },
      [ConsultationRequestStatus.CONFIRMED]: {
        className: 'bg-green-100 text-green-800 border border-green-300',
        icon: CheckCircle2,
      },
      [ConsultationRequestStatus.COMPLETED]: {
        className: 'bg-slate-50 text-slate-700 border border-slate-200',
        icon: CheckCircle2,
      },
      [ConsultationRequestStatus.CANCELLED]: {
        className: 'bg-red-50 text-red-700 border border-red-200',
        icon: X,
      },
    };

    return configs[status];
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view your consultation requests</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading consultation requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">My Consultation Requests</h1>
          <p className="text-sm text-gray-600 mt-1">View and track your consultation requests</p>
        </div>
        <Link href="/patient/consultations/request">
          <Button className="bg-teal-600 hover:bg-teal-700">
            <Calendar className="h-4 w-4 mr-2" />
            Request Consultation
          </Button>
        </Link>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No consultation requests</h3>
            <p className="text-sm text-gray-600 mb-6">You haven't submitted any consultation requests yet.</p>
            <Link href="/patient/consultations/request">
              <Button className="bg-teal-600 hover:bg-teal-700">
                Request Consultation
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const statusConfig = getStatusConfig(request.consultationRequestStatus);
            const StatusIcon = statusConfig?.icon;

            return (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{request.type}</CardTitle>
                      <CardDescription className="mt-1">
                        {request.appointmentDate && format(new Date(request.appointmentDate), 'MMMM d, yyyy')} at {request.time}
                      </CardDescription>
                    </div>
                    {statusConfig && request.consultationRequestStatus && (
                      <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${statusConfig.className}`}>
                        {StatusIcon && <StatusIcon className="h-3 w-3" />}
                        {getConsultationRequestStatusLabel(request.consultationRequestStatus)}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {request.note && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{request.note}</p>
                  )}
                  <Link href={`/patient/appointments/${request.id}`}>
                    <Button variant="outline" size="sm">
                      View Details
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
