'use client';

/**
 * Consultation Inquiry Priority Banner
 * 
 * Prominent banner showing consultation inquiries that need patient attention.
 * Displays at the top of patient dashboard and other key pages.
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, CheckCircle2, MessageSquare, ArrowRight, Sparkles } from 'lucide-react';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { ConsultationRequestStatus } from '@/domain/enums/ConsultationRequestStatus';
import { getConsultationRequestStatusLabel, getConsultationRequestStatusDescription } from '@/domain/enums/ConsultationRequestStatus';
import { format } from 'date-fns';
import Link from 'next/link';

interface ConsultationInquiryBannerProps {
  inquiries: AppointmentResponseDto[];
  onAction?: (appointment: AppointmentResponseDto) => void;
}

export function ConsultationInquiryBanner({ inquiries, onAction }: ConsultationInquiryBannerProps) {
  if (inquiries.length === 0) {
    return null;
  }

  // Sort by priority: needs action first, then by status importance
  const sortedInquiries = [...inquiries].sort((a, b) => {
    const aStatus = a.consultationRequestStatus;
    const bStatus = b.consultationRequestStatus;
    
    // Prioritize inquiries that need patient action
    const aNeedsAction = aStatus === ConsultationRequestStatus.NEEDS_MORE_INFO || 
                         aStatus === ConsultationRequestStatus.SCHEDULED;
    const bNeedsAction = bStatus === ConsultationRequestStatus.NEEDS_MORE_INFO || 
                         bStatus === ConsultationRequestStatus.SCHEDULED;
    
    if (aNeedsAction && !bNeedsAction) return -1;
    if (!aNeedsAction && bNeedsAction) return 1;
    
    // Then by recency
    return new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime();
  });

  const topInquiry = sortedInquiries[0];
  const inquiryCount = inquiries.length;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-primary/5 to-primary/10 shadow-lg mb-6">
      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">
                  Consultation Inquiry {inquiryCount > 1 && `(${inquiryCount})`}
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {getConsultationRequestStatusDescription(topInquiry.consultationRequestStatus!)}
                </p>
              </div>
            </div>

            {/* Inquiry Details */}
            <div className="bg-white/60 rounded-lg p-4 border border-primary/10 mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusIcon status={topInquiry.consultationRequestStatus!} />
                  <span className="text-sm font-medium text-slate-900">
                    {getConsultationRequestStatusLabel(topInquiry.consultationRequestStatus!)}
                  </span>
                </div>
                {topInquiry.appointmentDate && (
                  <span className="text-xs text-gray-600">
                    {format(new Date(topInquiry.appointmentDate), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
              
              {topInquiry.type && (
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Service:</span> {topInquiry.type}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button
                asChild
                className="bg-primary hover:bg-primary/90 text-white shadow-sm"
              >
                <Link href="/patient/appointments">
                  View Details
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              
              {topInquiry.consultationRequestStatus === ConsultationRequestStatus.NEEDS_MORE_INFO && (
                <Button
                  variant="outline"
                  className="border-primary/30 text-primary hover:bg-primary/5"
                  onClick={() => onAction?.(topInquiry)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Provide Information
                </Button>
              )}
              
              {topInquiry.consultationRequestStatus === ConsultationRequestStatus.SCHEDULED && (
                <Button
                  variant="outline"
                  className="border-primary/30 text-primary hover:bg-primary/5"
                  onClick={() => onAction?.(topInquiry)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Session
                </Button>
              )}
            </div>

            {/* Multiple Inquiries Indicator */}
            {inquiryCount > 1 && (
              <div className="mt-4 pt-4 border-t border-primary/10">
                <p className="text-xs text-gray-600">
                  You have {inquiryCount} active consultation {inquiryCount === 1 ? 'inquiry' : 'inquiries'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function StatusIcon({ status }: { status: ConsultationRequestStatus }) {
  const iconClass = "h-4 w-4";
  
  switch (status) {
    case ConsultationRequestStatus.SUBMITTED:
    case ConsultationRequestStatus.PENDING_REVIEW:
      return <Clock className={`${iconClass} text-yellow-600`} />;
    case ConsultationRequestStatus.NEEDS_MORE_INFO:
      return <AlertCircle className={`${iconClass} text-orange-600`} />;
    case ConsultationRequestStatus.APPROVED:
    case ConsultationRequestStatus.SCHEDULED:
      return <CheckCircle2 className={`${iconClass} text-blue-600`} />;
    case ConsultationRequestStatus.CONFIRMED:
      return <CheckCircle2 className={`${iconClass} text-green-600`} />;
    default:
      return <AlertCircle className={`${iconClass} text-gray-400`} />;
  }
}
