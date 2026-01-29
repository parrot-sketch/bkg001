'use client';

/**
 * Frontdesk Dashboard - Refactored with Clean Architecture
 * 
 * Pure composition of UI components with business logic in hooks.
 * Optimized for performance with proper memoization.
 */

import { useAuth } from '@/hooks/patient/useAuth';
import { useDashboardData } from '@/components/frontdesk/hooks/useDashboardData';
import { QuickActionCard } from '@/components/frontdesk/dashboard/QuickActionCard';
import { DashboardStats } from '@/components/frontdesk/dashboard/DashboardStats';
import { AvailableDoctorsPanel } from '@/components/frontdesk/AvailableDoctorsPanel';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  AlertCircle,
  QrCode,
  FileText,
  Loader2,
} from 'lucide-react';

export default function FrontdeskDashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { stats, loading } = useDashboardData();

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Auth state
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to access your dashboard</p>
          <Link href="/login">
            <Button className="mt-4">Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        {stats.newInquiries > 0 && (
          <QuickActionCard
            title="New Inquiries"
            count={stats.newInquiries}
            icon={AlertCircle}
            color="blue"
            href="/frontdesk/consultations?status=SUBMITTED,PENDING_REVIEW"
            description="waiting"
            actionText="Review now"
            loading={loading}
          />
        )}

        {stats.pendingCheckIns > 0 && (
          <QuickActionCard
            title="Check-ins"
            count={stats.pendingCheckIns}
            icon={Clock}
            color="amber"
            href="/frontdesk/appointments?status=PENDING"
            description="pending"
            actionText="Check in patients"
            loading={loading}
          />
        )}

        {stats.awaitingScheduling > 0 && (
          <QuickActionCard
            title="Ready to Schedule"
            count={stats.awaitingScheduling}
            icon={Calendar}
            color="green"
            href="/frontdesk/consultations?status=APPROVED"
            description="consultations"
            actionText="Schedule appointments"
            loading={loading}
          />
        )}

        <QuickActionCard
          title="New Walk-in"
          icon={QrCode}
          color="cyan"
          href="/frontdesk/intake/start"
          description="Start patient intake"
          actionText="Generate QR code"
        />

        <QuickActionCard
          title="Pending Intakes"
          count={stats.pendingIntakeCount}
          icon={FileText}
          color="indigo"
          href="/frontdesk/intake/pending"
          description="forms"
          actionText="Review & confirm"
          loading={loading}
        />
      </div>

      {/* Main Content Grid: 2 Columns on Desktop */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* Left Column: Doctors (3/4 width) */}
        <div className="xl:col-span-3">
          <AvailableDoctorsPanel />
        </div>

        {/* Right Column: Stats (1/4 width) */}
        <div className="xl:col-span-1">
          <DashboardStats stats={stats} />
        </div>
      </div>
    </div>
  );
}
