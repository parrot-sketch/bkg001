'use client';

/**
 * Client Portal Welcome Page
 * 
 * Modern, mobile-optimized onboarding page for authenticated users.
 * Clean, minimal design consistent with landing and login pages.
 * Focus: Book consultation, explore doctors, complete profile.
 * 
 * This is NOT a clinical dashboard - it's a client onboarding portal.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/patient/useAuth';
import { hasPatientProfile } from '@/lib/utils/patient';
import { Button } from '@/components/ui/button';
import { Calendar, Users, User, Info } from 'lucide-react';

export default function PortalWelcomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Redirect if user already has PatientProfile
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      hasPatientProfile(user.id).then((hasProfile) => {
        if (hasProfile) {
          // User is already a patient → redirect to clinical dashboard
          router.replace('/patient/dashboard');
        }
      });
    }
  }, [user, isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    router.replace('/patient/login');
    return null;
  }

  const firstName = user.firstName || user.email.split('@')[0];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Welcome Header - Clean, minimal */}
        <div className="text-center space-y-3 mb-12">
          <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
            Welcome, {firstName}
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            You're one step away from beginning your journey with Nairobi Sculpt.
            Complete your profile and book your consultation to get started.
          </p>
        </div>

        {/* Modern Action Cards - Mobile-optimized grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
          {/* Book Consultation - Primary Action */}
          <Link
            href="/portal/book-consultation"
            className="group relative overflow-hidden rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-white p-6 sm:p-8 hover:border-primary/40 transition-all duration-300 hover:shadow-lg"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">
                Submit an Inquiry
              </h3>
              <p className="text-sm text-gray-600 mb-6 flex-grow leading-relaxed">
                Share your preferences for a consultation with our expert surgeons
              </p>
              <div className="flex items-center text-primary font-medium text-sm group-hover:gap-2 transition-all">
                <span>Begin</span>
                <svg
                  className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Meet Our Doctors */}
          <Link
            href="/portal/doctors"
            className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 sm:p-8 hover:border-gray-300 hover:shadow-md transition-all duration-300"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-200 transition-colors duration-300">
                  <Users className="h-6 w-6 text-slate-700" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">
                Meet Our Doctors
              </h3>
              <p className="text-sm text-gray-600 mb-6 flex-grow">
                Learn about our experienced surgeons and their specializations
              </p>
              <div className="flex items-center text-slate-700 font-medium text-sm group-hover:text-slate-900 group-hover:gap-2 transition-all">
                <span>Explore</span>
                <svg
                  className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Complete Profile */}
          <Link
            href="/portal/profile"
            className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 sm:p-8 hover:border-gray-300 hover:shadow-md transition-all duration-300"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-200 transition-colors duration-300">
                  <User className="h-6 w-6 text-slate-700" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">
                Complete Profile
              </h3>
              <p className="text-sm text-gray-600 mb-6 flex-grow">
                Add your contact details and preferences to personalize your experience
              </p>
              <div className="flex items-center text-slate-700 font-medium text-sm group-hover:text-slate-900 group-hover:gap-2 transition-all">
                <span>Update Profile</span>
                <svg
                  className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Learn More */}
          <Link
            href="/#services"
            className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 sm:p-8 hover:border-gray-300 hover:shadow-md transition-all duration-300"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-200 transition-colors duration-300">
                  <Info className="h-6 w-6 text-slate-700" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">
                Learn More
              </h3>
              <p className="text-sm text-gray-600 mb-6 flex-grow">
                Explore our services, pricing, and what to expect during your visit
              </p>
              <div className="flex items-center text-slate-700 font-medium text-sm group-hover:text-slate-900 group-hover:gap-2 transition-all">
                <span>View Services</span>
                <svg
                  className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Help Section - Clean, minimal footer */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="text-center space-y-3">
            <p className="text-sm font-medium text-slate-900">
              Need help? We're here for you
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm text-gray-600">
              <a
                href="mailto:info@nairobisculpt.co.ke"
                className="text-primary hover:text-primary/80 hover:underline transition-colors font-medium"
              >
                info@nairobisculpt.co.ke
              </a>
              <span className="hidden sm:inline text-gray-400">•</span>
              <a
                href="tel:+254759067388"
                className="text-primary hover:text-primary/80 hover:underline transition-colors font-medium"
              >
                0759 067388
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
