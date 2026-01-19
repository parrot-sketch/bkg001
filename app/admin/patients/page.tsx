'use client';

/**
 * Admin Patients Page
 * 
 * Manage all patients:
 * - View patient list
 * - Approve/reject registrations
 * - Assign patients to staff
 * - View patient history
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../../../../hooks/patient/useAuth';
import { adminApi } from '../../../../lib/api/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Users, Search, CheckCircle, XCircle, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { PatientResponseDto } from '../../../../application/dtos/PatientResponseDto';
import { ApprovePatientDialog } from '../../../../components/admin/ApprovePatientDialog';
import { AssignPatientDialog } from '../../../../components/admin/AssignPatientDialog';

export default function AdminPatientsPage() {
  const { user, isAuthenticated } = useAuth();
  const [patients, setPatients] = useState<PatientResponseDto[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<PatientResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientResponseDto | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadPatients();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    let filtered = patients;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (patient) =>
          patient.firstName?.toLowerCase().includes(query) ||
          patient.lastName?.toLowerCase().includes(query) ||
          patient.email?.toLowerCase().includes(query) ||
          patient.phone?.toLowerCase().includes(query) ||
          patient.id.toLowerCase().includes(query),
      );
    }

    setFilteredPatients(filtered);
  }, [patients, searchQuery]);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAllPatients();

      if (response.success && response.data) {
        setPatients(response.data);
        setFilteredPatients(response.data);
      } else {
        toast.error(response.error || 'Failed to load patients');
      }
    } catch (error) {
      toast.error('An error occurred while loading patients');
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (patient: PatientResponseDto) => {
    setSelectedPatient(patient);
    setShowApproveDialog(true);
  };

  const handleAssign = (patient: PatientResponseDto) => {
    setSelectedPatient(patient);
    setShowAssignDialog(true);
  };

  const handleReject = async (patient: PatientResponseDto) => {
    if (!confirm(`Are you sure you want to reject patient ${patient.firstName} ${patient.lastName}?`)) {
      return;
    }

    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      const response = await adminApi.rejectPatient(patient.id, reason, user!.id);
      if (response.success) {
        toast.success('Patient registration rejected');
        loadPatients();
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
    loadPatients();
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
            <div className="space-y-4">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>ID: {patient.id}</span>
                        <span>•</span>
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
                          Age: {patient.age} years • Gender: {patient.gender}
                        </p>
                      )}
                      {patient.createdAt && (
                        <p className="text-xs text-muted-foreground">
                          Registered: {new Date(patient.createdAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApprove(patient)}
                      className="text-success hover:text-success"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(patient)}
                      className="text-destructive hover:text-destructive"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAssign(patient)}
                    >
                      <UserCheck className="mr-2 h-4 w-4" />
                      Assign
                    </Button>
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
