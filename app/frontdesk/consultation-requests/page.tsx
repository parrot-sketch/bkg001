'use client';

/**
 * Frontdesk Consultation Requests Page
 * 
 * Review and manage consultation requests from patients.
 * Shows SUBMITTED and PENDING_REVIEW requests with quick actions.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { ConsultationRequestStatus } from '@/domain/enums/ConsultationRequestStatus';
import { format, differenceInDays } from 'date-fns';
import { ReviewConsultationDialog } from '@/components/frontdesk/ReviewConsultationDialog';

type ConsultationRequestWithMetadata = AppointmentResponseDto & {
  daysSinceSubmission?: number;
};

export default function ConsultationRequestsPage() {
  const { user, isAuthenticated } = useAuth();
  const [requests, setRequests] = useState<ConsultationRequestWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ConsultationRequestWithMetadata | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ConsultationRequestStatus | 'ALL'>(ConsultationRequestStatus.SUBMITTED);

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

  const handleReviewSuccess = () => {
    setShowReviewDialog(false);
    setSelectedRequest(null);
    loadConsultationRequests();
  };

  const handleReviewClick = (request: ConsultationRequestWithMetadata, action: 'approve' | 'needs_more_info' | 'reject') => {
    setSelectedRequest(request);
    // Open dialog with action pre-selected
    setShowReviewDialog(true);
  };

  const filteredRequests = statusFilter === 'ALL'
    ? requests
    : requests.filter(req => req.consultationRequestStatus === statusFilter);

  const submittedCount = requests.filter(r => r.consultationRequestStatus === ConsultationRequestStatus.SUBMITTED).length;
  const pendingReviewCount = requests.filter(r => r.consultationRequestStatus === ConsultationRequestStatus.PENDING_REVIEW).length;

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view consultation requests</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Consultation Requests</h1>
        <p className="mt-2 text-muted-foreground">Review and triage patient consultation requests</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
            <p className="text-xs text-muted-foreground">Requests awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submittedCount}</div>
            <p className="text-xs text-muted-foreground">New requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReviewCount}</div>
            <p className="text-xs text-muted-foreground">In review</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('ALL')}
            >
              All ({requests.length})
            </Button>
            <Button
              variant={statusFilter === ConsultationRequestStatus.SUBMITTED ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(ConsultationRequestStatus.SUBMITTED)}
            >
              Submitted ({submittedCount})
            </Button>
            <Button
              variant={statusFilter === ConsultationRequestStatus.PENDING_REVIEW ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(ConsultationRequestStatus.PENDING_REVIEW)}
            >
              Under Review ({pendingReviewCount})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Consultation Requests</CardTitle>
          <CardDescription>
            Review and take action on patient consultation requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                {statusFilter === 'ALL' ? 'No consultation requests found' : `No ${statusFilter} requests`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <ConsultationRequestCard
                  key={request.id}
                  request={request}
                  onApprove={() => handleReviewClick(request, 'approve')}
                  onRequestInfo={() => handleReviewClick(request, 'needs_more_info')}
                  onReject={() => handleReviewClick(request, 'reject')}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      {showReviewDialog && selectedRequest && user && (
        <ReviewConsultationDialog
          open={showReviewDialog}
          onClose={() => {
            setShowReviewDialog(false);
            setSelectedRequest(null);
          }}
          onSuccess={handleReviewSuccess}
          appointment={selectedRequest}
          frontdeskUserId={user.id}
        />
      )}
    </div>
  );
}

interface ConsultationRequestCardProps {
  request: ConsultationRequestWithMetadata;
  onApprove: () => void;
  onRequestInfo: () => void;
  onReject: () => void;
}

function ConsultationRequestCard({
  request,
  onApprove,
  onRequestInfo,
  onReject,
}: ConsultationRequestCardProps) {
  const status = request.consultationRequestStatus;
  const daysSinceSubmission = request.daysSinceSubmission || 0;

  const getStatusBadge = () => {
    switch (status) {
      case ConsultationRequestStatus.SUBMITTED:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">Submitted</span>;
      case ConsultationRequestStatus.PENDING_REVIEW:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">Under Review</span>;
      default:
        return null;
    }
  };

  return (
    <div className="rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Patient ID: {request.patientId}</span>
            {getStatusBadge()}
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Service: {request.type}</span>
            </div>
            {request.appointmentDate && (
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>
                  Preferred: {format(new Date(request.appointmentDate), 'MMM d, yyyy')} at {request.time}
                </span>
              </div>
            )}
            {request.createdAt && (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>
                  Submitted {daysSinceSubmission} {daysSinceSubmission === 1 ? 'day' : 'days'} ago
                </span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Clinical Summary Section */}
      {request.reason && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-semibold text-foreground">Primary Concern</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{request.reason}</p>
        </div>
      )}

      {/* Prepared by Indicator (if reviewed) */}
      {request.reviewedBy && request.reviewedAt && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>Prepared by assistant • {format(new Date(request.reviewedAt), 'MMM d, yyyy')}</span>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center space-x-2 pt-2 border-t border-border">
        <Button
          size="sm"
          onClick={onApprove}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          Accept for Consultation
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onRequestInfo}
          className="flex-1 border-yellow-300 text-yellow-700 hover:bg-yellow-50"
        >
          Request Clarification
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={onReject}
          className="flex-1"
        >
          Not Suitable
        </Button>
      </div>
    </div>
  );
}
