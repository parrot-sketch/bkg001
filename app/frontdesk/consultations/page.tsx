'use client';

/**
 * Frontdesk Consultations Page
 * 
 * View and review consultation requests (inquiries).
 * Filter by consultation request status and take review actions.
 */

import { Suspense } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useConsultationsByStatus } from '@/hooks/consultations/useConsultations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { ConsultationRequestStatus, getConsultationRequestStatusLabel, getConsultationRequestStatusDescription } from '@/domain/enums/ConsultationRequestStatus';
import { AppointmentCard } from '@/components/patient/AppointmentCard';
import { ReviewConsultationDialog } from '@/components/frontdesk/ReviewConsultationDialog';
import { ConsultationStats } from '@/utils/consultation-filters';
import { CONSULTATION_CONFIG } from '@/lib/constants/frontdesk';

function FrontdeskConsultationsContent() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status') || CONSULTATION_CONFIG.DEFAULT_STATUS_FILTER;
  
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentResponseDto | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);

  // REFACTORED: Replaced manual useState/useEffect with React Query hook
  // Benefits: Automatic caching, retries, background refetching, loading state management
  const statuses: string[] = statusParam === CONSULTATION_CONFIG.ALL_STATUSES_FILTER
    ? Array.from(CONSULTATION_CONFIG.ALL_STATUSES_ARRAY)
    : statusParam.split(CONSULTATION_CONFIG.STATUS_FILTER_SEPARATOR).map(s => s.trim());

  const { 
    data: appointments = [], 
    isLoading,
    refetch 
  } = useConsultationsByStatus(statuses, isAuthenticated && !!user);

  const handleReview = (appointment: AppointmentResponseDto) => {
    setSelectedAppointment(appointment);
    setShowReviewDialog(true);
  };

  const handleReviewSuccess = () => {
    setShowReviewDialog(false);
    setSelectedAppointment(null);
    refetch(); // Refetch consultations after review
    toast.success('Consultation request reviewed successfully');
  };

  // Filter appointments by status
  const filteredAppointments = appointments.filter(apt => 
    apt.consultationRequestStatus && statuses.includes(apt.consultationRequestStatus)
  );

  // REFACTORED: Use extracted utility functions instead of inline filter logic
  // This eliminates duplication across dashboard and consultations pages
  const newInquiries = ConsultationStats.countNewInquiries(filteredAppointments);
  const awaitingClarification = ConsultationStats.countAwaitingClarification(filteredAppointments);
  const awaitingScheduling = ConsultationStats.countAwaitingScheduling(filteredAppointments);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view consultations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* REFACTORED: Removed titles/subtitles - function-driven UI */}

      {/* Status Filter Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={statusParam.includes('SUBMITTED') || statusParam.includes('PENDING_REVIEW') ? 'default' : 'outline'}
              size="sm"
              onClick={() => router.push('/frontdesk/consultations?status=SUBMITTED,PENDING_REVIEW')}
            >
              <FileText className="mr-2 h-4 w-4" />
              New Requests ({newInquiries})
            </Button>
            <Button
              variant={statusParam.includes('NEEDS_MORE_INFO') ? 'default' : 'outline'}
              size="sm"
              onClick={() => router.push('/frontdesk/consultations?status=NEEDS_MORE_INFO')}
            >
              <Clock className="mr-2 h-4 w-4" />
              Awaiting Clarification ({awaitingClarification})
            </Button>
            <Button
              variant={statusParam.includes('APPROVED') ? 'default' : 'outline'}
              size="sm"
              onClick={() => router.push('/frontdesk/consultations?status=APPROVED')}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Awaiting Scheduling ({awaitingScheduling})
            </Button>
            <Button
              variant={statusParam === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => router.push('/frontdesk/consultations?status=ALL')}
            >
              All Requests
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Consultations List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {statusParam === 'ALL' 
              ? 'Consultations' 
              : statuses.map(s => getConsultationRequestStatusLabel(s as ConsultationRequestStatus)).join(', ')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading requests...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No requests found for the selected status</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => {
                const needsReview = appointment.consultationRequestStatus === ConsultationRequestStatus.SUBMITTED ||
                                   appointment.consultationRequestStatus === ConsultationRequestStatus.PENDING_REVIEW;
                const canSchedule = appointment.consultationRequestStatus === ConsultationRequestStatus.APPROVED;

                return (
                  <div
                    key={appointment.id}
                    className="rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors space-y-3"
                  >
                    <AppointmentCard appointment={appointment} showDoctorInfo={true} />

                    {/* Consultation Request Status */}
                    {appointment.consultationRequestStatus && (
                      <div className="border-t border-border pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <AlertCircle className={`h-4 w-4 ${
                              appointment.consultationRequestStatus === ConsultationRequestStatus.SUBMITTED ||
                              appointment.consultationRequestStatus === ConsultationRequestStatus.PENDING_REVIEW
                                ? 'text-blue-500'
                                : appointment.consultationRequestStatus === ConsultationRequestStatus.NEEDS_MORE_INFO
                                ? 'text-yellow-500'
                                : appointment.consultationRequestStatus === ConsultationRequestStatus.APPROVED
                                ? 'text-green-500'
                                : 'text-muted-foreground'
                            }`} />
                            <span className="text-sm font-medium">Status:</span>
                            <span className={`text-sm font-medium ${
                              appointment.consultationRequestStatus === ConsultationRequestStatus.SUBMITTED ||
                              appointment.consultationRequestStatus === ConsultationRequestStatus.PENDING_REVIEW
                                ? 'text-blue-600'
                                : appointment.consultationRequestStatus === ConsultationRequestStatus.NEEDS_MORE_INFO
                                ? 'text-yellow-600'
                                : appointment.consultationRequestStatus === ConsultationRequestStatus.APPROVED
                                ? 'text-green-600'
                                : 'text-muted-foreground'
                            }`}>
                              {getConsultationRequestStatusLabel(appointment.consultationRequestStatus)}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {getConsultationRequestStatusDescription(appointment.consultationRequestStatus)}
                        </p>

                        {/* Action Buttons */}
                        <div className="pt-2 flex gap-2">
                          {needsReview && (
                            <Button
                              size="sm"
                              onClick={() => handleReview(appointment)}
                              className="flex-1"
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Review Request
                            </Button>
                          )}
                          {canSchedule && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/frontdesk/appointments?date=${new Date(appointment.appointmentDate).toISOString().split('T')[0]}`)}
                              className="flex-1"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Schedule Session
                            </Button>
                          )}
                          {appointment.consultationRequestStatus === ConsultationRequestStatus.NEEDS_MORE_INFO && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReview(appointment)}
                              className="flex-1"
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              Follow Up
                            </Button>
                          )}
                        </div>

                        {/* Review Notes */}
                        {appointment.reviewNotes && (
                          <div className="mt-2 p-2 bg-muted rounded text-xs">
                            <p className="font-medium text-muted-foreground mb-1">Review Notes:</p>
                            <p className="text-muted-foreground">{appointment.reviewNotes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      {showReviewDialog && selectedAppointment && (
        <ReviewConsultationDialog
          open={showReviewDialog}
          onClose={() => {
            setShowReviewDialog(false);
            setSelectedAppointment(null);
          }}
          onSuccess={handleReviewSuccess}
          appointment={selectedAppointment}
          frontdeskUserId={user.id}
        />
      )}
    </div>
  );
}

export default function FrontdeskConsultationsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    }>
      <FrontdeskConsultationsContent />
    </Suspense>
  );
}
