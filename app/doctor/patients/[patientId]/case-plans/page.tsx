'use client';

/**
 * Doctor Patient Case Plans Page
 * 
 * View and manage surgical case plans for a specific patient.
 * Displays all case plans with their readiness status and details.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { Card, CardContent } from '@/components/ui/card';
import { Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { CasePlanCard } from '@/app/doctor/cases/components/CasePlanCard';

// Components
import { CasePlansHeader } from '../components/CasePlansHeader';

export default function DoctorPatientCasePlansPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const patientId = params.patientId as string;

  const fromConsultation = searchParams.get('from') === 'consultation';
  const consultationAppointmentId = searchParams.get('appointmentId');

  const [casePlans, setCasePlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientName, setPatientName] = useState<string>('');

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    if (!patientId) {
      toast.error('Invalid patient ID');
      router.push('/doctor/patients');
      return;
    }

    loadData();
  }, [isAuthenticated, user, patientId, authLoading, router]);

  const loadData = async () => {
    try {
      setLoading(true);

      const patientResponse = await doctorApi.getPatient(patientId);
      if (patientResponse.success && patientResponse.data) {
        setPatientName(`${patientResponse.data.firstName} ${patientResponse.data.lastName}`);
      }

      const response = await apiClient.get<any[]>(`/patients/${patientId}/case-plans`);
      if (response.success && response.data) {
        setCasePlans(response.data);
      } else {
        toast.error('Failed to load case plans');
      }
    } catch (error) {
      console.error('Error loading case plans:', error);
      toast.error('An error occurred while loading case plans');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">
            {authLoading ? 'Checking authentication...' : 'Loading case plans...'}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  return (
    <div className="space-y-6">
      <CasePlansHeader
        patientId={patientId}
        patientName={patientName}
        fromConsultation={fromConsultation}
        consultationAppointmentId={consultationAppointmentId}
      />

      {/* Case Plans List */}
      {casePlans.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Stethoscope className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Case Plans Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This patient doesn't have any surgical case plans yet.
              </p>
              <p className="text-xs text-muted-foreground">
                Case plans are created when a consultation results in a procedure recommendation.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {casePlans.map((casePlan) => (
            <CasePlanCard key={casePlan.id} casePlan={casePlan} />
          ))}
        </div>
      )}
    </div>
  );
}
