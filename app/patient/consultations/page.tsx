'use client';

/**
 * Patient Consultation History Page
 * 
 * View past consultations and their outcomes.
 * Shows consultation notes, follow-ups, and treatment plans.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { patientApi } from '@/lib/api/patient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { format } from 'date-fns';

export default function PatientConsultationsPage() {
  const { user, isAuthenticated } = useAuth();
  const [consultations, setConsultations] = useState<AppointmentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadConsultations();
    }
  }, [isAuthenticated, user]);

  const loadConsultations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await patientApi.getAppointmentHistory(user.id);

      if (response.success && response.data) {
        // Filter for completed consultations
        const completed = response.data.filter(
          (apt) => apt.status === AppointmentStatus.COMPLETED,
        );
        setConsultations(completed);
      } else {
        toast.error(response.error || 'Failed to load consultations');
      }
    } catch (error) {
      toast.error('An error occurred while loading consultations');
      console.error('Error loading consultations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view consultations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Consultation History</h1>
        <p className="mt-2 text-muted-foreground">View your past consultations and outcomes</p>
      </div>

      {/* Consultations List */}
      <Card>
        <CardHeader>
          <CardTitle>Completed Consultations</CardTitle>
          <CardDescription>Your consultation history and outcomes</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading consultations...</p>
            </div>
          ) : consultations.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No completed consultations yet</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Your consultation history will appear here after appointments are completed
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {consultations.map((consultation) => (
                <div
                  key={consultation.id}
                  className="rounded-lg border border-border p-6 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                        <FileText className="h-6 w-6 text-success" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {format(new Date(consultation.appointmentDate), 'MMMM d, yyyy')}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {consultation.time} • {consultation.type}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                      {consultation.status}
                    </div>
                  </div>

                  {consultation.note && (
                    <div className="mb-4 rounded-lg bg-muted p-4">
                      <h4 className="mb-2 text-sm font-medium text-foreground">Consultation Notes</h4>
                      <p className="text-sm text-muted-foreground">{consultation.note}</p>
                    </div>
                  )}

                  {consultation.reason && (
                    <div className="rounded-lg border border-border p-4">
                      <h4 className="mb-2 text-sm font-medium text-foreground">Outcome</h4>
                      <p className="text-sm text-muted-foreground">{consultation.reason}</p>
                    </div>
                  )}

                  <div className="mt-4 flex items-center text-xs text-muted-foreground">
                    <Calendar className="mr-2 h-4 w-4" />
                    Completed on{' '}
                    {consultation.updatedAt
                      ? format(new Date(consultation.updatedAt), 'MMMM d, yyyy')
                      : format(new Date(consultation.appointmentDate), 'MMMM d, yyyy')}
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
