'use client';

/**
 * Admin Pre/Post-op Overview Page
 * 
 * Monitor pre-operative and post-operative care workflows.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { adminApi } from '@/lib/api/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, FileText, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { format } from 'date-fns';

export default function AdminPrePostOpPage() {
  const { user, isAuthenticated } = useAuth();
  const [preOpPatients, setPreOpPatients] = useState<AppointmentResponseDto[]>([]);
  const [postOpPatients, setPostOpPatients] = useState<AppointmentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadPrePostOpData();
    }
  }, [isAuthenticated, user]);

  const loadPrePostOpData = async () => {
    try {
      setLoading(true);
      const [preOpResponse, postOpResponse] = await Promise.all([
        adminApi.getPreOpOverview(),
        adminApi.getPostOpOverview(),
      ]);

      if (preOpResponse.success && preOpResponse.data) {
        setPreOpPatients(preOpResponse.data);
      } else if (!preOpResponse.success) {
        toast.error(preOpResponse.error || 'Failed to load pre-op patients');
      } else {
        toast.error('Failed to load pre-op patients');
      }

      if (postOpResponse.success && postOpResponse.data) {
        setPostOpPatients(postOpResponse.data);
      } else if (!postOpResponse.success) {
        toast.error(postOpResponse.error || 'Failed to load post-op patients');
      } else {
        toast.error('Failed to load post-op patients');
      }
    } catch (error) {
      toast.error('An error occurred while loading pre/post-op data');
      console.error('Error loading pre/post-op data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view pre/post-op overview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Pre/Post-op Overview</h1>
        <p className="mt-2 text-muted-foreground">Monitor pre-operative and post-operative care workflows</p>
      </div>

      {/* Pre-op Section */}
      <Card>
        <CardHeader>
          <CardTitle>Pre-operative Patients</CardTitle>
          <CardDescription>Patients requiring pre-operative care: {preOpPatients.length}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading pre-op patients...</p>
            </div>
          ) : preOpPatients.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No pre-op patients at this time</p>
            </div>
          ) : (
            <div className="space-y-4">
              {preOpPatients.map((appointment) => (
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
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="mr-1 h-4 w-4" />
                          {format(new Date(appointment.appointmentDate), 'MMMM d, yyyy')}
                        </span>
                        <span>•</span>
                        <span className="flex items-center">
                          <Clock className="mr-1 h-4 w-4" />
                          {appointment.time}
                        </span>
                        <span>•</span>
                        <span>{appointment.type}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Post-op Section */}
      <Card>
        <CardHeader>
          <CardTitle>Post-operative Patients</CardTitle>
          <CardDescription>Patients requiring post-operative care: {postOpPatients.length}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading post-op patients...</p>
            </div>
          ) : postOpPatients.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No post-op patients at this time</p>
            </div>
          ) : (
            <div className="space-y-4">
              {postOpPatients.map((appointment) => (
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
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="mr-1 h-4 w-4" />
                          {format(new Date(appointment.appointmentDate), 'MMMM d, yyyy')}
                        </span>
                        <span>•</span>
                        <span className="flex items-center">
                          <Clock className="mr-1 h-4 w-4" />
                          {appointment.time}
                        </span>
                        <span>•</span>
                        <span>{appointment.type}</span>
                      </div>
                    </div>
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
