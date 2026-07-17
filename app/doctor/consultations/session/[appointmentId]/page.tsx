'use client';

import { use } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { ConsultationProvider } from '@/contexts/ConsultationContext';
import { ConsultationRoom } from './feature/ConsultationRoom';

interface PageProps {
  params: Promise<{ appointmentId: string }>;
}

export default function ConsultationSessionPageOptimized({ params }: PageProps) {
  const resolvedParams = use(params);
  const appointmentId = parseInt(resolvedParams.appointmentId, 10);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="h-14 w-14 rounded-2xl bg-white border border-[#e7d6bf] flex items-center justify-center mx-auto">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#caa26a] border-t-transparent" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-[#2c2e4b]">Loading Consultation Room…</p>
            <p className="text-xs text-[#2c2e4b]/60 mt-1">Preparing your workspace</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center p-8 bg-white border border-[#e7d6bf] max-w-md">
          <h2 className="text-base font-semibold text-[#2c2e4b] mb-2">Authentication required</h2>
          <p className="text-sm text-[#2c2e4b]/70 mb-6">Please log in to access the consultation room.</p>
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-[#e7d6bf] px-4 py-2 text-sm font-medium text-[#2c2e4b] hover:bg-[#e7d6bf]/10"
          >
            Return to login
          </a>
        </div>
      </div>
    );
  }

  if (isNaN(appointmentId)) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center space-y-3 border border-[#e7d6bf] bg-white p-6 max-w-md">
          <p className="text-sm font-semibold text-[#2c2e4b]">Invalid appointment ID</p>
          <p className="text-xs text-[#2c2e4b]/60">Please check the URL and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <ConsultationProvider initialAppointmentId={appointmentId}>
      <ConsultationRoom initialAppointmentId={appointmentId} />
    </ConsultationProvider>
  );
}
