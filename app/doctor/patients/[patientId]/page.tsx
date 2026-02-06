'use client';

/**
 * Doctor Patient Profile Page
 * 
 * Comprehensive patient profile view for doctors with quick actions:
 * - Start consultation
 * - View/manage case plans
 * - Manage consent
 * - View medical history
 * - View appointments
 * 
 * Optimized for aesthetic surgery center workflow.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
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
  Stethoscope,
  ClipboardCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  Heart,
  Pill,
  Shield,
  Eye,
  Edit,
  Play
} from 'lucide-react';
import { format } from 'date-fns';
import { calculateAge } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import { ProfileImage } from '@/components/profile-image';
import { StartConsultationDialog } from '@/components/doctor/StartConsultationDialog';
import { usePatientConsultationHistory } from '@/hooks/consultation/usePatientConsultationHistory';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { CaseReadinessStatus, getCaseReadinessStatusLabel } from '@/domain/enums/CaseReadinessStatus';
import { ConsultationState } from '@/domain/enums/ConsultationState';
import { ConsultationOutcomeType, getConsultationOutcomeTypeLabel } from '@/domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '@/domain/enums/PatientDecision';

export default function DoctorPatientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const patientId = params.patientId as string;

  // Get navigation context from query params
  const fromConsultation = searchParams.get('from') === 'consultation';
  const consultationAppointmentId = searchParams.get('appointmentId');

  const [patient, setPatient] = useState<PatientResponseDto | null>(null);
  const [appointments, setAppointments] = useState<AppointmentResponseDto[]>([]);
  const [casePlans, setCasePlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCasePlans, setLoadingCasePlans] = useState(false);
  const [startConsultationOpen, setStartConsultationOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentResponseDto | null>(null);

  // Fetch consultation history for this patient
  const {
    data: consultationHistory,
    isLoading: loadingConsultations,
  } = usePatientConsultationHistory(patientId || null);

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
      router.push('/doctor/patients');
      return;
    }

    loadPatientData();
  }, [isAuthenticated, user, patientId, authLoading, router]);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      
      // Load patient details
      const patientResponse = await doctorApi.getPatient(patientId);
      if (patientResponse.success && patientResponse.data) {
        setPatient(patientResponse.data);
      } else {
        toast.error('Failed to load patient data');
        router.push('/doctor/patients');
        return;
      }

      // Load patient's appointments
      const appointmentsResponse = await doctorApi.getPatientAppointments(patientId);
      if (appointmentsResponse.success && appointmentsResponse.data) {
        setAppointments(appointmentsResponse.data);
      }

      // Load case plans
      await loadCasePlans();
    } catch (error) {
      console.error('Error loading patient data:', error);
      toast.error('An error occurred while loading patient data');
    } finally {
      setLoading(false);
    }
  };

  const loadCasePlans = async () => {
    try {
      setLoadingCasePlans(true);
      const response = await apiClient.get<any[]>(`/patients/${patientId}/case-plans`);
      if (response.success && response.data) {
        setCasePlans(response.data);
      }
    } catch (error) {
      console.error('Error loading case plans:', error);
    } finally {
      setLoadingCasePlans(false);
    }
  };

  const handleStartConsultation = (appointment: AppointmentResponseDto) => {
    setSelectedAppointment(appointment);
    setStartConsultationOpen(true);
  };

  const handleConsultationSuccess = (appointmentId: number) => {
    toast.success('Consultation started successfully');
    setStartConsultationOpen(false);
    setSelectedAppointment(null);
    // Navigate to consultation session
    router.push(`/doctor/consultations/${appointmentId}/session`);
  };

  const getNextAppointment = (): AppointmentResponseDto | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return appointments
      .filter((apt) => {
        const aptDate = new Date(apt.appointmentDate);
        aptDate.setHours(0, 0, 0, 0);
        return (
          aptDate >= today &&
          (apt.status === AppointmentStatus.SCHEDULED || apt.status === AppointmentStatus.PENDING)
        );
      })
      .sort((a, b) => 
        new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
      )[0] || null;
  };

  const hasActiveConsultation = (appointmentId: number): boolean => {
    // If we're coming from a consultation session, this appointment has an active consultation
    return fromConsultation && consultationAppointmentId === appointmentId.toString();
  };

  const getUpcomingAppointments = (): AppointmentResponseDto[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return appointments
      .filter((apt) => {
        const aptDate = new Date(apt.appointmentDate);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate >= today;
      })
      .sort((a, b) => 
        new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
      )
      .slice(0, 5);
  };

  // Show loading while auth is checking or data is loading
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">
            {authLoading ? 'Checking authentication...' : 'Loading patient profile...'}
          </p>
        </div>
      </div>
    );
  }

  // If not authenticated after loading, show message (redirect will happen in useEffect)
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view patient profile</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Patient not found</p>
          <Button onClick={() => router.push('/doctor/patients')} className="mt-4">
            Back to Patients
          </Button>
        </div>
      </div>
    );
  }

  const patientName = `${patient.firstName} ${patient.lastName}`;
  const nextAppointment = getNextAppointment();
  const upcomingAppointments = getUpcomingAppointments();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {fromConsultation && consultationAppointmentId ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/doctor/consultations/${consultationAppointmentId}/session`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Consultation
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/doctor/patients')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Patients
            </Button>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Patient Profile</h1>
            <p className="text-muted-foreground mt-1">View and manage patient information</p>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      {nextAppointment && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Next Appointment</p>
                  <p className="font-semibold">
                    {format(new Date(nextAppointment.appointmentDate), 'EEEE, MMMM dd, yyyy')} at {nextAppointment.time}
                  </p>
                  <p className="text-sm text-muted-foreground">{nextAppointment.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasActiveConsultation(nextAppointment.id) ? (
                  <Button
                    onClick={() => router.push(`/doctor/consultations/${nextAppointment.id}/session`)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Continue Consultation
                  </Button>
                ) : nextAppointment.status === AppointmentStatus.SCHEDULED ? (
                  <Button
                    onClick={() => handleStartConsultation(nextAppointment)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Consultation
                  </Button>
                ) : null}
                <Link href={`/doctor/cases/${nextAppointment.id}`}>
                  <Button variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    View Case
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Patient Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Patient Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <ProfileImage
                  name={patientName}
                  bgColor="#10b981"
                  textClassName="text-white font-semibold"
                />
                <div className="flex-1">
                  <CardTitle className="text-xl">{patientName}</CardTitle>
                  <CardDescription className="mt-1">
                    {patient.fileNumber} • {calculateAge(patient.dateOfBirth)} years • {patient.gender}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Contact Info */}
              <div className="space-y-3">
                {patient.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${patient.phone}`} className="text-foreground hover:text-primary">
                      {patient.phone}
                    </a>
                  </div>
                )}
                {patient.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${patient.email}`} className="text-foreground hover:text-primary truncate">
                      {patient.email}
                    </a>
                  </div>
                )}
                {patient.address && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{patient.address}</span>
                  </div>
                )}
              </div>

              {/* Medical Info */}
              <div className="pt-4 border-t space-y-3">
                {patient.bloodGroup && (
                  <div className="flex items-center gap-3 text-sm">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">Blood Group: <strong>{patient.bloodGroup}</strong></span>
                  </div>
                )}
                {patient.allergies && (
                  <div className="flex items-center gap-3 text-sm">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">Allergies: <strong>{patient.allergies}</strong></span>
                  </div>
                )}
                {!patient.allergies && (
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-foreground">No known allergies</span>
                  </div>
                )}
              </div>

              {/* Consent Status */}
              <div className="pt-4 border-t space-y-2">
                <p className="text-sm font-semibold text-foreground mb-2">Consent Status</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Privacy</span>
                    <Badge variant={patient.hasPrivacyConsent ? "default" : "destructive"}>
                      {patient.hasPrivacyConsent ? 'Granted' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Medical</span>
                    <Badge variant={patient.hasMedicalConsent ? "default" : "destructive"}>
                      {patient.hasMedicalConsent ? 'Granted' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Service</span>
                    <Badge variant={patient.hasServiceConsent ? "default" : "destructive"}>
                      {patient.hasServiceConsent ? 'Granted' : 'Pending'}
                    </Badge>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  <Shield className="h-4 w-4 mr-2" />
                  Manage Consent
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Appointments</span>
                <Badge variant="outline">{appointments.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Upcoming</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {upcomingAppointments.length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="appointments" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="consultations">Consultations</TabsTrigger>
              <TabsTrigger value="medical">Medical</TabsTrigger>
              <TabsTrigger value="cases">Cases</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="appointments" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Appointments</CardTitle>
                  <CardDescription>Patient's appointment history and upcoming visits</CardDescription>
                </CardHeader>
                <CardContent>
                  {appointments.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">No appointments found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {appointments.map((apt) => (
                        <div
                          key={apt.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold">
                                {format(new Date(apt.appointmentDate), 'EEEE, MMMM dd, yyyy')}
                              </span>
                              <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                              <span className="text-sm text-muted-foreground">{apt.time}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{apt.type}</p>
                            {apt.note && (
                              <p className="text-sm text-muted-foreground mt-1 italic">{apt.note}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={
                                apt.status === AppointmentStatus.COMPLETED
                                  ? 'default'
                                  : apt.status === AppointmentStatus.SCHEDULED
                                    ? 'default'
                                    : 'secondary'
                              }
                            >
                              {apt.status}
                            </Badge>
                            {hasActiveConsultation(apt.id) ? (
                              <Button
                                size="sm"
                                onClick={() => router.push(`/doctor/consultations/${apt.id}/session`)}
                                className="bg-primary hover:bg-primary/90"
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Continue
                              </Button>
                            ) : apt.status === AppointmentStatus.SCHEDULED ? (
                              <Button
                                size="sm"
                                onClick={() => handleStartConsultation(apt)}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Start
                              </Button>
                            ) : null}
                            <Link href={`/doctor/cases/${apt.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="consultations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Consultation History</CardTitle>
                  <CardDescription>
                    Past consultations, outcomes, and clinical notes
                    {consultationHistory?.summary && (
                      <span className="ml-2 text-xs">
                        ({consultationHistory.summary.completed} completed, {consultationHistory.summary.proceduresRecommended} procedures recommended)
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingConsultations ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-4 text-sm text-muted-foreground">Loading consultation history...</p>
                    </div>
                  ) : !consultationHistory || consultationHistory.consultations.length === 0 ? (
                    <div className="text-center py-8">
                      <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">No consultations found</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Consultation records will appear here after appointments are completed.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {consultationHistory.consultations.map((consultation) => (
                        <div
                          key={consultation.id}
                          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Stethoscope className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">
                                    {format(new Date(consultation.appointmentDate), 'MMMM dd, yyyy')}
                                  </span>
                                  <span className="text-sm text-muted-foreground">at {consultation.appointmentTime}</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Dr. {consultation.doctor.name} • {consultation.doctor.specialization}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  consultation.state === ConsultationState.COMPLETED
                                    ? 'default'
                                    : consultation.state === ConsultationState.IN_PROGRESS
                                      ? 'secondary'
                                      : 'outline'
                                }
                              >
                                {consultation.state}
                              </Badge>
                              {consultation.outcomeType && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {getConsultationOutcomeTypeLabel(consultation.outcomeType)}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {/* Outcome and Decision */}
                          {consultation.outcomeType === ConsultationOutcomeType.PROCEDURE_RECOMMENDED && (
                            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Patient Decision</span>
                                <Badge
                                  variant={
                                    consultation.patientDecision === PatientDecision.YES
                                      ? 'default'
                                      : consultation.patientDecision === PatientDecision.NO
                                        ? 'destructive'
                                        : 'secondary'
                                  }
                                >
                                  {consultation.patientDecision === PatientDecision.YES
                                    ? 'Proceeding'
                                    : consultation.patientDecision === PatientDecision.NO
                                      ? 'Declined'
                                      : 'Pending Decision'}
                                </Badge>
                              </div>
                              {consultation.hasCasePlan && (
                                <Link href={`/doctor/cases/${consultation.appointmentId}`}>
                                  <Button variant="link" size="sm" className="p-0 h-auto mt-2">
                                    <Eye className="h-3 w-3 mr-1" />
                                    View Case Plan
                                  </Button>
                                </Link>
                              )}
                            </div>
                          )}
                          
                          {/* Notes Summary */}
                          {consultation.notesSummary && (
                            <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                              {consultation.notesSummary}
                            </p>
                          )}
                          
                          {/* Quick Stats */}
                          <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
                            {consultation.durationMinutes && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {consultation.durationMinutes} min
                              </span>
                            )}
                            {consultation.photoCount > 0 && (
                              <span className="flex items-center gap-1">
                                📷 {consultation.photoCount} photos
                              </span>
                            )}
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-3">
                            <Link href={`/doctor/consultations/${consultation.appointmentId}/session`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
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
            </TabsContent>

            <TabsContent value="medical" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Medical History</CardTitle>
                  <CardDescription>Patient's medical background and conditions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {patient.medicalHistory ? (
                    <div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{patient.medicalHistory}</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">No medical history recorded</p>
                    </div>
                  )}
                  {patient.medicalConditions && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-semibold mb-2">Medical Conditions</p>
                      <p className="text-sm text-foreground">{patient.medicalConditions}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cases" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Cases & Procedures</CardTitle>
                      <CardDescription>Surgical cases and procedure plans</CardDescription>
                    </div>
                    <Link href={`/doctor/patients/${patientId}/case-plans`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View All
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingCasePlans ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-4 text-sm text-muted-foreground">Loading case plans...</p>
                    </div>
                  ) : casePlans.length === 0 ? (
                    <div className="text-center py-8">
                      <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground mb-4">No case plans found</p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Case plans are created when a consultation results in a procedure recommendation.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {casePlans.slice(0, 5).map((casePlan) => (
                        <div
                          key={casePlan.id}
                          className="rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              {casePlan.appointment && (
                                <div className="flex items-center gap-2 mb-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-semibold">
                                    {format(new Date(casePlan.appointment.appointmentDate), 'MMM dd, yyyy')}
                                  </span>
                                  <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                                  <span className="text-sm text-muted-foreground">
                                    {casePlan.appointment.time}
                                  </span>
                                </div>
                              )}
                              {casePlan.procedurePlan && (
                                <p className="text-sm text-foreground line-clamp-2 mb-2">
                                  {casePlan.procedurePlan}
                                </p>
                              )}
                              {casePlan.doctor && (
                                <p className="text-xs text-muted-foreground">
                                  {casePlan.doctor.name} • {casePlan.doctor.specialization}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Badge
                                variant={
                                  casePlan.readinessStatus === CaseReadinessStatus.READY
                                    ? 'default'
                                    : casePlan.readinessStatus === CaseReadinessStatus.PENDING_LABS ||
                                        casePlan.readinessStatus === CaseReadinessStatus.PENDING_CONSENT ||
                                        casePlan.readinessStatus === CaseReadinessStatus.PENDING_REVIEW
                                      ? 'secondary'
                                      : casePlan.readinessStatus === CaseReadinessStatus.ON_HOLD
                                        ? 'destructive'
                                        : 'outline'
                                }
                              >
                                {getCaseReadinessStatusLabel(casePlan.readinessStatus)}
                              </Badge>
                              {casePlan.readyForSurgery && (
                                <Badge variant="default" className="bg-green-500">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Ready
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t">
                            <div className="text-xs text-muted-foreground">
                              Updated: {format(new Date(casePlan.updatedAt), 'MMM dd, yyyy')}
                            </div>
                            <div className="flex items-center gap-2">
                              <Link href={`/doctor/patients/${patientId}/case-plans`}>
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                      {casePlans.length > 5 && (
                        <div className="text-center pt-4">
                          <Link href={`/doctor/patients/${patientId}/case-plans`}>
                            <Button variant="outline" size="sm">
                              View All {casePlans.length} Case Plans
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Clinical Notes</CardTitle>
                  <CardDescription>Doctor's notes and observations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground mb-4">No clinical notes recorded</p>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Start Consultation Dialog */}
      {selectedAppointment && (
        <StartConsultationDialog
          open={startConsultationOpen}
          onClose={() => {
            setStartConsultationOpen(false);
            setSelectedAppointment(null);
          }}
          onSuccess={(appointmentId) => handleConsultationSuccess(appointmentId)}
          appointment={selectedAppointment}
          doctorId={user.id}
        />
      )}
    </div>
  );
}
