'use client';

/**
 * DoctorCard Component
 * 
 * Reusable component for displaying doctor information consistently across portal.
 * Used in doctor listings, profile pages, and booking flows.
 * 
 * Variants:
 * - "compact": Minimal info for listings (default)
 * - "detailed": Full info for profile views
 * 
 * Features:
 * - Consistent styling with portal design system
 * - Optional CTA button
 * - Responsive layout
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Users, ArrowRight } from 'lucide-react';

export interface DoctorCardProps {
  doctor: {
    id: string;
    name: string;
    title?: string;
    specialization: string;
    profile_image?: string;
    bio?: string;
  };
  variant?: 'compact' | 'detailed';
  showCTA?: boolean;
  className?: string;
}

/**
 * Generate website URL from doctor name
 * Pattern matches Nairobi Sculpt website structure
 */
function getDoctorWebsiteUrl(doctorName: string): string | null {
  const urlMap: Record<string, string> = {
    'Dr. Mukami Gathariki': 'https://www.nairobisculpt.com/mukami.html',
    'Dr. Ken Aluora': 'https://www.nairobisculpt.com/dr-ken.html',
    'Dr. John Paul Ogalo': 'https://www.nairobisculpt.com/dr-john-paul-ogalo.html',
    'Dr. Angela Muoki': 'https://www.nairobisculpt.com/dr-angela-muoki.html',
    'Dr. Dorsi Jowi': 'https://www.nairobisculpt.com/dr-dorsi.html',
  };

  return urlMap[doctorName] || null;
}

export function DoctorCard({ doctor, variant = 'compact', showCTA = true, className = '' }: DoctorCardProps) {
  const websiteUrl = getDoctorWebsiteUrl(doctor.name);
  const isDetailed = variant === 'detailed';

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-md transition-all duration-300 flex flex-col ${className}`}
    >
      {/* Doctor Image */}
      <div className="mb-4">
        {doctor.profile_image ? (
          <img
            src={doctor.profile_image}
            alt={doctor.name}
            className={`${isDetailed ? 'w-24 h-24' : 'w-20 h-20'} rounded-full object-cover mx-auto border-2 border-gray-100`}
          />
        ) : (
          <div
            className={`${isDetailed ? 'w-24 h-24' : 'w-20 h-20'} rounded-full bg-gray-100 flex items-center justify-center mx-auto border-2 border-gray-200`}
          >
            <Users className={`${isDetailed ? 'h-12 w-12' : 'h-10 w-10'} text-gray-400`} />
          </div>
        )}
      </div>

      {/* Doctor Info */}
      <div className={`text-center mb-4 flex-grow`}>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">
          {doctor.title && `${doctor.title} `}
          {doctor.name}
        </h3>
        <p className="text-sm text-teal-600 font-medium mb-2">{doctor.specialization}</p>
        {isDetailed && doctor.bio && (
          <p className="text-xs text-gray-600 line-clamp-3 mt-2">{doctor.bio}</p>
        )}
      </div>

      {/* Actions */}
      {showCTA && (
        <div className="space-y-2 mt-auto">
          <Link href={`/portal/doctors/${doctor.id}`} className="block">
            <Button
              type="button"
              className="w-full h-11 bg-white border border-gray-300 text-slate-900 hover:bg-gray-50 hover:border-gray-400"
            >
              View Profile
            </Button>
          </Link>
          <Link href={`/portal/book-consultation?doctorId=${doctor.id}`} className="block">
            <Button className="w-full h-11 bg-teal-500 hover:bg-teal-600 text-white">
              Request Consultation
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          {websiteUrl && (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 text-xs text-teal-600 hover:text-teal-700 hover:underline font-medium py-2"
            >
              Learn more
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
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
      )}
    </div>
  );
}