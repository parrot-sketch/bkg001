'use client';

/**
 * Doctor Patient Profile Page
 * 
 * Comprehensive patient profile view for doctors with:
 * - Hero header with key vitals & allergy alert
 * - Quick actions (start/continue consultation, view case)
 * - Tabbed detail sections (Appointments, Consultations, Medical, Cases)
 * - Full consultation history with timeline view
 * 
 * Follows the aesthetic surgery center workflow.
 */

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Stethoscope,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Heart,
  Shield,
  Eye,
  Play,
  ChevronRight,
  Briefcase,
  Users,
  Camera,
  Activity,
  Clipboard,
  ExternalLink,
  CircleDot,
  Hash,
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isPast, isFuture } from 'date-fns';
import { calculateAge } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import { StartConsultationDialog } from '@/components/doctor/StartConsultationDialog';
import { usePatientConsultationHistory } from '@/hooks/consultation/usePatientConsultationHistory';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { 
  AppointmentStatus, 
  canStartConsultation, 
  isAwaitingConfirmation, 
  isAppointmentFinal,
} from '@/domain/enums/AppointmentStatus';
import { CaseReadinessStatus, getCaseReadinessStatusLabel } from '@/domain/enums/CaseReadinessStatus';
import { ConsultationState } from '@/domain/enums/ConsultationState';
import { ConsultationOutcomeType, getConsultationOutcomeTypeLabel } from '@/domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '@/domain/enums/PatientDecision';

// ============================================================================
// STATUS DISPLAY CONFIG
// ============================================================================

