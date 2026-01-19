'use client';

/**
 * Meet Our Doctors Page
 * 
 * Trust-building educational experience showcasing Nairobi Sculpt surgeons.
 * Mobile-first, clean, professional listing and profile views.
 * 
 * Features:
 * - Doctor listing with specialization filtering
 * - Full profile view (modal or expanded)
 * - "Request Consultation" CTA linking to booking
 * - Consistent with booking page design
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Users, ArrowRight, ExternalLink } from 'lucide-react';

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

export default function MeetOurDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('all');

  // Fetch doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/doctors');
        const result = await response.json();
        if (result.success && result.data) {
          setDoctors(result.data);
        }
      } catch (error) {
        console.error('Error fetching doctors:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  // Get unique specializations for filtering
  const specializations = Array.from(new Set(doctors.map((d) => d.specialization))).sort();

  // Filter doctors by specialization
  const filteredDoctors = doctors.filter(
    (doctor) => selectedSpecialization === 'all' || doctor.specialization === selectedSpecialization
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading doctors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 mb-3">Meet Our Doctors</h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl">
            Our experienced surgeons are dedicated to helping you achieve your aesthetic goals with personalized, safe, and effective care.
          </p>
        </div>

        {/* Specialization Filter */}
        {specializations.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedSpecialization('all')}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all h-11 ${
                  selectedSpecialization === 'all'
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-gray-200 bg-white text-slate-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                All Specializations
              </button>
              {specializations.map((spec) => (
                <button
                  key={spec}
                  type="button"
                  onClick={() => setSelectedSpecialization(spec)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all h-11 ${
                    selectedSpecialization === spec
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-gray-200 bg-white text-slate-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Doctor Cards Grid */}
        {filteredDoctors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredDoctors.map((doctor) => {
              const websiteUrl = getDoctorWebsiteUrl(doctor.name);
              
              return (
                <div
                  key={doctor.id}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-md transition-all duration-300 flex flex-col"
                >
                  {/* Doctor Image */}
                  <div className="mb-4">
                    {doctor.profile_image ? (
                      <img
                        src={doctor.profile_image}
                        alt={doctor.name}
                        className="w-24 h-24 rounded-full object-cover mx-auto border-2 border-gray-100"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto border-2 border-gray-200">
                        <Users className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Doctor Info */}
                  <div className="text-center mb-4 flex-grow">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">
                      {doctor.title && `${doctor.title} `}
                      {doctor.name}
                    </h3>
                    <p className="text-sm text-teal-600 font-medium mb-2">{doctor.specialization}</p>
                    {doctor.bio && (
                      <p className="text-xs text-gray-600 line-clamp-3 mt-2">{doctor.bio}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 mt-auto">
                    <Link href={`/portal/doctors/${doctor.id}`} className="block">
                      <Button
                        type="button"
                        className="w-full h-11 bg-white border border-gray-300 text-slate-900 hover:bg-gray-50 hover:border-gray-400"
                      >
                        View Profile
                      </Button>
                    </Link>
                    <Link
                      href={`/portal/book-consultation?doctorId=${doctor.id}`}
                      className="block"
                    >
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
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500 mb-2">No doctors found.</p>
            <p className="text-xs text-gray-400">Please try a different filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
