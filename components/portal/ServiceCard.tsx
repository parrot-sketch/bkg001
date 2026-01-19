'use client';

/**
 * ServiceCard Component
 * 
 * Reusable component for displaying service information consistently across portal.
 * Used in service listings, booking flows, and service selection.
 * 
 * Variants:
 * - "selectable": For service selection in booking (clickable, shows selection state)
 * - "display": For displaying service info only (non-interactive)
 * 
 * Features:
 * - Consistent styling with portal design system
 * - Optional "Learn more" link to website
 * - Selection state handling
 */

import { CheckCircle2 } from 'lucide-react';

export interface ServiceCardProps {
  service: {
    id: number | string;
    service_name: string;
    description?: string;
    price?: number;
    category?: string;
  };
  variant?: 'selectable' | 'display';
  isSelected?: boolean;
  onSelect?: (serviceId: string) => void;
  showWebsiteLink?: boolean;
  className?: string;
}

/**
 * Generate website URL from service name
 * Pattern: "Facelift" → "https://www.nairobisculpt.com/facelift.html"
 */
function getServiceWebsiteUrl(serviceName: string): string | null {
  // Special cases for non-standard URLs
  const urlMap: Record<string, string> = {
    'Brazilian Butt Lift': 'https://www.nairobisculpt.com/bbl.html',
    'Breast Augmentation': 'https://www.nairobisculpt.com/breast-augmentation.html',
    'Scar Management': 'https://www.nairobisculpt.com/scar-management.html',
    'Non-Surgical Treatments': 'https://www.nairobisculpt.com/non-surgical.html',
    'Initial Consultation': '', // No dedicated page
    'Follow-up Consultation': '', // No dedicated page
  };

  if (urlMap[serviceName]) {
    return urlMap[serviceName] || null;
  }

  // Generate URL from service name: "Facelift" → "/facelift.html"
  const slug = serviceName.toLowerCase().replace(/\s+/g, '-');
  return `https://www.nairobisculpt.com/${slug}.html`;
}

export function ServiceCard({
  service,
  variant = 'display',
  isSelected = false,
  onSelect,
  showWebsiteLink = true,
  className = '',
}: ServiceCardProps) {
  const websiteUrl = getServiceWebsiteUrl(service.service_name);
  const isSelectable = variant === 'selectable';

  const handleClick = () => {
    if (isSelectable && onSelect) {
      onSelect(service.id.toString());
    }
  };

  return (
    <div
      className={`p-4 rounded-lg border-2 text-left transition-all min-h-[100px] ${
        isSelected
          ? 'border-teal-500 bg-teal-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      } ${isSelectable ? 'cursor-pointer' : ''} ${className}`}
      onClick={isSelectable ? handleClick : undefined}
    >
      {isSelectable ? (
        <button type="button" className="w-full text-left">
          <div className="font-medium text-slate-900 mb-1 flex items-start justify-between gap-2">
            <span>{service.service_name}</span>
            {isSelected && <CheckCircle2 className="h-4 w-4 text-teal-600 flex-shrink-0 mt-0.5" />}
          </div>
          {service.description && (
            <div className="text-xs text-gray-600 mt-1 line-clamp-2">{service.description}</div>
          )}
        </button>
      ) : (
        <>
          <div className="font-medium text-slate-900 mb-1">{service.service_name}</div>
          {service.description && (
            <div className="text-xs text-gray-600 mt-1 line-clamp-2">{service.description}</div>
          )}
          {service.price && (
            <div className="text-sm font-medium text-slate-900 mt-2">
              From {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(service.price)}
            </div>
          )}
        </>
      )}

      {/* Learn More Link */}
      {showWebsiteLink && websiteUrl && (
        <a
          href={websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-2 inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 hover:underline font-medium"
        >
          Learn more
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      )}
    </div>
  );
}