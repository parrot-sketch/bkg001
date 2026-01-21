'use client';

/**
 * Consultation Request Status Banner
 * 
 * Compact, mobile-first banner showing consultation request status.
 * 
 * Design Principles:
 * - Mobile-first: Compact, minimal padding, essential info only
 * - Actionable: Clear status with direct actions
 * - Non-intrusive: Doesn't dominate the dashboard
 * - Purpose-driven: Status icon reflects actual state, not decorative
 */

import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, CheckCircle2, MessageSquare, ArrowRight, FileText } from 'lucide-react';
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
  const status = topInquiry.consultationRequestStatus!;
  const statusConfig = getStatusConfig(status);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4 md:p-5">
        <div className="flex items-start gap-3 md:gap-4">
          {/* Status Icon - Purpose-driven, not decorative */}
          <div className={`flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center ${statusConfig.iconBg}`}>
            <statusConfig.icon className={`h-5 w-5 md:h-6 md:w-6 ${statusConfig.iconColor}`} />
          </div>

          {/* Content - Compact and mobile-optimized */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Header */}
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm md:text-base font-semibold text-slate-900 leading-tight">
                  Consultation Request{inquiryCount > 1 && ` (${inquiryCount})`}
                </h3>
                {topInquiry.appointmentDate && (
                  <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                    {format(new Date(topInquiry.appointmentDate), 'MMM d')}
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm text-gray-600 leading-relaxed line-clamp-2">
                {getConsultationRequestStatusDescription(status)}
              </p>
            </div>

            {/* Status Badge - Compact */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${statusConfig.badgeClass}`}>
                <StatusIcon status={status} />
                {getConsultationRequestStatusLabel(status)}
              </span>
              {topInquiry.type && (
                <span className="text-xs text-gray-600 truncate max-w-[200px] md:max-w-none">
                  {topInquiry.type}
                </span>
              )}
            </div>

            {/* Actions - Mobile-friendly button layout */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                asChild
                size="sm"
                className="h-9 bg-teal-600 hover:bg-teal-700 text-white text-xs md:text-sm font-medium"
              >
                <Link href="/patient/consultations">
                  View Details
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Link>
              </Button>
              
              {status === ConsultationRequestStatus.NEEDS_MORE_INFO && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-gray-300 text-gray-700 hover:bg-gray-50 text-xs md:text-sm font-medium"
                  onClick={() => onAction?.(topInquiry)}
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                  Provide Info
                </Button>
              )}
              
              {status === ConsultationRequestStatus.SCHEDULED && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-gray-300 text-gray-700 hover:bg-gray-50 text-xs md:text-sm font-medium"
                  onClick={() => onAction?.(topInquiry)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Confirm
                </Button>
              )}
            </div>

            {/* Multiple Inquiries - Subtle indicator */}
            {inquiryCount > 1 && (
              <div className="pt-2 border-t border-gray-100">
                <Link 
                  href="/patient/consultations"
                  className="text-xs text-teal-600 hover:text-teal-700 hover:underline inline-flex items-center gap-1"
                >
                  View all {inquiryCount} requests
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Get status-specific configuration for icons and colors
 */
function getStatusConfig(status: ConsultationRequestStatus) {
  switch (status) {
    case ConsultationRequestStatus.SUBMITTED:
    case ConsultationRequestStatus.PENDING_REVIEW:
      return {
        icon: FileText,
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-600',
        badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
      };
    case ConsultationRequestStatus.NEEDS_MORE_INFO:
      return {
        icon: AlertCircle,
        iconBg: 'bg-orange-50',
        iconColor: 'text-orange-600',
        badgeClass: 'bg-orange-50 text-orange-700 border border-orange-200',
      };
    case ConsultationRequestStatus.APPROVED:
    case ConsultationRequestStatus.SCHEDULED:
      return {
        icon: Clock,
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-600',
        badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
      };
    case ConsultationRequestStatus.CONFIRMED:
      return {
        icon: CheckCircle2,
        iconBg: 'bg-green-50',
        iconColor: 'text-green-600',
        badgeClass: 'bg-green-50 text-green-700 border border-green-200',
      };
    default:
      return {
        icon: FileText,
        iconBg: 'bg-gray-50',
        iconColor: 'text-gray-600',
        badgeClass: 'bg-gray-50 text-gray-700 border border-gray-200',
      };
  }
}

/**
 * Status Icon Component
 * Small, meaningful icon for status badge
 */
function StatusIcon({ status }: { status: ConsultationRequestStatus }) {
  const iconClass = "h-3 w-3";
  
  switch (status) {
    case ConsultationRequestStatus.SUBMITTED:
    case ConsultationRequestStatus.PENDING_REVIEW:
      return <Clock className={iconClass} />;
    case ConsultationRequestStatus.NEEDS_MORE_INFO:
      return <AlertCircle className={iconClass} />;
    case ConsultationRequestStatus.APPROVED:
    case ConsultationRequestStatus.SCHEDULED:
      return <Clock className={iconClass} />;
    case ConsultationRequestStatus.CONFIRMED:
      return <CheckCircle2 className={iconClass} />;
    default:
      return <FileText className={iconClass} />;
  }
}
