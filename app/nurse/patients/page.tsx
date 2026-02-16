'use client';

/**
 * Nurse Patients Page
 * 
 * View all patients assigned to nurse for care.
 * Refactored for modern aesthetic with sticky header and responsive table layout.
 */

import { useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useTodayCheckedInPatients } from '@/hooks/nurse/useNurseDashboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Search, RefreshCw, Filter } from 'lucide-react';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { RecordVitalsDialog } from '@/components/nurse/RecordVitalsDialog';
import { AddCareNoteDialog } from '@/components/nurse/AddCareNoteDialog';
import { PatientTableRow } from '@/components/nurse/PatientTableRow';
import { NursePageHeader } from '@/components/nurse/NursePageHeader';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from 'next/link';

export default function NursePatientsPage() {
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientResponseDto | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentResponseDto | null>(null);
  const [showVitalsDialog, setShowVitalsDialog] = useState(false);
  const [showCareNoteDialog, setShowCareNoteDialog] = useState(false);

  // Use the hook for automatic data fetching
  const {
    data: appointments = [],
    isLoading: loading,
    refetch
  } = useTodayCheckedInPatients(isAuthenticated && !!user);

  // Map appointments to patient objects for the list
  const patients = appointments
    .filter(apt => apt.patient) // Ensure patient data exists
    .map(apt => {
      const p = apt.patient!;
      const birthDate = p.dateOfBirth ? new Date(p.dateOfBirth) : new Date();
      const age = p.dateOfBirth ? new Date().getFullYear() - birthDate.getFullYear() : 0;

      return {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        fullName: `${p.firstName} ${p.lastName}`,
        email: p.email || '',
        phone: p.phone || '',
        dateOfBirth: birthDate,
        age: age,
        fileNumber: p.fileNumber || '',
        gender: p.gender || '',
        address: '',
        maritalStatus: '',
        emergencyContactName: '',
        emergencyContactNumber: '',
        relation: '',
        hasPrivacyConsent: false,
        hasServiceConsent: false,
        hasMedicalConsent: false,
      } as PatientResponseDto;
    });

  // Filter patients based on search query
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

  const handleRecordVitals = (patient: PatientResponseDto) => {
    setSelectedPatient(patient);
    const appointment = appointments.find((apt) => apt.patientId === patient.id);
    setSelectedAppointment(appointment || null);
    setShowVitalsDialog(true);
  };

  const handleAddCareNote = (patient: PatientResponseDto) => {
    setSelectedPatient(patient);
    const appointment = appointments.find((apt) => apt.patientId === patient.id);
    setSelectedAppointment(appointment || null);
    setShowCareNoteDialog(true);
  };

  const handleSuccess = () => {
    setShowVitalsDialog(false);
    setShowCareNoteDialog(false);
    setSelectedPatient(null);
    setSelectedAppointment(null);
    refetch();
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view patients</p>
          <Link href="/login">
            <Button className="mt-4">Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-10">

      <NursePageHeader />

      <div className="space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Clinic Patients</h2>
            <p className="text-sm text-slate-500">
              Patients checked in for appointments today
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-white border-slate-200 focus:border-purple-300 focus:ring-purple-100"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => refetch()} className="h-10 w-10 shrink-0 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-white">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-white">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters/Tabs Pill (Optional Visual Enhancement) */}
        <div className="flex items-center gap-2 pb-2 overflow-x-auto">
          <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-200 cursor-pointer px-3 py-1 rounded-full text-xs font-medium border border-purple-200">
            All Patients
          </Badge>
          <Badge variant="outline" className="bg-white text-slate-600 hover:bg-slate-50 cursor-pointer px-3 py-1 rounded-full text-xs font-medium border border-slate-200">
            Waiting Vitals
          </Badge>
          <Badge variant="outline" className="bg-white text-slate-600 hover:bg-slate-50 cursor-pointer px-3 py-1 rounded-full text-xs font-medium border border-slate-200">
            Seen
          </Badge>
        </div>

        {/* Results - Table View */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-12 bg-slate-50 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-20 bg-slate-50/50">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-slate-900 font-medium mb-1">No patients found</h3>
              <p className="text-sm text-slate-500">
                {searchQuery ? `No results matching "${searchQuery}"` : 'No patients have checked in yet today'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="w-[280px]">Patient</TableHead>
                  <TableHead>Demographics</TableHead>
                  <TableHead>Appointment</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => {
                  const appointment = appointments.find((apt) => apt.patientId === patient.id);
                  return (
                    <PatientTableRow
                      key={patient.id}
                      patient={patient}
                      appointment={appointment}
                      onRecordVitals={handleRecordVitals}
                      onAddCareNote={handleAddCareNote}
                    />
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

      </div>

      {/* Record Vitals Dialog */}
      {showVitalsDialog && selectedPatient && (
        <RecordVitalsDialog
          open={showVitalsDialog}
          onClose={() => {
            setShowVitalsDialog(false);
            setSelectedPatient(null);
            setSelectedAppointment(null);
          }}
          onSuccess={handleSuccess}
          patient={selectedPatient}
          appointment={selectedAppointment}
          nurseId={user.id}
        />
      )}

      {/* Add Care Note Dialog */}
      {showCareNoteDialog && selectedPatient && (
        <AddCareNoteDialog
          open={showCareNoteDialog}
          onClose={() => {
            setShowCareNoteDialog(false);
            setSelectedPatient(null);
            setSelectedAppointment(null);
          }}
          onSuccess={handleSuccess}
          patient={selectedPatient}
          appointment={selectedAppointment}
          nurseId={user.id}
        />
      )}
    </div>
  );
}
