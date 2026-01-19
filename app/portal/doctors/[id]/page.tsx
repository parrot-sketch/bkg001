'use client';

/**
 * Doctor Profile Page
 * 
 * Dedicated page view for individual doctor profiles.
 * Mobile-first, clean, professional design consistent with portal styling.
 * 
 * Features:
 * - Full doctor profile information
 * - Education, qualifications, focus areas
 * - Professional affiliations
 * - Contact information
 * - "Request Consultation" CTA
 * - Links to website profile
 */

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Users, GraduationCap, Award, MapPin, Mail, Phone, ArrowRight, ExternalLink, ArrowLeft, Calendar } from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
  title?: string;
  specialization: string;
  profile_image?: string;
  bio?: string;
  education?: string;
  focus_areas?: string;
  professional_affiliations?: string;
  clinic_location?: string;
  email?: string;
  phone?: string;
}

/**
 * Generate website URL from doctor name
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

export default function DoctorProfilePage() {
  const router = useRouter();
  const params = useParams();
  const doctorId = params?.id as string;

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch doctor data
  useEffect(() => {
    const fetchDoctor = async () => {
      if (!doctorId) {
        setError('Doctor ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch all doctors and find the one we need
        const response = await fetch('/api/doctors');
        const result = await response.json();

        if (result.success && result.data) {
          const foundDoctor = result.data.find((d: Doctor) => d.id === doctorId);
          if (foundDoctor) {
            setDoctor(foundDoctor);
          } else {
            setError('Doctor not found');
          }
        } else {
          setError('Failed to load doctor information');
        }
      } catch (err) {
        console.error('Error fetching doctor:', err);
        setError('Failed to load doctor information');
      } finally {
        setLoading(false);
      }
    };

    fetchDoctor();
  }, [doctorId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="h-8 w-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-600">Loading doctor profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-900 mb-2">Doctor Not Found</p>
              <p className="text-sm text-gray-600 mb-6">{error || 'The doctor you are looking for could not be found.'}</p>
              <Button
                onClick={() => router.push('/portal/doctors')}
                variant="outline"
                className="border-gray-300 hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Doctors
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const websiteUrl = getDoctorWebsiteUrl(doctor.name);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Back Button */}
        <Link
          href="/portal/doctors"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all doctors
        </Link>

        {/* Doctor Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              {doctor.profile_image ? (
                <img
                  src={doctor.profile_image}
                  alt={doctor.name}
                  className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-gray-100 shadow-md"
                />
              ) : (
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gray-100 flex items-center justify-center border-4 border-gray-200 shadow-md">
                  <Users className="h-16 w-16 sm:h-20 sm:w-20 text-gray-400" />
                </div>
              )}
            </div>

            {/* Doctor Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-2">
                {doctor.title && `${doctor.title} `}
                {doctor.name}
              </h1>
              <p className="text-base sm:text-lg text-teal-600 font-medium mb-3">{doctor.specialization}</p>
              
              {/* Contact Quick Info (Mobile-friendly) */}
              {(doctor.clinic_location || doctor.email || doctor.phone) && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mt-4">
                  {doctor.clinic_location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-teal-600 flex-shrink-0" />
                      <span className="truncate">{doctor.clinic_location}</span>
                    </div>
                  )}
                  {doctor.email && (
                    <a
                      href={`mailto:${doctor.email}`}
                      className="flex items-center gap-1.5 text-teal-600 hover:underline"
                    >
                      <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="truncate">{doctor.email}</span>
                    </a>
                  )}
                  {doctor.phone && (
                    <a
                      href={`tel:${doctor.phone}`}
                      className="flex items-center gap-1.5 text-teal-600 hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span>{doctor.phone}</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Primary Action Button - Sticky on Mobile */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={`/portal/book-consultation?doctorId=${doctor.id}`}
              className="flex-1 sm:flex-none"
            >
              <Button className="w-full sm:w-auto h-11 bg-teal-500 hover:bg-teal-600 text-white">
                <Calendar className="h-4 w-4 mr-2" />
                Request Consultation
              </Button>
            </Link>
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none"
              >
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto h-11 border-gray-300 hover:bg-gray-50"
                >
                  View Full Profile
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Doctor Details */}
        <div className="space-y-8">
          {/* About */}
          {doctor.bio && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Award className="h-5 w-5 text-teal-600" />
                About
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-line">
                  {doctor.bio}
                </p>
              </div>
            </section>
          )}

          {/* Education & Qualifications */}
          {doctor.education && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-teal-600" />
                Education & Qualifications
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-line">
                  {doctor.education}
                </p>
              </div>
            </section>
          )}

          {/* Focus Areas */}
          {doctor.focus_areas && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Award className="h-5 w-5 text-teal-600" />
                Focus Areas
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-line">
                  {doctor.focus_areas}
                </p>
              </div>
            </section>
          )}

          {/* Professional Affiliations */}
          {doctor.professional_affiliations && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Award className="h-5 w-5 text-teal-600" />
                Professional Affiliations
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-line">
                  {doctor.professional_affiliations}
                </p>
              </div>
            </section>
          )}

          {/* Contact Information (Full Section) */}
          {(doctor.clinic_location || doctor.email || doctor.phone) && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-teal-600" />
                Contact Information
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6 space-y-3">
                {doctor.clinic_location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Location</p>
                      <p className="text-sm sm:text-base text-gray-700">{doctor.clinic_location}</p>
                    </div>
                  </div>
                )}
                {doctor.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email</p>
                      <a
                        href={`mailto:${doctor.email}`}
                        className="text-sm sm:text-base text-teal-600 hover:underline"
                      >
                        {doctor.email}
                      </a>
                    </div>
                  </div>
                )}
                {doctor.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Phone</p>
                      <a
                        href={`tel:${doctor.phone}`}
                        className="text-sm sm:text-base text-teal-600 hover:underline"
                      >
                        {doctor.phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Bottom CTA - Sticky on Mobile */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={`/portal/book-consultation?doctorId=${doctor.id}`}
              className="flex-1"
            >
              <Button className="w-full h-11 bg-teal-500 hover:bg-teal-600 text-white">
                <Calendar className="h-4 w-4 mr-2" />
                Request Consultation with {doctor.name.split(' ').pop()}
              </Button>
            </Link>
            <Link
              href="/portal/doctors"
              className="sm:hidden"
            >
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 border-gray-300 hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Doctors
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
