'use client';

/**
 * ConsultationCTA Component
 * 
 * Reusable component for consistent "Request Consultation" CTAs
 * across the portal. Ensures all booking actions use the same styling and routing.
 * 
 * Variants:
 * - "primary": Main CTA (teal button)
 * - "secondary": Secondary CTA (outline button)
 * - "link": Text link style
 * 
 * Features:
 * - Preserves context (doctorId, serviceId) in booking URL
 * - Consistent "Request Consultation" label
 * - Mobile-optimized sizing
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowRight } from 'lucide-react';

export interface ConsultationCTAProps {
  doctorId?: string;
  serviceId?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'link';
  label?: string; // Override default label if needed
  className?: string;
  fullWidth?: boolean;
}

export function ConsultationCTA({
  doctorId,
  serviceId,
  variant = 'primary',
  label,
  className = '',
  fullWidth = false,
}: ConsultationCTAProps) {
  // Build booking URL with context
  const buildBookingUrl = () => {
    const baseUrl = '/patient/consultations/request';
    const params = new URLSearchParams();
    
    if (doctorId) {
      params.append('doctorId', doctorId);
    }
    if (serviceId) {
      params.append('serviceId', serviceId);
    }
    
    // Preserve context - add returnTo parameter based on current path
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      // If we're in the patient dashboard area, preserve that context
      if (currentPath.startsWith('/patient/')) {
        params.append('returnTo', currentPath);
      }
    }
    
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  };

  // Determine label based on context
  const getDefaultLabel = () => {
    // Always use "Request Consultation" - consistent terminology
    return label || 'Request Consultation';
  };

  const bookingUrl = buildBookingUrl();
  const displayLabel = getDefaultLabel();
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isOutline = variant === 'outline';
  const isLink = variant === 'link';

  if (isLink) {
    return (
      <Link
        href={bookingUrl}
        className={`inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 hover:underline font-medium ${className}`}
      >
        {displayLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    );
  }

  return (
    <Link href={bookingUrl} className={fullWidth ? 'block w-full' : 'inline-block'}>
      <Button
        type="button"
        variant={isOutline ? 'outline' : undefined}
        className={`h-11 px-6 ${
          isPrimary
            ? 'bg-teal-500 hover:bg-teal-600 text-white'
            : isOutline
            ? 'border-border text-gray-600 hover:border-accent/50 hover:text-foreground bg-white'
            : 'bg-white border border-gray-300 text-slate-900 hover:bg-gray-50 hover:border-gray-400'
        } ${fullWidth ? 'w-full' : ''} ${className}`}
      >
        {isPrimary && <Calendar className="h-4 w-4 mr-2" />}
        {displayLabel}
        {isPrimary && <ArrowRight className="h-4 w-4 ml-2" />}
      </Button>
    </Link>
  );
}