'use client';

/**
 * Surgeon Dashboard - Redesigned
 * 
 * Three-zone layout:
 * - Zone 1: Today's workload (metric cards)
 * - Zone 2: Patient queue (live queue for consultations)
 * - Zone 3: Case pipeline (surgical cases by stage)
 * 
 * REFACTORED: Complete redesign to cover all doctor workflows
 * - Removed: Pending confirmations section, Today's Patient Flow, Upcoming Schedule
 * - Removed: Floating "Start consultation" card (replaced by PatientQueue)
 * - Added: Stats cards, PatientQueue component, CasePipeline tabs
 */

import { useAuth } from '@/hooks/patient/useAuth';
import { useState, useEffect } from 'react';
import { Activity, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { doctorApi } from '@/lib/api/doctor';

// New components
import { DashboardStats } from './components/DashboardStats';
import { PatientQueue } from './components/PatientQueue';
import { CasePipeline } from './components/CasePipeline';

export default function DoctorDashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // Get doctor ID - need to fetch doctor profile first
  const [doctorId, setDoctorId] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function fetchDoctorId() {
      if (!user?.id) return;
      try {
        const response = await doctorApi.getDoctorByUserId(user.id);
        if (response.success && response.data) {
          setDoctorId(response.data.id);
        }
      } catch (error) {
        console.error('Error fetching doctor ID:', error);
      }
    }
    if (isAuthenticated && user) {
      fetchDoctorId();
    }
  }, [isAuthenticated, user]);

  // Check onboarding status
  useEffect(() => {
    async function checkSetup() {
      if (!user) return;
      try {
        const availResponse = await doctorApi.getMyAvailability();
        const hasWorkingDays = availResponse.success &&
          availResponse.data?.workingDays?.some((d: any) => d.isAvailable);
        if (!hasWorkingDays) {
          setShowOnboarding(true);
        }
      } catch (e) {
        console.error("Failed to check onboarding status", e);
      } finally {
        setCheckingOnboarding(false);
      }
    }
    if (isAuthenticated) {
      checkSetup();
    }
  }, [isAuthenticated, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <div className="relative mb-4">
            <div className="h-16 w-16 rounded-full border-4 border-slate-100 border-t-emerald-500 animate-spin mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="h-6 w-6 text-slate-300" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500">Preparing clinical workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md">
          <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Authentication Required</h2>
          <p className="text-slate-500 mb-8">Please log in to your clinical account to access the dashboard.</p>
          <Link href="/login" className="w-full">
            <Button size="lg" className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg">
              Return to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      {/* Onboarding Widget */}
      {showOnboarding && !checkingOnboarding && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-amber-800">Complete Your Profile</h3>
              <p className="text-sm text-amber-600">Set up your availability to start receiving patients</p>
            </div>
            <Link href="/doctor/schedule">
              <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100">
                Set Availability
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Zone 1: Today's Workload - Stats Cards */}
      <section className="mb-6">
        <DashboardStats doctorId={doctorId} isAuthenticated={isAuthenticated} />
      </section>

      {/* Main Content: Queue + Pipeline */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Zone 2: Patient Queue (~40% width on XL) */}
        <div className="xl:col-span-5">
          <PatientQueue 
            doctorId={doctorId} 
            isAuthenticated={isAuthenticated} 
          />
        </div>

        {/* Zone 3: Case Pipeline (~60% width on XL) */}
        <div className="xl:col-span-7">
          <section className="bg-white border border-slate-200/60 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" />
                Surgical Case Pipeline
              </h2>
            </div>
            <CasePipeline />
          </section>
        </div>
      </div>
    </div>
  );
}