function getAppointmentStatusConfig(status: string) {
  const configs: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    PENDING: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
    PENDING_DOCTOR_CONFIRMATION: { label: 'Awaiting Confirmation', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-500' },
    CONFIRMED: { label: 'Confirmed', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
    SCHEDULED: { label: 'Scheduled', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
    CHECKED_IN: { label: 'Checked In', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
    READY_FOR_CONSULTATION: { label: 'Ready', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
    IN_CONSULTATION: { label: 'In Consultation', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200', dot: 'bg-violet-500' },
    COMPLETED: { label: 'Completed', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', dot: 'bg-slate-400' },
    CANCELLED: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
    NO_SHOW: { label: 'No Show', color: 'text-red-700', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
  };
  return configs[status] || { label: status, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', dot: 'bg-slate-400' };
}

function getConsultationStateConfig(state: string) {
  const configs: Record<string, { label: string; color: string; bg: string }> = {
    NOT_STARTED: { label: 'Not Started', color: 'text-slate-600', bg: 'bg-slate-100' },
    IN_PROGRESS: { label: 'In Progress', color: 'text-violet-700', bg: 'bg-violet-100' },
    COMPLETED: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-100' },
    DRAFT: { label: 'Draft', color: 'text-amber-700', bg: 'bg-amber-100' },
  };
  return configs[state] || { label: state, color: 'text-slate-600', bg: 'bg-slate-100' };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DoctorPatientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const patientId = params.patientId as string;

  // Navigation context
  const fromConsultation = searchParams.get('from') === 'consultation';
  const consultationAppointmentId = searchParams.get('appointmentId');

  const [patient, setPatient] = useState<PatientResponseDto | null>(null);
  const [appointments, setAppointments] = useState<AppointmentResponseDto[]>([]);
  const [casePlans, setCasePlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCasePlans, setLoadingCasePlans] = useState(false);
  const [startConsultationOpen, setStartConsultationOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentResponseDto | null>(null);

  // Consultation history
  const {
    data: consultationHistory,
    isLoading: loadingConsultations,
  } = usePatientConsultationHistory(patientId || null);

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
    loadPatientData();
  }, [isAuthenticated, user, patientId, authLoading, router]);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      
      const patientResponse = await doctorApi.getPatient(patientId);
      if (patientResponse.success && patientResponse.data) {
        setPatient(patientResponse.data);
      } else {
        toast.error('Failed to load patient data');
        router.push('/doctor/patients');
        return;
      }

      const appointmentsResponse = await doctorApi.getPatientAppointments(patientId);
      if (appointmentsResponse.success && appointmentsResponse.data) {
        setAppointments(appointmentsResponse.data);
      }

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
    router.push(`/doctor/consultations/${appointmentId}/session`);
  };

  // ============================================================================
  // DERIVED DATA
  // ============================================================================

  const { upcomingAppointments, pastAppointments, activeAppointment, nextAppointment } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const sorted = [...appointments].sort(
      (a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()
    );

    // Active = IN_CONSULTATION or CHECKED_IN today
    const active = sorted.find(
      (apt) =>
        apt.status === AppointmentStatus.IN_CONSULTATION ||
        ((apt.status === AppointmentStatus.CHECKED_IN || apt.status === AppointmentStatus.READY_FOR_CONSULTATION) &&
          isToday(new Date(apt.appointmentDate)))
    ) || null;

    const upcoming = sorted
      .filter((apt) => {
        const aptDate = new Date(apt.appointmentDate);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate >= now && !isAppointmentFinal(apt.status as AppointmentStatus);
      })
      .reverse(); // chronological order

    const past = sorted.filter((apt) => {
      const aptDate = new Date(apt.appointmentDate);
      aptDate.setHours(0, 0, 0, 0);
      return aptDate < now || isAppointmentFinal(apt.status as AppointmentStatus);
    });

    const next = upcoming[0] || null;

    return { upcomingAppointments: upcoming, pastAppointments: past, activeAppointment: active, nextAppointment: next };
  }, [appointments]);

  const stats = useMemo(() => {
    const totalConsultations = consultationHistory?.summary?.total ?? 0;
    const completedConsultations = consultationHistory?.summary?.completed ?? 0;
    const proceduresRecommended = consultationHistory?.summary?.proceduresRecommended ?? 0;
    const totalPhotos = consultationHistory?.summary?.totalPhotos ?? 0;

    return {
      totalAppointments: appointments.length,
      upcomingCount: upcomingAppointments.length,
      totalConsultations,
      completedConsultations,
      proceduresRecommended,
      totalPhotos,
      totalCasePlans: casePlans.length,
    };
  }, [appointments, upcomingAppointments, consultationHistory, casePlans]);

  // ============================================================================
  // LOADING & ERROR STATES
  // ============================================================================

  if (authLoading || loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Please log in to view patient profile</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <User className="h-16 w-16 text-muted-foreground/40" />
        <p className="text-muted-foreground">Patient not found</p>
        <Button variant="outline" onClick={() => router.push('/doctor/patients')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Patients
        </Button>
      </div>
    );
  }

  const patientName = `${patient.firstName} ${patient.lastName}`;
  const initials = `${patient.firstName?.[0] ?? ''}${patient.lastName?.[0] ?? ''}`.toUpperCase();
  const age = calculateAge(patient.dateOfBirth);
  const hasAllergies = !!patient.allergies && patient.allergies.trim().length > 0;

  // Determine primary CTA
  const canStartConsult = activeAppointment && canStartConsultation(activeAppointment.status as AppointmentStatus);
  const isInConsultation = activeAppointment?.status === AppointmentStatus.IN_CONSULTATION;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ================================================================== */}
      {/* BREADCRUMB + BACK NAVIGATION                                       */}
      {/* ================================================================== */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {fromConsultation && consultationAppointmentId ? (
          <>
            <button
              onClick={() => router.push(`/doctor/consultations/${consultationAppointmentId}/session`)}
              className="hover:text-foreground transition-colors"
            >
              Consultation
            </button>
            <ChevronRight className="h-3.5 w-3.5" />
          </>
        ) : (
          <>
            <button
              onClick={() => router.push('/doctor/patients')}
              className="hover:text-foreground transition-colors"
            >
              Patients
            </button>
            <ChevronRight className="h-3.5 w-3.5" />
          </>
        )}
        <span className="text-foreground font-medium">{patientName}</span>
      </div>

      {/* ================================================================== */}
      {/* HERO HEADER — Patient Identity + Vital Info + CTA                  */}
      {/* ================================================================== */}
      <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        {/* Decorative */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />

        <div className="relative p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            {/* Avatar + Core Info */}
            <div className="flex items-center gap-5 flex-1 min-w-0">
              <Avatar className="h-20 w-20 border-2 border-white/20 shadow-xl flex-shrink-0">
                <AvatarImage src={patient.profileImage ?? undefined} alt={patientName} />
                <AvatarFallback className="bg-white/10 text-white text-2xl font-bold backdrop-blur-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl lg:text-3xl font-bold tracking-tight truncate">{patientName}</h1>
                  {hasAllergies && (
                    <Badge className="bg-red-500/20 text-red-200 border border-red-400/30 text-xs font-semibold">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Allergies
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 mt-2 text-sm text-white/70 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" />
                    {patient.fileNumber}
                  </span>
                  <span className="text-white/30">•</span>
                  <span>{age}</span>
                  <span className="text-white/30">•</span>
                  <span>{patient.gender}</span>
                  {patient.bloodGroup && (
                    <>
                      <span className="text-white/30">•</span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5 text-red-400" />
                        {patient.bloodGroup}
                      </span>
                    </>
                  )}
                </div>

                {/* Contact Row */}
                <div className="flex items-center gap-4 mt-2 text-sm text-white/60 flex-wrap">
                  {patient.phone && (
                    <a href={`tel:${patient.phone}`} className="flex items-center gap-1 hover:text-white/90 transition-colors">
                      <Phone className="h-3.5 w-3.5" />
                      {patient.phone}
                    </a>
                  )}
                  {patient.email && (
                    <a href={`mailto:${patient.email}`} className="flex items-center gap-1 hover:text-white/90 transition-colors truncate max-w-[200px]">
                      <Mail className="h-3.5 w-3.5" />
                      {patient.email}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Primary CTA */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {isInConsultation && activeAppointment ? (
                <Button
                  size="lg"
                  onClick={() => router.push(`/doctor/consultations/${activeAppointment.id}/session`)}
                  className="bg-violet-500 hover:bg-violet-600 text-white font-bold shadow-lg shadow-violet-500/25"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Continue Consultation
                </Button>
              ) : canStartConsult && activeAppointment ? (
                <Button
                  size="lg"
                  onClick={() => handleStartConsultation(activeAppointment)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/25"
                >
                  <Stethoscope className="h-5 w-5 mr-2" />
                  Start Consultation
                </Button>
              ) : nextAppointment ? (
                <Link href={`/doctor/appointments/${nextAppointment.id}`}>
                  <Button size="lg" variant="secondary" className="font-semibold">
                    <Calendar className="h-5 w-5 mr-2" />
                    Next: {format(new Date(nextAppointment.appointmentDate), 'MMM d')} at {nextAppointment.time}
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* ALLERGY ALERT BANNER                                               */}
      {/* ================================================================== */}
      {hasAllergies && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 text-sm">Known Allergies</p>
            <p className="text-red-700 text-sm mt-0.5">{patient.allergies}</p>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SUMMARY STRIP — Key Stats                                          */}
      {/* ================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Appointments', value: stats.totalAppointments, icon: Calendar, color: 'text-blue-600' },
          { label: 'Upcoming', value: stats.upcomingCount, icon: Clock, color: 'text-amber-600' },
          { label: 'Consultations', value: stats.completedConsultations, icon: Stethoscope, color: 'text-violet-600' },
          { label: 'Procedures Rec.', value: stats.proceduresRecommended, icon: Activity, color: 'text-indigo-600' },
          { label: 'Case Plans', value: stats.totalCasePlans, icon: Clipboard, color: 'text-emerald-600' },
          { label: 'Photos', value: stats.totalPhotos, icon: Camera, color: 'text-pink-600' },
          { label: 'Patient Since', value: patient.createdAt ? format(new Date(patient.createdAt), 'MMM yyyy') : '—', icon: User, color: 'text-slate-600' },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
            <stat.icon className={`h-4 w-4 ${stat.color} flex-shrink-0`} />
            <div className="min-w-0">
              <p className="text-lg font-bold text-slate-900 leading-none">{stat.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5 truncate">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ================================================================== */}
      {/* MAIN CONTENT — Sidebar + Tabs                                      */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT SIDEBAR — Patient Details Card */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-5">
          
          {/* Contact & Personal Info */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Patient Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {/* Personal */}
              <div className="space-y-2.5">
                {patient.address && (
                  <div className="flex items-start gap-2.5 text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span>{patient.address}</span>
                  </div>
                )}
                {patient.occupation && (
                  <div className="flex items-center gap-2.5 text-slate-600">
                    <Briefcase className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span>{patient.occupation}</span>
                  </div>
                )}
                {patient.maritalStatus && (
                  <div className="flex items-center gap-2.5 text-slate-600">
                    <Users className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="capitalize">{patient.maritalStatus.toLowerCase()}</span>
                  </div>
                )}
                {patient.whatsappPhone && (
                  <div className="flex items-center gap-2.5 text-slate-600">
                    <Phone className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>WhatsApp: {patient.whatsappPhone}</span>
                  </div>
                )}
              </div>

              {/* Emergency Contact */}
              {patient.emergencyContactName && (
                <div className="pt-3 border-t space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Emergency Contact</p>
                  <div className="p-3 rounded-lg bg-slate-50">
                    <p className="font-medium text-slate-900">{patient.emergencyContactName}</p>
                    <p className="text-slate-500 text-xs capitalize">{patient.relation}</p>
                    {patient.emergencyContactNumber && (
                      <a href={`tel:${patient.emergencyContactNumber}`} className="text-blue-600 hover:text-blue-700 text-xs mt-1 inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {patient.emergencyContactNumber}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Insurance */}
              {(patient.insuranceProvider || patient.insuranceNumber) && (
                <div className="pt-3 border-t space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Insurance</p>
                  <div className="p-3 rounded-lg bg-slate-50">
                    {patient.insuranceProvider && (
                      <p className="font-medium text-slate-900">{patient.insuranceProvider}</p>
                    )}
                    {patient.insuranceNumber && (
                      <p className="text-slate-500 text-xs">Policy: {patient.insuranceNumber}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Consent Status */}
              <div className="pt-3 border-t space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Consent Status</p>
                <div className="space-y-1.5">
                  {[
                    { label: 'Privacy', granted: patient.hasPrivacyConsent },
                    { label: 'Medical', granted: patient.hasMedicalConsent },
                    { label: 'Service', granted: patient.hasServiceConsent },
                  ].map(({ label, granted }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-slate-500">{label}</span>
                      {granted ? (
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Granted
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Medical Info Summary */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Medical Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {patient.bloodGroup && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Blood Group</span>
                  <Badge variant="outline" className="font-bold">{patient.bloodGroup}</Badge>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Allergies</span>
                {hasAllergies ? (
                  <Badge variant="destructive" className="text-xs">{patient.allergies}</Badge>
                ) : (
                  <span className="text-emerald-600 text-xs font-medium">None known</span>
                )}
              </div>
              {patient.medicalConditions && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Conditions</p>
                  <p className="text-slate-700 text-sm">{patient.medicalConditions}</p>
                </div>
              )}
              {patient.medicalHistory && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Medical History</p>
                  <p className="text-slate-700 text-sm line-clamp-4">{patient.medicalHistory}</p>
                </div>
              )}
              {!patient.medicalConditions && !patient.medicalHistory && !patient.bloodGroup && !hasAllergies && (
                <div className="text-center py-4">
                  <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-400 text-xs">No medical records</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT CONTENT — Tabs */}
        <div className="lg:col-span-8 xl:col-span-9">
          <Tabs defaultValue="appointments" className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-11 bg-slate-100/80 p-1 rounded-xl">
              <TabsTrigger value="appointments" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Calendar className="h-4 w-4 mr-1.5 hidden sm:inline" />
                Appointments
              </TabsTrigger>
              <TabsTrigger value="consultations" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Stethoscope className="h-4 w-4 mr-1.5 hidden sm:inline" />
                Consultations
              </TabsTrigger>
              <TabsTrigger value="cases" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Clipboard className="h-4 w-4 mr-1.5 hidden sm:inline" />
                Cases
              </TabsTrigger>
              <TabsTrigger value="medical" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <FileText className="h-4 w-4 mr-1.5 hidden sm:inline" />
                Medical
              </TabsTrigger>
            </TabsList>

            {/* ============================================================ */}
            {/* APPOINTMENTS TAB                                              */}
            {/* ============================================================ */}
            <TabsContent value="appointments" className="mt-5 space-y-5">
              {/* Upcoming Section */}
              {upcomingAppointments.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Upcoming</h3>
                  {upcomingAppointments.map((apt) => (
                    <AppointmentRow
                      key={apt.id}
                      appointment={apt}
                      onStartConsultation={handleStartConsultation}
                      onNavigate={(id) => router.push(`/doctor/appointments/${id}`)}
                    />
                  ))}
                </div>
              )}

              {/* Past Section */}
              {pastAppointments.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">History</h3>
                  {pastAppointments.slice(0, 10).map((apt) => (
                    <AppointmentRow
                      key={apt.id}
                      appointment={apt}
                      onStartConsultation={handleStartConsultation}
                      onNavigate={(id) => router.push(`/doctor/appointments/${id}`)}
                      isPast
                    />
                  ))}
                  {pastAppointments.length > 10 && (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      Showing 10 of {pastAppointments.length} past appointments
                    </p>
                  )}
                </div>
              )}

              {appointments.length === 0 && (
                <EmptyState
                  icon={Calendar}
                  title="No Appointments"
                  description="This patient has no appointment history yet."
                />
              )}
            </TabsContent>

            {/* ============================================================ */}
            {/* CONSULTATIONS TAB                                             */}
            {/* ============================================================ */}
            <TabsContent value="consultations" className="mt-5 space-y-4">
              {/* Summary Banner */}
              {consultationHistory?.summary && consultationHistory.summary.total > 0 && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-violet-50 border border-violet-100 text-sm">
                  <Stethoscope className="h-5 w-5 text-violet-600 flex-shrink-0" />
                  <p className="text-violet-800">
                    <strong>{consultationHistory.summary.completed}</strong> completed consultations
                    {consultationHistory.summary.proceduresRecommended > 0 && (
                      <> · <strong>{consultationHistory.summary.proceduresRecommended}</strong> procedures recommended</>
                    )}
                    {consultationHistory.summary.totalPhotos > 0 && (
                      <> · <strong>{consultationHistory.summary.totalPhotos}</strong> photos</>
                    )}
                  </p>
                </div>
              )}

              {loadingConsultations ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-xl" />
                  ))}
                </div>
              ) : !consultationHistory || consultationHistory.consultations.length === 0 ? (
                <EmptyState
                  icon={Stethoscope}
                  title="No Consultations"
                  description="Consultation records will appear here after appointments are completed."
                />
              ) : (
                <div className="space-y-4">
                  {consultationHistory.consultations.map((consultation, index) => {
                    const stateConfig = getConsultationStateConfig(consultation.state);
                    return (
                      <div key={consultation.id} className="relative">
                        {/* Timeline connector */}
                        {index < consultationHistory.consultations.length - 1 && (
                          <div className="absolute left-[19px] top-14 bottom-0 w-px bg-slate-200 -mb-4" />
                        )}

                        <div className="flex gap-4">
                          {/* Timeline dot */}
                          <div className="flex-shrink-0 mt-1">
                            <div className={`h-[38px] w-[38px] rounded-full ${stateConfig.bg} flex items-center justify-center`}>
                              <Stethoscope className={`h-4 w-4 ${stateConfig.color}`} />
                            </div>
                          </div>

                          {/* Content */}
                          <Card className="flex-1 border-slate-200 hover:shadow-sm transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div>
                                  <p className="font-semibold text-slate-900">
                                    {format(new Date(consultation.appointmentDate), 'MMMM d, yyyy')}
                                    <span className="font-normal text-slate-500 ml-2">at {consultation.appointmentTime}</span>
                                  </p>
                                  <p className="text-sm text-slate-500">
                                    Dr. {consultation.doctor.name} · {consultation.doctor.specialization}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Badge variant="outline" className={`text-xs ${stateConfig.color} ${stateConfig.bg}`}>
                                    {stateConfig.label}
                                  </Badge>
                                  {consultation.outcomeType && (
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                      {getConsultationOutcomeTypeLabel(consultation.outcomeType)}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Procedure Decision */}
                              {consultation.outcomeType === ConsultationOutcomeType.PROCEDURE_RECOMMENDED && (
                                <div className="flex items-center gap-3 mt-2 p-2.5 rounded-lg bg-slate-50">
                                  <span className="text-xs text-slate-500">Patient Decision:</span>
                                  <Badge
                                    variant={
                                      consultation.patientDecision === PatientDecision.YES
                                        ? 'default'
                                        : consultation.patientDecision === PatientDecision.NO
                                          ? 'destructive'
                                          : 'secondary'
                                    }
                                    className="text-xs"
                                  >
                                    {consultation.patientDecision === PatientDecision.YES
                                      ? 'Proceeding'
                                      : consultation.patientDecision === PatientDecision.NO
                                        ? 'Declined'
                                        : 'Pending'}
                                  </Badge>
                                  {consultation.hasCasePlan && (
                                    <Link href={`/doctor/cases/${consultation.appointmentId}`} className="ml-auto">
                                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                                        <Eye className="h-3 w-3 mr-1" />
                                        Case Plan
                                      </Button>
                                    </Link>
                                  )}
                                </div>
                              )}

                              {/* Notes Summary */}
                              {consultation.notesSummary && (
                                <p className="text-sm text-slate-500 mt-2 line-clamp-2 italic">
                                  "{consultation.notesSummary}"
                                </p>
                              )}

                              {/* Footer */}
                              <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-3 text-xs text-slate-400">
                                  {consultation.durationMinutes && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {consultation.durationMinutes} min
                                    </span>
                                  )}
                                  {consultation.photoCount > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Camera className="h-3 w-3" />
                                      {consultation.photoCount} photos
                                    </span>
                                  )}
                                </div>
                                <Link href={`/doctor/consultations/${consultation.appointmentId}/session`}>
                                  <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500 hover:text-slate-900">
                                    View Details
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                  </Button>
                                </Link>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ============================================================ */}
            {/* CASES TAB                                                     */}
            {/* ============================================================ */}
            <TabsContent value="cases" className="mt-5 space-y-4">
              {loadingCasePlans ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                  ))}
                </div>
              ) : casePlans.length === 0 ? (
                <EmptyState
                  icon={Clipboard}
                  title="No Case Plans"
                  description="Case plans are created when a consultation results in a procedure recommendation."
                />
              ) : (
                <div className="space-y-4">
                  {casePlans.map((casePlan) => {
                    const readinessConfig = getCaseReadinessConfig(casePlan.readinessStatus);
                    return (
                      <Card key={casePlan.id} className="border-slate-200 hover:shadow-sm transition-shadow">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              {casePlan.appointment && (
                                <div className="flex items-center gap-2 text-sm mb-1">
                                  <Calendar className="h-4 w-4 text-slate-400" />
                                  <span className="font-semibold text-slate-900">
                                    {format(new Date(casePlan.appointment.appointmentDate), 'MMM d, yyyy')}
                                  </span>
                                  <span className="text-slate-400">at</span>
                                  <span className="text-slate-600">{casePlan.appointment.time}</span>
                                  <span className="text-slate-300">·</span>
                                  <span className="text-slate-500">{casePlan.appointment.type}</span>
                                </div>
                              )}
                              {casePlan.procedurePlan && (
                                <p className="text-sm text-slate-700 mt-2 line-clamp-2">{casePlan.procedurePlan}</p>
                              )}
                              {casePlan.doctor && (
                                <p className="text-xs text-slate-400 mt-1.5">{casePlan.doctor.name} · {casePlan.doctor.specialization}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant="outline" className={`text-xs ${readinessConfig.color} ${readinessConfig.bg}`}>
                                {getCaseReadinessStatusLabel(casePlan.readinessStatus)}
                              </Badge>
                              {casePlan.readyForSurgery && (
                                <Badge className="bg-emerald-500 text-white text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Ready
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                            <span className="text-xs text-slate-400">
                              Updated {format(new Date(casePlan.updatedAt), 'MMM d, yyyy')}
                            </span>
                            <Link href={`/doctor/patients/${patientId}/case-plans`}>
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500 hover:text-slate-900">
                                View Details
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ============================================================ */}
            {/* MEDICAL TAB                                                   */}
            {/* ============================================================ */}
            <TabsContent value="medical" className="mt-5 space-y-5">
              {/* Medical History */}
              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    Medical History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {patient.medicalHistory ? (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{patient.medicalHistory}</p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No medical history recorded</p>
                  )}
                </CardContent>
              </Card>

              {/* Medical Conditions */}
              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-slate-400" />
                    Medical Conditions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {patient.medicalConditions ? (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{patient.medicalConditions}</p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No medical conditions recorded</p>
                  )}
                </CardContent>
              </Card>

              {/* Allergies Detail */}
              <Card className={`border-slate-200 ${hasAllergies ? 'border-red-200' : ''}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${hasAllergies ? 'text-red-500' : 'text-slate-400'}`} />
                    Allergies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {hasAllergies ? (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                      <p className="text-sm text-red-800 font-medium">{patient.allergies}</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-emerald-700">No known allergies</span>
                    </div>
                  )}
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

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function AppointmentRow({
  appointment,
  onStartConsultation,
  onNavigate,
  isPast = false,
}: {
  appointment: AppointmentResponseDto;
  onStartConsultation: (apt: AppointmentResponseDto) => void;
  onNavigate: (id: number) => void;
  isPast?: boolean;
}) {
  const config = getAppointmentStatusConfig(appointment.status);
  const canConsult = canStartConsultation(appointment.status as AppointmentStatus);
  const isContinue = appointment.status === AppointmentStatus.IN_CONSULTATION;

  return (
    <div
      className="group flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => onNavigate(appointment.id)}
    >
      {/* Status dot + date */}
      <div className="flex-shrink-0 text-center min-w-[60px]">
        <p className={`text-lg font-bold leading-none ${isPast ? 'text-slate-400' : 'text-slate-900'}`}>
          {format(new Date(appointment.appointmentDate), 'd')}
        </p>
        <p className={`text-xs mt-0.5 ${isPast ? 'text-slate-300' : 'text-slate-500'}`}>
          {format(new Date(appointment.appointmentDate), 'MMM yy')}
        </p>
      </div>

      {/* Separator */}
      <div className={`w-1 h-10 rounded-full flex-shrink-0 ${config.dot}`} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium ${isPast ? 'text-slate-500' : 'text-slate-900'}`}>
            {appointment.time}
          </span>
          <span className="text-slate-300">·</span>
          <span className={`text-sm ${isPast ? 'text-slate-400' : 'text-slate-600'}`}>{appointment.type}</span>
        </div>
        {appointment.note && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">{appointment.note}</p>
        )}
      </div>

      {/* Status + Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge variant="outline" className={`text-[10px] font-semibold ${config.color} ${config.bg} border`}>
          {config.label}
        </Badge>

        {isContinue && (
          <Button
            size="sm"
            className="h-8 bg-violet-500 hover:bg-violet-600 text-white text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(appointment.id);
            }}
          >
            <Play className="h-3 w-3 mr-1" />
            Continue
          </Button>
        )}

        {canConsult && !isContinue && (
          <Button
            size="sm"
            className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onStartConsultation(appointment);
            }}
          >
            <Stethoscope className="h-3 w-3 mr-1" />
            Start
          </Button>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="font-semibold text-slate-700 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm">{description}</p>
    </div>
  );
}

function getCaseReadinessConfig(status: string) {
  const configs: Record<string, { color: string; bg: string }> = {
    READY: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    PENDING_LABS: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    PENDING_CONSENT: { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
    PENDING_REVIEW: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
    ON_HOLD: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  };
  return configs[status] || { color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' };
}
