'use client';

/**
 * Doctor Profile Page
 * 
 * Enhanced profile view matching patient-facing design.
 * Shows doctor image, specialization, working days, stats, and detailed information.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProfileImage } from '@/components/profile-image';
import { Calendar, Clock, Briefcase, Mail, Phone, MapPin, GraduationCap, Award, Building2, User } from 'lucide-react';
import { daysOfWeek } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import { format } from 'date-fns';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';

interface DoctorProfileData extends DoctorResponseDto {
  workingDays?: Array<{
    day: string;
    start_time: string;
    end_time: string;
  }>;
  colorCode?: string;
  type?: string;
}

/**
 * Helper function to get available days for working hours
 * Client-safe version (doesn't depend on server-only code)
 */
function getAvailableDays(workingDays: Array<{ day: string; start_time: string; end_time: string }>): string {
  const today = new Date().getDay();
  const todayDay = daysOfWeek[today];
  
  const isTodayWorkingDay = workingDays.find(
    (dayObj) => dayObj?.day?.toLowerCase() === todayDay?.toLowerCase()
  );

  return isTodayWorkingDay
    ? `${isTodayWorkingDay.start_time} - ${isTodayWorkingDay.end_time}`
    : 'Not Available';
}

export default function DoctorProfilePage() {
  const { user, isAuthenticated } = useAuth();
  const [doctorData, setDoctorData] = useState<DoctorProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalAppointments, setTotalAppointments] = useState(0);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadDoctorProfile();
    }
  }, [isAuthenticated, user]);

  const loadDoctorProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [profileResponse, appointmentsResponse] = await Promise.all([
        doctorApi.getDoctorByUserId(user.id),
        doctorApi.getAppointments(user.id),
      ]);

      if (profileResponse.success && profileResponse.data) {
        setDoctorData(profileResponse.data as DoctorProfileData);
      } else if (!profileResponse.success) {
        toast.error(profileResponse.error || 'Failed to load profile');
      }

      if (appointmentsResponse.success && appointmentsResponse.data) {
        setTotalAppointments(appointmentsResponse.data.length);
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
          <Link href="/patient/login">
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
  const workingHours = getAvailableDays(workingDays);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <p className="mt-2 text-muted-foreground">Your professional profile and information</p>
      </div>

      {/* Main Profile Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Header Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="bg-blue-50 dark:bg-blue-950/20 py-6 px-4 rounded-md flex-1 flex gap-4">
                  <ProfileImage
                    url={doctorData.profileImage}
                    name={doctorData.name}
                    className="size-20"
                    bgColor={doctorData.colorCode}
                    textClassName="text-4xl text-black dark:text-white"
                  />

                  <div className="w-2/3 flex flex-col justify-between gap-x-4">
                    <div className="flex items-center gap-4">
                      <h1 className="text-xl font-semibold uppercase">
                        {doctorData.title ? `${doctorData.title} ` : ''}{doctorData.name}
                      </h1>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {doctorData.address || doctorData.clinicLocation || 'No address information'}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-2 flex-wrap text-sm font-medium">
                      <div className="w-full flex text-base">
                        <span className="text-muted-foreground">License #:</span>
                        <p className="font-semibold ml-2">{doctorData.licenseNumber}</p>
                      </div>

                      <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                        <Briefcase className="text-lg text-muted-foreground" />
                        <span className="capitalize">{doctorData.specialization}</span>
                      </div>
                      {doctorData.type && (
                        <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                          <Building2 className="text-lg text-muted-foreground" />
                          <span className="capitalize">{doctorData.type}</span>
                        </div>
                      )}
                      <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                        <Mail className="text-lg text-muted-foreground" />
                        <span className="capitalize">{doctorData.email}</span>
                      </div>
                      <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                        <Phone className="text-lg text-muted-foreground" />
                        <span className="capitalize">{doctorData.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="flex-1 flex gap-4 justify-between flex-wrap">
                  <div className="doctorCard bg-white dark:bg-gray-800 p-4 rounded-lg border border-border">
                    <Briefcase className="size-5 text-primary" />
                    <div>
                      <h1 className="text-xl font-serif">{totalAppointments}</h1>
                      <span className="text-sm text-muted-foreground">Appointments</span>
                    </div>
                  </div>
                  <div className="doctorCard bg-white dark:bg-gray-800 p-4 rounded-lg border border-border">
                    <Calendar className="size-5 text-primary" />
                    <div>
                      <h1 className="text-xl font-serif">{workingDays.length}</h1>
                      <span className="text-sm text-muted-foreground">Working Days</span>
                    </div>
                  </div>
                  <div className="doctorCard bg-white dark:bg-gray-800 p-4 rounded-lg border border-border">
                    <Clock className="size-5 text-primary" />
                    <div>
                      <h1 className="text-sm font-serif">{workingHours}</h1>
                      <span className="text-sm text-muted-foreground">Working Hours</span>
                    </div>
                  </div>
                  <div className="doctorCard bg-white dark:bg-gray-800 p-4 rounded-lg border border-border">
                    <Calendar className="size-5 text-primary" />
                    <div>
                      <h1 className="text-sm font-serif">
                        {doctorData.createdAt ? format(new Date(doctorData.createdAt), 'yyyy-MM-dd') : 'N/A'}
                      </h1>
                      <span className="text-sm text-muted-foreground">Joined Date</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
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
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{doctorData.professionalAffiliations}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Quick Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{doctorData.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{doctorData.phone}</p>
                </div>
              </div>
              {doctorData.clinicLocation && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Clinic Location</p>
                    <p className="text-sm text-muted-foreground">{doctorData.clinicLocation}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/doctor/appointments">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  View Appointments
                </Button>
              </Link>
              <Link href="/doctor/dashboard">
                <Button variant="outline" className="w-full justify-start">
                  <Briefcase className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
