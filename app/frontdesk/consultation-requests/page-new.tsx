'use client';

/**
 * Simplified Consultation Requests Page
 * 
 * Modern, mobile-optimized interface for managing consultation requests.
 * Removed "review" terminology - uses simple, clear actions.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, AlertCircle, Clock, Filter } from 'lucide-react';
import { toast } from 'sonner';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { ConsultationRequestStatus } from '@/domain/enums/ConsultationRequestStatus';
import { ConsultationRequestCard } from '@/components/consultation/ConsultationRequestCard';
import { RequestInfoDialog } from '@/components/consultation/RequestInfoDialog';
import { DeclineConsultationDialog } from '@/components/consultation/DeclineConsultationDialog';

type ConsultationRequestWithMetadata = AppointmentResponseDto & {
  daysSinceSubmission?: number;
};

export default function ConsultationRequestsPage() {
  const { user, isAuthenticated } = useAuth();
  const [requests, setRequests] = useState<ConsultationRequestWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ConsultationRequestStatus | 'ALL'>(ConsultationRequestStatus.SUBMITTED);
  const [selectedRequest, setSelectedRequest] = useState<ConsultationRequestWithMetadata | null>(null);
  const [showRequestInfoDialog, setShowRequestInfoDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadConsultationRequests();
    }
  }, [isAuthenticated, user]);

  const loadConsultationRequests = async () => {
    try {
      setLoading(true);
      const response = await frontdeskApi.getPendingConsultations();

      if (response.success && response.data) {
        setRequests(response.data);
      } else if (!response.success) {
        toast.error(response.error || 'Failed to load consultation requests');
      } else {
        toast.error('Failed to load consultation requests');
      }
    } catch (error) {
      toast.error('An error occurred while loading consultation requests');
      console.error('Error loading consultation requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleSuccess = () => {
    loadConsultationRequests();
  };

  const handleRequestInfo = (request: ConsultationRequestWithMetadata) => {
    setSelectedRequest(request);
    setShowRequestInfoDialog(true);
  };

  const handleDecline = (request: ConsultationRequestWithMetadata) => {
    setSelectedRequest(request);
    setShowDeclineDialog(true);
  };

  const handleDialogClose = () => {
    setShowRequestInfoDialog(false);
    setShowDeclineDialog(false);
    setSelectedRequest(null);
  };

  const handleDialogSuccess = () => {
    handleDialogClose();
    loadConsultationRequests();
  };

  const filteredRequests = statusFilter === 'ALL'
    ? requests
    : requests.filter(req => req.consultationRequestStatus === statusFilter);

  const submittedCount = requests.filter(r => r.consultationRequestStatus === ConsultationRequestStatus.SUBMITTED).length;
  const pendingReviewCount = requests.filter(r => r.consultationRequestStatus === ConsultationRequestStatus.PENDING_REVIEW).length;
  const needsInfoCount = requests.filter(r => r.consultationRequestStatus === ConsultationRequestStatus.NEEDS_MORE_INFO).length;

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view consultation requests</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Consultation Requests</h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600">
          Manage patient consultation requests
        </p>
      </div>

      {/* Stats - Mobile Optimized */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{requests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">New</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{submittedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-amber-600">{pendingReviewCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Need Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">{needsInfoCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter - Mobile Optimized */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={statusFilter === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('ALL')}
              className="text-xs sm:text-sm"
            >
              All ({requests.length})
            </Button>
            <Button
              variant={statusFilter === ConsultationRequestStatus.SUBMITTED ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(ConsultationRequestStatus.SUBMITTED)}
              className="text-xs sm:text-sm"
            >
              New ({submittedCount})
            </Button>
            <Button
              variant={statusFilter === ConsultationRequestStatus.PENDING_REVIEW ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(ConsultationRequestStatus.PENDING_REVIEW)}
              className="text-xs sm:text-sm"
            >
              In Progress ({pendingReviewCount})
            </Button>
            <Button
              variant={statusFilter === ConsultationRequestStatus.NEEDS_MORE_INFO ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(ConsultationRequestStatus.NEEDS_MORE_INFO)}
              className="text-xs sm:text-sm"
            >
              Need Info ({needsInfoCount})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600">Loading requests...</p>
            </CardContent>
          </Card>
        ) : filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600">
                {statusFilter === 'ALL' ? 'No consultation requests found' : `No ${statusFilter} requests`}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((request) => (
            <ConsultationRequestCard
              key={request.id}
              request={request}
              onSchedule={handleScheduleSuccess}
              onRequestInfo={() => handleRequestInfo(request)}
              onDecline={() => handleDecline(request)}
            />
          ))
        )}
      </div>

      {/* Dialogs */}
      {showRequestInfoDialog && selectedRequest && user && (
        <RequestInfoDialog
          open={showRequestInfoDialog}
          onClose={handleDialogClose}
          onSuccess={handleDialogSuccess}
          appointment={selectedRequest}
          frontdeskUserId={user.id}
        />
      )}

      {showDeclineDialog && selectedRequest && user && (
        <DeclineConsultationDialog
          open={showDeclineDialog}
          onClose={handleDialogClose}
          onSuccess={handleDialogSuccess}
          appointment={selectedRequest}
          frontdeskUserId={user.id}
        />
      )}
    </div>
  );
}
