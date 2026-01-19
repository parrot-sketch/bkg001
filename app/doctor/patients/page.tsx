'use client';

/**
 * Doctor Patients Page
 * 
 * View all patients and their information.
 * Allows viewing patient profiles, appointments, and medical history.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Search, User, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

export default function DoctorPatientsPage() {
  const { user, isAuthenticated } = useAuth();
  const [patients, setPatients] = useState<PatientResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isAuthenticated && user) {
      // In a real implementation, this would fetch patients
      // For now, we'll load patients from appointments
      loadPatients();
    }
  }, [isAuthenticated, user]);

  const loadPatients = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Get appointments to extract unique patient IDs
      const appointmentsResponse = await doctorApi.getAppointments(user.id);

      if (appointmentsResponse.success && appointmentsResponse.data) {
        // Extract unique patient IDs
        const patientIds = Array.from(
          new Set(appointmentsResponse.data.map((apt) => apt.patientId)),
        );

        // Fetch patient details for each unique patient
        const patientPromises = patientIds.map((patientId) =>
          doctorApi.getPatient(patientId).catch(() => null),
        );

        const patientResponses = await Promise.all(patientPromises);
        const validPatients = patientResponses
          .filter((response): response is { success: true; data: PatientResponseDto } =>
            response !== null && response.success === true && response.data !== null,
          )
          .map((response) => response.data);

        setPatients(validPatients);
      } else {
        toast.error(appointmentsResponse.error || 'Failed to load patients');
      }
    } catch (error) {
      toast.error('An error occurred while loading patients');
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter((patient) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      patient.firstName?.toLowerCase().includes(query) ||
      patient.lastName?.toLowerCase().includes(query) ||
      patient.email?.toLowerCase().includes(query) ||
      patient.phone?.toLowerCase().includes(query)
    );
  });

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view patients</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Patients</h1>
          <p className="mt-2 text-muted-foreground">View and manage patient information</p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patients by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Patients List */}
      <Card>
        <CardHeader>
          <CardTitle>All Patients</CardTitle>
          <CardDescription>Patients you have appointments with</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading patients...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No patients found matching your search' : 'No patients found'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{patient.email}</span>
                        {patient.phone && (
                          <>
                            <span>•</span>
                            <span>{patient.phone}</span>
                          </>
                        )}
                      </div>
                      {patient.dateOfBirth && (
                        <p className="text-xs text-muted-foreground">
                          Age: {patient.age} years {patient.isMinor ? '(Minor)' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link href={`/doctor/patients/${patient.id}`}>
                      <Button variant="outline" size="sm">
                        <Calendar className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                    </Link>
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
