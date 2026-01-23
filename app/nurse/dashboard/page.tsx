'use client';

/**
 * Nurse Dashboard Overview
 * 
 * Main dashboard page showing:
 * - Welcome message
 * - Quick stats (patients to care for, pre/post-op, pending follow-ups)
 * - Today's checked-in patients
 * - Pending actions
 * 
 * REFACTORED: Replaced manual useState/useEffect fetch with React Query hooks
 * REASON: Eliminates manual loading state, error handling, and fetch logic.
 * Provides automatic caching, retries, and background refetching.
 */

import { useAuth } from '@/hooks/patient/useAuth';
import { useTodayCheckedInPatients, usePreOpPatients, usePostOpPatients } from '@/hooks/nurse/useNurseDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Activity, FileText, Bell, Clock } from 'lucide-react';
import Link from 'next/link';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { format } from 'date-fns';

export default function NurseDashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // REFACTORED: Replaced manual useState/useEffect with React Query
  // React Query handles: loading, error, retries, caching, deduplication automatically
  const { 
    data: checkedInPatients = [], 
    isLoading: loadingCheckedIn 
  } = useTodayCheckedInPatients(isAuthenticated && !!user);
  
  const { 
    data: preOpPatients = [], 
    isLoading: loadingPreOp 
  } = usePreOpPatients(isAuthenticated && !!user);
  
  const { 
    data: postOpPatients = [], 
    isLoading: loadingPostOp 
  } = usePostOpPatients(isAuthenticated && !!user);

  const loading = loadingCheckedIn || loadingPreOp || loadingPostOp;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

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

  const totalPatientsToCare = checkedInPatients.length;
  const pendingPreOp = preOpPatients.length;
  const pendingPostOp = postOpPatients.length;
  const pendingFollowUps = checkedInPatients.filter(
    (apt) =>
      apt.status === AppointmentStatus.SCHEDULED &&
      new Date(apt.appointmentDate) < new Date(),
  ).length;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome, Nurse {user.firstName || user.email}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Here's an overview of your patients and care assignments
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patients to Care</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPatientsToCare}</div>
            <p className="text-xs text-muted-foreground">Checked in today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pre-op Care</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPreOp}</div>
            <p className="text-xs text-muted-foreground">Requiring pre-op care</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Post-op Care</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPostOp}</div>
            <p className="text-xs text-muted-foreground">Requiring post-op care</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Follow-ups</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingFollowUps}</div>
            <p className="text-xs text-muted-foreground">Awaiting attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Checked-in Patients */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Today's Checked-in Patients</CardTitle>
              <CardDescription>Patients requiring care today</CardDescription>
            </div>
            <Link href="/nurse/patients">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading patients...</p>
            </div>
          ) : checkedInPatients.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No checked-in patients for today</p>
            </div>
          ) : (
            <div className="space-y-4">
              {checkedInPatients.slice(0, 10).map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">
                        Patient: {appointment.patientId}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Clock className="mr-1 h-4 w-4" />
                          {format(new Date(appointment.appointmentDate), 'h:mm a')}
                        </span>
                        <span>•</span>
                        <span>{appointment.type}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Status: <span className="font-medium">{appointment.status}</span>
                      </p>
                    </div>
                  </div>
                  <Link href={`/nurse/patients/${appointment.patientId}`}>
                    <Button variant="outline" size="sm">
                      View Patient
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pre-op Patients */}
      {preOpPatients.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pre-op Patients</CardTitle>
                <CardDescription>Patients requiring pre-operative care</CardDescription>
              </div>
              <Link href="/nurse/pre-post-op">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {preOpPatients.slice(0, 5).map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
                      <Activity className="h-6 w-6 text-warning" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">Patient: {appointment.patientId}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(appointment.appointmentDate), 'MMMM d, yyyy')} • {appointment.time}
                      </p>
                    </div>
                  </div>
                  <Link href={`/nurse/pre-post-op?patient=${appointment.patientId}&type=pre-op`}>
                    <Button variant="outline" size="sm">
                      Record Care
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Post-op Patients */}
      {postOpPatients.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Post-op Patients</CardTitle>
                <CardDescription>Patients requiring post-operative care</CardDescription>
              </div>
              <Link href="/nurse/pre-post-op">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {postOpPatients.slice(0, 5).map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                      <FileText className="h-6 w-6 text-success" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">Patient: {appointment.patientId}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(appointment.appointmentDate), 'MMMM d, yyyy')} • {appointment.time}
                      </p>
                    </div>
                  </div>
                  <Link href={`/nurse/pre-post-op?patient=${appointment.patientId}&type=post-op`}>
                    <Button variant="outline" size="sm">
                      Record Care
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
