'use client';

/**
 * Admin Patients Page
 * 
 * Manage all patients:
 * - View patient list
 * - Approve/reject registrations
 * - Assign patients to staff
 * - View patient history
 * 
 * REFACTORED: Replaced manual useState/useEffect fetch with React Query hook
 * REASON: Eliminates manual loading state, error handling, and fetch logic.
 * Provides automatic caching, retries, and background refetching.
 */

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useAllPatients } from '@/hooks/patients/usePatients';
import { useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Search, CheckCircle, XCircle, UserCheck } from 'lucide-react';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

// Extended DTO for admin view (includes approval status)
// Note: approved field may come from API response but isn't in base PatientResponseDto
interface AdminPatientDto extends PatientResponseDto {
  approved?: boolean;
}
import { ApprovePatientDialog } from '@/components/admin/ApprovePatientDialog';
import { AssignPatientDialog } from '@/components/admin/AssignPatientDialog';

export default function AdminPatientsPage() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  // REFACTORED: Replaced manual useState/useEffect with React Query
  // React Query handles: loading, error, retries, caching, deduplication automatically
  const { 
    data: patientsData = [], 
    isLoading: loading 
  } = useAllPatients(isAuthenticated && !!user);
  
  // Type assertion: API may return approved field even though it's not in base DTO
  const patients = patientsData as AdminPatientDto[];
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<AdminPatientDto | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  // REFACTORED: Use useMemo for filtering instead of useEffect + useState
  // More efficient and follows React best practices
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) {
      return patients;
    }
    const query = searchQuery.toLowerCase();
    return patients.filter(
      (patient) =>
        patient.firstName?.toLowerCase().includes(query) ||
        patient.lastName?.toLowerCase().includes(query) ||
        patient.email?.toLowerCase().includes(query) ||
        patient.phone?.toLowerCase().includes(query) ||
        patient.id.toLowerCase().includes(query),
    );
  }, [patients, searchQuery]);

  const handleApprove = (patient: AdminPatientDto) => {
    setSelectedPatient(patient);
    setShowApproveDialog(true);
  };

  const handleAssign = (patient: AdminPatientDto) => {
    setSelectedPatient(patient);
    setShowAssignDialog(true);
  };

  const handleReject = async (patient: AdminPatientDto) => {
    if (!confirm(`Are you sure you want to reject patient ${patient.firstName} ${patient.lastName}?`)) {
      return;
    }

    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      const response = await adminApi.rejectPatient(patient.id, reason, user!.id);
      if (response.success) {
        toast.success('Patient registration rejected');
        // REFACTORED: Invalidate query cache to refetch updated data
        queryClient.invalidateQueries({ queryKey: ['patients', 'all'] });
      } else {
        toast.error(response.error || 'Failed to reject patient');
      }
    } catch (error) {
      toast.error('An error occurred while rejecting patient');
      console.error('Error rejecting patient:', error);
    }
  };

  const handleSuccess = () => {
    setShowApproveDialog(false);
    setShowAssignDialog(false);
    setSelectedPatient(null);
    // REFACTORED: Invalidate query cache to refetch updated data
    queryClient.invalidateQueries({ queryKey: ['patients', 'all'] });
  };

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
          <h1 className="text-3xl font-bold text-foreground">Patient Management</h1>
          <p className="mt-2 text-muted-foreground">Manage all registered patients</p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patients by name, email, phone, or ID..."
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
          <CardDescription>
            Total: {filteredPatients.length} patient(s)
          </CardDescription>
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
                {searchQuery ? 'No patients match your search' : 'No patients found'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="group rounded-lg border border-border bg-card p-4 hover:border-primary/50 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Patient Info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Avatar */}
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Users className="h-6 w-6" />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Name and File Number */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-semibold text-base text-foreground">
                            {patient.firstName} {patient.lastName}
                          </h3>
                          {patient.fileNumber && (
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                              {patient.fileNumber}
                            </span>
                          )}
                          {patient.approved === false && (
                            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Pending Approval
                            </span>
                          )}
                        </div>

                        {/* Contact Info */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {patient.email && (
                            <span className="truncate max-w-[200px]" title={patient.email}>
                              {patient.email}
                            </span>
                          )}
                          {patient.phone && (
                            <span className="font-mono">{patient.phone}</span>
                          )}
                        </div>

                        {/* Demographics */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {patient.dateOfBirth && (
                            <span>
                              Age: {patient.age} years
                            </span>
                          )}
                          {patient.gender && (
                            <span>• Gender: {patient.gender}</span>
                          )}
                          {patient.createdAt && (
                            <span>
                              • Registered: {new Date(patient.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {patient.approved === false && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApprove(patient)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject(patient)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAssign(patient)}
                        className="hover:bg-muted"
                      >
                        <UserCheck className="mr-2 h-4 w-4" />
                        Assign
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Patient Dialog */}
      {showApproveDialog && selectedPatient && (
        <ApprovePatientDialog
          open={showApproveDialog}
          onClose={() => {
            setShowApproveDialog(false);
            setSelectedPatient(null);
          }}
          onSuccess={handleSuccess}
          patient={selectedPatient}
          adminId={user.id}
        />
      )}

      {/* Assign Patient Dialog */}
      {showAssignDialog && selectedPatient && (
        <AssignPatientDialog
          open={showAssignDialog}
          onClose={() => {
            setShowAssignDialog(false);
            setSelectedPatient(null);
          }}
          onSuccess={handleSuccess}
          patient={selectedPatient}
          adminId={user.id}
        />
      )}
    </div>
  );
}
