'use client';

/**
 * Doctor Profile Page - Redesigned
 * 
 * Professional clinical dashboard with:
 * - Doctor Identity Card (fixed image clipping)
 * - Profile Actions Panel
 * - Weekly Availability Grid
 * - Activity Snapshot
 * - Professional Information
 * 
 * Integrated with system-wide workflow (booking, front desk, patient flow).
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Settings, GraduationCap, Award, Building2, User } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import type { DoctorAvailabilityResponseDto } from '@/application/dtos/DoctorAvailabilityResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { EditDoctorProfileDialog } from '@/components/doctor/EditDoctorProfileDialog';
import { EnhancedScheduleManager } from '@/components/doctor/EnhancedScheduleManager';
import { DoctorIdentityCard } from '@/components/doctor/DoctorIdentityCard';
import { ProfileActionsPanel } from '@/components/doctor/ProfileActionsPanel';
import { WeeklyAvailabilityGrid } from '@/components/doctor/WeeklyAvailabilityGrid';
import { ActivitySnapshot } from '@/components/doctor/ActivitySnapshot';

interface DoctorProfileData extends DoctorResponseDto {
  workingDays?: Array<{
    day: string;
    start_time: string;
    end_time: string;
  }>;
  colorCode?: string;
  type?: string;
}

export default function DoctorProfilePage() {
  const { user, isAuthenticated } = useAuth();
  const [doctorData, setDoctorData] = useState<DoctorProfileData | null>(null);
  const [availability, setAvailability] = useState<DoctorAvailabilityResponseDto | null>(null);
  const [appointments, setAppointments] = useState<AppointmentResponseDto[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<AppointmentResponseDto[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadDoctorProfile();
    }
  }, [isAuthenticated, user]);

  const loadDoctorProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [
        profileResponse,
        appointmentsResponse,
        availabilityResponse,
        todayResponse,
        upcomingResponse,
      ] = await Promise.all([
        doctorApi.getDoctorByUserId(user.id),
        doctorApi.getAppointments(user.id),
        doctorApi.getMyAvailability().catch(() => ({ success: false, data: null })),
        doctorApi.getTodayAppointments(user.id).catch(() => ({ success: false, data: null })),
        doctorApi.getUpcomingAppointments(user.id).catch(() => ({ success: false, data: null })),
      ]);

      if (profileResponse.success && profileResponse.data) {
        setDoctorData(profileResponse.data as DoctorProfileData);
      } else if (!profileResponse.success) {
        toast.error(profileResponse.error || 'Failed to load profile');
      }

      if (appointmentsResponse.success && appointmentsResponse.data) {
        setAppointments(appointmentsResponse.data);
      }

      if (availabilityResponse.success && availabilityResponse.data) {
        setAvailability(availabilityResponse.data);
      }

      if (todayResponse.success && todayResponse.data) {
        setTodayAppointments(todayResponse.data);
      }

      if (upcomingResponse.success && upcomingResponse.data) {
        setUpcomingAppointments(upcomingResponse.data);
      }
    } catch (error) {
      toast.error('An error occurred while loading profile');
      console.error('Error loading doctor profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view your profile</p>
          <Link href="/login">
            <Button className="mt-4">Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!doctorData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </div>
    );
  }

  const workingDays = doctorData.workingDays || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Doctor Profile</h1>
          <p className="mt-2 text-muted-foreground">Your professional profile and clinical dashboard</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowAvailabilityDialog(true)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Manage Schedule
          </Button>
          <Button
            onClick={() => setShowEditDialog(true)}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Section 1: Doctor Identity Card */}
      <DoctorIdentityCard
        doctor={doctorData}
        workingDays={workingDays}
        totalAppointments={appointments.length}
      />

      {/* Section 2: Profile Actions & Schedule Overview */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Actions Panel */}
        <div className="lg:col-span-1">
          <ProfileActionsPanel
            onEditProfile={() => setShowEditDialog(true)}
            onManageSchedule={() => setShowAvailabilityDialog(true)}
            doctorId={doctorData.id}
          />
        </div>

        {/* Schedule Overview */}
        <div className="lg:col-span-2">
          <WeeklyAvailabilityGrid
            availability={availability}
            appointments={appointments}
            onManageClick={() => setShowAvailabilityDialog(true)}
          />
        </div>
      </div>

      {/* Section 3: Activity Snapshot */}
      <ActivitySnapshot
        todayAppointments={todayAppointments}
        upcomingAppointments={upcomingAppointments}
        loading={loading}
      />

      {/* Section 4: Professional Information */}
      {(doctorData.bio || doctorData.education || doctorData.focusAreas || doctorData.professionalAffiliations) && (
        <Card>
          <CardHeader>
            <CardTitle>Professional Information</CardTitle>
            <CardDescription>Your qualifications and expertise</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {doctorData.bio && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Biography
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{doctorData.bio}</p>
              </div>
            )}

            {doctorData.education && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Education
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{doctorData.education}</p>
              </div>
            )}

            {doctorData.focusAreas && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Focus Areas
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{doctorData.focusAreas}</p>
              </div>
            )}

            {doctorData.professionalAffiliations && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Professional Affiliations
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {doctorData.professionalAffiliations}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Profile Dialog */}
      {doctorData && (
        <EditDoctorProfileDialog
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          onSuccess={() => {
            loadDoctorProfile();
            setShowEditDialog(false);
          }}
          doctor={doctorData}
        />
      )}

      {/* Manage Availability Dialog */}
      {doctorData && (
        <EnhancedScheduleManager
          open={showAvailabilityDialog}
          onClose={() => setShowAvailabilityDialog(false)}
          onSuccess={() => {
            loadDoctorProfile();
            setShowAvailabilityDialog(false);
          }}
          doctorId={doctorData.id}
        />
      )}
    </div>
  );
}
