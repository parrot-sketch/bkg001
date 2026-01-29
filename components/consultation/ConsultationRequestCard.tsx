'use client';

/**
 * Simplified Consultation Request Card
 * 
 * Modern, mobile-optimized card for displaying consultation requests.
 * Removed "review" terminology - uses simple, clear actions.
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, FileText, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { ConsultationRequestStatus } from '@/domain/enums/ConsultationRequestStatus';
import { getConsultationRequestStatusLabel } from '@/domain/enums/ConsultationRequestStatus';
import { ScheduleConsultationDialog } from './ScheduleConsultationDialog';

interface ConsultationRequestCardProps {
  request: AppointmentResponseDto;
  onSchedule: () => void;
  onRequestInfo: () => void;
  onDecline: () => void;
}

export function ConsultationRequestCard({
  request,
  onSchedule,
  onRequestInfo,
  onDecline,
}: ConsultationRequestCardProps) {
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const status = request.consultationRequestStatus || ConsultationRequestStatus.SUBMITTED;

  const getStatusColor = () => {
    switch (status) {
      case ConsultationRequestStatus.SUBMITTED:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case ConsultationRequestStatus.PENDING_REVIEW:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case ConsultationRequestStatus.NEEDS_MORE_INFO:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case ConsultationRequestStatus.APPROVED:
        return 'bg-green-50 text-green-700 border-green-200';
      case ConsultationRequestStatus.SCHEDULED:
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case ConsultationRequestStatus.CONFIRMED:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <>
      <Card className="overflow-hidden border border-gray-200 hover:shadow-md transition-shadow">
        <div className="p-4 sm:p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="font-semibold text-gray-900 truncate">
                  Patient #{request.patientId.slice(0, 8)}
                </span>
                <Badge className={`${getStatusColor()} text-xs font-medium`}>
                  {getConsultationRequestStatusLabel(status)}
                </Badge>
              </div>
              
              <div className="space-y-1.5 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{request.type || 'Consultation'}</span>
                </div>
                
                {request.appointmentDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <span>
                      {format(new Date(request.appointmentDate), 'MMM d, yyyy')}
                      {request.time && ` at ${request.time}`}
                    </span>
                  </div>
                )}
                
                {request.createdAt && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <span>
                      Submitted {format(new Date(request.createdAt), 'MMM d')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Concern Preview */}
          {request.reason && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-900 mb-1">Primary Concern</p>
              <p className="text-sm text-blue-800 line-clamp-2">{request.reason}</p>
            </div>
          )}

          {/* Actions - Mobile Optimized */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100">
            <Button
              onClick={() => setShowScheduleDialog(true)}
              className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-medium h-10 sm:h-9"
              size="sm"
            >
              Schedule Consultation
            </Button>
            
            <div className="flex gap-2">
              <Button
                onClick={onRequestInfo}
                variant="outline"
                className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50 text-sm h-10 sm:h-9"
                size="sm"
              >
                Request Info
              </Button>
              
              <Button
                onClick={onDecline}
                variant="outline"
                className="flex-1 border-red-300 text-red-700 hover:bg-red-50 text-sm h-10 sm:h-9"
                size="sm"
              >
                Decline
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Schedule Dialog */}
      {showScheduleDialog && (
        <ScheduleConsultationDialog
          open={showScheduleDialog}
          onClose={() => setShowScheduleDialog(false)}
          onSuccess={() => {
            setShowScheduleDialog(false);
            onSchedule();
          }}
          appointment={request}
        />
      )}
    </>
  );
}
