'use client';

/**
 * Admin Dashboard Overview
 * 
 * Main dashboard page showing:
 * - Welcome message
 * - Quick stats (patients, staff, appointments, pending tasks)
 * - Analytics (appointment trends, patient intake)
 * - Alerts and notifications
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { adminApi } from '@/lib/api/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  UserCheck,
  Calendar,
  FileText,
  AlertCircle,
  TrendingUp,
  Activity,
  Bell,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface DashboardStats {
  totalPatients: number;
  totalStaff: number;
  totalDoctors: number;
  totalNurses: number;
  totalFrontdesk: number;
  appointmentsToday: number;
  appointmentsUpcoming: number;
  pendingPreOp: number;
  pendingPostOp: number;
  pendingApprovals: number;
}

export default function AdminDashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [appointmentTrends, setAppointmentTrends] = useState<{ date: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadDashboardData();
    }
  }, [isAuthenticated, user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, trendsResponse] = await Promise.all([
        adminApi.getDashboardStats(),
        adminApi.getAppointmentTrends(30),
      ]);

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      } else if (!statsResponse.success) {
        toast.error(statsResponse.error || 'Failed to load dashboard stats');
      } else {
        toast.error('Failed to load dashboard stats');
      }

      if (trendsResponse.success && trendsResponse.data) {
        setAppointmentTrends(trendsResponse.data);
      }
    } catch (error) {
      toast.error('An error occurred while loading dashboard data');
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome, {user.firstName || 'Admin'} {user.lastName || ''}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Here's an overview of your healthcare management system
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPatients ?? 0}</div>
            <p className="text-xs text-muted-foreground">Registered patients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalStaff ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalDoctors ?? 0} Doctors, {stats?.totalNurses ?? 0} Nurses,{' '}
              {stats?.totalFrontdesk ?? 0} Frontdesk
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.appointmentsToday ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.appointmentsUpcoming ?? 0} upcoming
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.pendingPreOp ?? 0) + (stats?.pendingPostOp ?? 0) + (stats?.pendingApprovals ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.pendingApprovals ?? 0} approvals, {stats?.pendingPreOp ?? 0} pre-op,{' '}
              {stats?.pendingPostOp ?? 0} post-op
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Staff Breakdown */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doctors</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDoctors ?? 0}</div>
            <p className="text-xs text-muted-foreground">Active physicians</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nurses</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalNurses ?? 0}</div>
            <p className="text-xs text-muted-foreground">Active nurses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Frontdesk</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalFrontdesk ?? 0}</div>
            <p className="text-xs text-muted-foreground">Frontdesk staff</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Notifications */}
      {stats && (stats.pendingApprovals > 0 || stats.pendingPreOp > 0 || stats.pendingPostOp > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-warning" />
              Alerts & Notifications
            </CardTitle>
            <CardDescription>Pending actions requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.pendingApprovals > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-warning/20 bg-warning/10 p-4">
                  <div className="flex items-center space-x-3">
                    <Bell className="h-5 w-5 text-warning" />
                    <div>
                      <p className="font-medium">Pending Patient Approvals</p>
                      <p className="text-sm text-muted-foreground">
                        {stats.pendingApprovals} patient(s) awaiting approval
                      </p>
                    </div>
                  </div>
                  <Link href="/admin/patients">
                    <Button variant="outline" size="sm">
                      Review
                    </Button>
                  </Link>
                </div>
              )}

              {stats.pendingPreOp > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-warning/20 bg-warning/10 p-4">
                  <div className="flex items-center space-x-3">
                    <Activity className="h-5 w-5 text-warning" />
                    <div>
                      <p className="font-medium">Pending Pre-op Care</p>
                      <p className="text-sm text-muted-foreground">
                        {stats.pendingPreOp} patient(s) requiring pre-op care
                      </p>
                    </div>
                  </div>
                  <Link href="/admin/pre-post-op">
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
              )}

              {stats.pendingPostOp > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-warning/20 bg-warning/10 p-4">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-warning" />
                    <div>
                      <p className="font-medium">Pending Post-op Care</p>
                      <p className="text-sm text-muted-foreground">
                        {stats.pendingPostOp} patient(s) requiring post-op care
                      </p>
                    </div>
                  </div>
                  <Link href="/admin/pre-post-op">
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics - Appointment Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" />
            Appointment Trends (Last 30 Days)
          </CardTitle>
          <CardDescription>Daily appointment volume</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading trends...</p>
            </div>
          ) : appointmentTrends.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No appointment data available</p>
            </div>
          ) : (
            <div className="space-y-2">
              {appointmentTrends.slice(-7).map((trend, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {new Date(trend.date).toLocaleDateString()}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${Math.min((trend.count / 50) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{trend.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
