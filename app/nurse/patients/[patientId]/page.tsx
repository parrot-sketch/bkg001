'use client';

/**
 * Nurse Patient Profile Page
 * 
 * Comprehensive patient view for nurses including:
 * - Patient demographics and vitals
 * - Today's appointment details
 * - Care notes (pre-op/post-op)
 * - Quick actions to record vitals and add notes
 * - Medical history relevant to care
 * 
 * Optimized for nursing care workflow.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { nurseApi } from '@/lib/api/nurse';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Activity,
  Heart,
  Pill,
  Shield,
  AlertCircle,
  CheckCircle2,
  Clock,
  Thermometer,
  Weight,
  Ruler
} from 'lucide-react';
import { format } from 'date-fns';
import { calculateAge } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import { ProfileImage } from '@/components/profile-image';
import { RecordVitalsDialog } from '@/components/nurse/RecordVitalsDialog';
import { AddCareNoteDialog } from '@/components/nurse/AddCareNoteDialog';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';

interface VitalSign {
  id: number;
  patientId: string;
  appointmentId?: number | null;
  bodyTemperature?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
  heartRate?: string | null;
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  weight?: number | null;
  height?: number | null;
  recordedAt: Date;
  recordedBy: string;
}

interface CareNote {
  id: number;
  patientId: string;
  nurseUserId: string;
  appointmentId?: number | null;
  noteType: string;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function NursePatientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const patientId = params.patientId as string;

  const [patient, setPatient] = useState<PatientResponseDto | null>(null);
  const [appointment, setAppointment] = useState<AppointmentResponseDto | null>(null);
  const [vitalSigns, setVitalSigns] = useState<VitalSign[]>([]);
  const [careNotes, setCareNotes] = useState<CareNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVitalsDialog, setShowVitalsDialog] = useState(false);
  const [showCareNoteDialog, setShowCareNoteDialog] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading before checking
    if (authLoading) {
      return;
    }

    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    if (!patientId) {
      toast.error('Invalid patient ID');
      router.push('/nurse/patients');
      return;
    }

    loadPatientData();
  }, [isAuthenticated, user, patientId, authLoading, router]);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      
      // Load patient details
      const patientResponse = await nurseApi.getPatient(patientId);
      if (patientResponse.success && patientResponse.data) {
        setPatient(patientResponse.data);
      } else {
        const error = !patientResponse.success ? patientResponse.error : 'Failed to load patient details';
        toast.error(error);
        router.push('/nurse/patients');
        return;
      }

      // Load today's appointments for this patient
      const appointmentsResponse = await nurseApi.getTodayCheckedInPatients();
      if (appointmentsResponse.success && appointmentsResponse.data) {
        const patientAppointment = appointmentsResponse.data.find(
          (apt) => apt.patientId === patientId
        );
        setAppointment(patientAppointment || null);
      }

      // Load vital signs
      const vitalsResponse = await apiClient.get<VitalSign[]>(`/patients/${patientId}/vitals`);
      if (vitalsResponse.success && vitalsResponse.data) {
        setVitalSigns(vitalsResponse.data);
      }

      // Load care notes
      const notesResponse = await apiClient.get<CareNote[]>(`/patients/${patientId}/care-notes`);
      if (notesResponse.success && notesResponse.data) {
        setCareNotes(notesResponse.data);
      }
    } catch (error) {
      console.error('Error loading patient data:', error);
      toast.error('An error occurred while loading patient data');
    } finally {
      setLoading(false);
    }
  };

  const handleVitalsSuccess = () => {
    setShowVitalsDialog(false);
    loadPatientData(); // Reload to show new vitals
    toast.success('Vital signs recorded successfully');
  };

  const handleCareNoteSuccess = () => {
    setShowCareNoteDialog(false);
    loadPatientData(); // Reload to show new note
    toast.success('Care note added successfully');
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading patient information...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Patient not found</p>
          <Link href="/nurse/patients">
            <Button className="mt-4">Back to Patients</Button>
          </Link>
        </div>
      </div>
    );
  }

  const age = patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : null;
  const latestVitals = vitalSigns.length > 0 ? vitalSigns[0] : null;

  return (
    <div className="space-y-6 pb-16">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <Link href="/nurse/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Patient Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <ProfileImage
                url={undefined}
                name={`${patient.firstName} ${patient.lastName}`}
                className="w-16 h-16"
              />
              <div>
                <CardTitle className="text-2xl">
                  {patient.firstName} {patient.lastName}
                </CardTitle>
                <CardDescription className="flex items-center space-x-2 mt-1">
                  <span>File: {patient.fileNumber}</span>
                  {age !== null && (
                    <>
                      <span>•</span>
                      <span>{age} years old</span>
                    </>
                  )}
                  {patient.gender && (
                    <>
                      <span>•</span>
                      <span>{patient.gender}</span>
                    </>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={() => setShowVitalsDialog(true)}>
                <Activity className="mr-2 h-4 w-4" />
                Record Vitals
              </Button>
              <Button variant="outline" onClick={() => setShowCareNoteDialog(true)}>
                <FileText className="mr-2 h-4 w-4" />
                Add Care Note
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Today's Appointment Alert */}
      {appointment && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">Today's Appointment</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Time</p>
                <p className="text-base font-semibold">{appointment.time}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Type</p>
                <p className="text-base font-semibold">{appointment.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={appointment.status === AppointmentStatus.SCHEDULED ? 'default' : 'secondary'}>
                  {appointment.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vitals">
            Vital Signs
            {vitalSigns.length > 0 && (
              <Badge variant="secondary" className="ml-2">{vitalSigns.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notes">
            Care Notes
            {careNotes.length > 0 && (
              <Badge variant="secondary" className="ml-2">{careNotes.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {patient.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{patient.email}</span>
                  </div>
                )}
                {patient.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{patient.phone}</span>
                  </div>
                )}
                {patient.address && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{patient.address}</span>
                  </div>
                )}
                {patient.emergencyContactName && (
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium mb-1">Emergency Contact</p>
                    <p className="text-sm">{patient.emergencyContactName}</p>
                    {patient.emergencyContactNumber && (
                      <p className="text-sm text-muted-foreground">{patient.emergencyContactNumber}</p>
                    )}
                    {patient.relation && (
                      <p className="text-xs text-muted-foreground">({patient.relation})</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Latest Vital Signs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Activity className="mr-2 h-5 w-5" />
                  Latest Vital Signs
                </CardTitle>
              </CardHeader>
              <CardContent>
                {latestVitals ? (
                  <div className="space-y-3">
                    {latestVitals.bodyTemperature && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Thermometer className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Temperature</span>
                        </div>
                        <span className="text-sm font-medium">{latestVitals.bodyTemperature}°C</span>
                      </div>
                    )}
                    {latestVitals.systolic && latestVitals.diastolic && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Heart className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Blood Pressure</span>
                        </div>
                        <span className="text-sm font-medium">
                          {latestVitals.systolic}/{latestVitals.diastolic} mmHg
                        </span>
                      </div>
                    )}
                    {latestVitals.heartRate && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Heart Rate</span>
                        </div>
                        <span className="text-sm font-medium">{latestVitals.heartRate} bpm</span>
                      </div>
                    )}
                    {latestVitals.oxygenSaturation && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">O2 Saturation</span>
                        </div>
                        <span className="text-sm font-medium">{latestVitals.oxygenSaturation}%</span>
                      </div>
                    )}
                    {latestVitals.weight && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Weight className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Weight</span>
                        </div>
                        <span className="text-sm font-medium">{latestVitals.weight} kg</span>
                      </div>
                    )}
                    {latestVitals.height && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Ruler className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Height</span>
                        </div>
                        <span className="text-sm font-medium">{latestVitals.height} cm</span>
                      </div>
                    )}
                    <div className="pt-2 border-t text-xs text-muted-foreground">
                      Recorded {format(new Date(latestVitals.recordedAt), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">No vital signs recorded yet</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setShowVitalsDialog(true)}
                    >
                      Record Vitals
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Medical Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Medical Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {patient.bloodGroup && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Blood Group</p>
                    <p className="text-base">{patient.bloodGroup}</p>
                  </div>
                )}
                {patient.allergies && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1 text-orange-500" />
                      Allergies
                    </p>
                    <p className="text-base">{patient.allergies}</p>
                  </div>
                )}
                {patient.medicalHistory && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Medical History</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {patient.medicalHistory}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Demographics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Demographics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {patient.dateOfBirth && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                    <p className="text-base">
                      {format(new Date(patient.dateOfBirth), 'MMMM d, yyyy')}
                      {age !== null && ` (${age} years old)`}
                    </p>
                  </div>
                )}
                {patient.occupation && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Occupation</p>
                    <p className="text-base">{patient.occupation}</p>
                  </div>
                )}
                {patient.maritalStatus && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Marital Status</p>
                    <p className="text-base">{patient.maritalStatus}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Vital Signs Tab */}
        <TabsContent value="vitals" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Vital Signs History</CardTitle>
                  <CardDescription>
                    {vitalSigns.length} record{vitalSigns.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <Button onClick={() => setShowVitalsDialog(true)}>
                  <Activity className="mr-2 h-4 w-4" />
                  Record New Vitals
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {vitalSigns.length > 0 ? (
                <div className="space-y-4">
                  {vitalSigns.map((vital) => (
                    <div
                      key={vital.id}
                      className="p-4 border rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {format(new Date(vital.recordedAt), 'MMMM d, yyyy h:mm a')}
                        </p>
                        <Badge variant="outline">
                          {vital.appointmentId ? 'Appointment' : 'Routine'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {vital.bodyTemperature && (
                          <div>
                            <p className="text-xs text-muted-foreground">Temperature</p>
                            <p className="text-sm font-medium">{vital.bodyTemperature}°C</p>
                          </div>
                        )}
                        {vital.systolic && vital.diastolic && (
                          <div>
                            <p className="text-xs text-muted-foreground">Blood Pressure</p>
                            <p className="text-sm font-medium">
                              {vital.systolic}/{vital.diastolic} mmHg
                            </p>
                          </div>
                        )}
                        {vital.heartRate && (
                          <div>
                            <p className="text-xs text-muted-foreground">Heart Rate</p>
                            <p className="text-sm font-medium">{vital.heartRate} bpm</p>
                          </div>
                        )}
                        {vital.respiratoryRate && (
                          <div>
                            <p className="text-xs text-muted-foreground">Respiratory Rate</p>
                            <p className="text-sm font-medium">{vital.respiratoryRate} /min</p>
                          </div>
                        )}
                        {vital.oxygenSaturation && (
                          <div>
                            <p className="text-xs text-muted-foreground">O2 Saturation</p>
                            <p className="text-sm font-medium">{vital.oxygenSaturation}%</p>
                          </div>
                        )}
                        {vital.weight && (
                          <div>
                            <p className="text-xs text-muted-foreground">Weight</p>
                            <p className="text-sm font-medium">{vital.weight} kg</p>
                          </div>
                        )}
                        {vital.height && (
                          <div>
                            <p className="text-xs text-muted-foreground">Height</p>
                            <p className="text-sm font-medium">{vital.height} cm</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No vital signs recorded yet
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setShowVitalsDialog(true)}
                  >
                    Record First Vitals
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Care Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Care Notes</CardTitle>
                  <CardDescription>
                    {careNotes.length} note{careNotes.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={() => setShowCareNoteDialog(true)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Add Care Note
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {careNotes.length > 0 ? (
                <div className="space-y-4">
                  {careNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 border rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant={
                            note.noteType === 'PRE_OP' ? 'default' :
                            note.noteType === 'POST_OP' ? 'secondary' :
                            'outline'
                          }>
                            {note.noteType.replace('_', '-')}
                          </Badge>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No care notes recorded yet
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setShowCareNoteDialog(true)}
                  >
                    Add First Note
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {patient && user && (
        <>
          <RecordVitalsDialog
            open={showVitalsDialog}
            onClose={() => setShowVitalsDialog(false)}
            onSuccess={handleVitalsSuccess}
            patient={patient}
            appointment={appointment || null}
            nurseId={user.id}
          />
          <AddCareNoteDialog
            open={showCareNoteDialog}
            onClose={() => setShowCareNoteDialog(false)}
            onSuccess={handleCareNoteSuccess}
            patient={patient}
            appointment={appointment || null}
            nurseId={user.id}
          />
        </>
      )}
    </div>
  );
}
