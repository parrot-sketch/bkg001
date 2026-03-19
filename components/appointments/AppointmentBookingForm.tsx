'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    ArrowLeft, CheckCircle, User,
    FileText, ChevronsRight, Sun, Sunset, Moon, Loader2, Calendar as CalendarIcon, Stethoscope, Clock, CheckCircle2, ChevronRight, MapPin
} from 'lucide-react';
import { ProfileImage } from '@/components/profile-image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PatientCombobox } from '@/components/frontdesk/PatientCombobox';
import { DoctorSelect } from '@/components/patient/DoctorSelect';
import { Calendar } from '@/components/ui/calendar';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { doctorApi } from '@/lib/api/doctor';
import { patientApi } from '@/lib/api/patient';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, addMonths, endOfMonth, isToday, isTomorrow, startOfDay, isAfter, startOfToday } from 'date-fns';
import { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';
import { usePatientAppointments } from '@/hooks/appointments/useAppointments';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';

interface AppointmentBookingFormProps {
    mode?: 'full' | 'quick'; // NEW: Determines workflow behavior
    initialPatientId?: string;
    initialPatient?: PatientResponseDto;
    initialDoctorId?: string;
    initialDoctor?: DoctorResponseDto;
    initialDate?: string; // ISO date string or YYYY-MM-DD
    initialTime?: string; // HH:mm format
    initialType?: string;
    userRole?: 'doctor' | 'frontdesk';
    lockDoctor?: boolean; // NEW: Prevents changing doctor selection
    /** Appointment source (PATIENT_REQUESTED, FRONTDESK_SCHEDULED, DOCTOR_FOLLOW_UP) */
    source?: AppointmentSource | string;
    /** Booking channel (UI entry point) for analytics */
    bookingChannel?: BookingChannel;
    /** Parent appointment ID for follow-up linkage */
    parentAppointmentId?: number;
    /** Parent consultation ID for follow-up linkage */
    parentConsultationId?: number;
    onSuccess?: (appointmentId?: number, date?: Date) => void;
    onCancel?: () => void;
}

export function AppointmentBookingForm({
    mode = 'full',
    initialPatientId,
    initialPatient,
    initialDoctorId,
    initialDoctor,
    initialDate,
    initialTime,
    initialType,
    userRole = 'frontdesk',
    lockDoctor = false,
    source,
    bookingChannel,
    parentAppointmentId,
    parentConsultationId,
    onSuccess,
    onCancel
}: AppointmentBookingFormProps) {
    const router = useRouter();

    const isFollowUp = source === AppointmentSource.DOCTOR_FOLLOW_UP || source === 'DOCTOR_FOLLOW_UP' || initialType === 'Follow-up';

    // Steps: 1. Doctor, 2. Patient, 3. DateTime, 4. Details/Review
    // Always start at step 1 for consistent UX regardless of entry point
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form Data
    const [formData, setFormData] = useState<{
        patientId: string;
        doctorId: string;
        appointmentDate: string; // YYYY-MM-DD
        selectedSlot: string | null; // HH:mm
        type: string;
        reason: string; // Optional reason for appointment
        note: string;
    }>(() => {
        // Parse initialDate if it's an ISO string
        let parsedDate = '';
        if (initialDate) {
            try {
                const dateObj = new Date(initialDate);
                parsedDate = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
            } catch (e) {
                parsedDate = initialDate; // Assume it's already YYYY-MM-DD
            }
        }

        return {
            patientId: initialPatientId || '',
            doctorId: initialDoctorId || '',
            appointmentDate: parsedDate,
            selectedSlot: initialTime || null,
            type: initialType || '',
            reason: '', // Optional reason field
            note: '',
        };
    });

    const [selectedPatient, setSelectedPatient] = useState<PatientResponseDto | null>(initialPatient || null);
    const [selectedDoctor, setSelectedDoctor] = useState<DoctorResponseDto | null>(initialDoctor || null);

    // Data Loading
    const [doctors, setDoctors] = useState<DoctorResponseDto[]>([]);
    const [loadingDoctors, setLoadingDoctors] = useState(false);

    // Load available dates
    const today = new Date();
    const dateRangeEnd = endOfMonth(addMonths(today, 2));

    // Check for existing appointments on selected date
    const { data: patientAppointments = [] } = usePatientAppointments(
        formData.patientId,
        !!formData.patientId && !!formData.appointmentDate
    );

    // Check for conflicts on selected date
    const existingAppointmentsOnDate = useMemo(() => {
        if (!formData.appointmentDate || !formData.patientId) return [];
        
        const selectedDateOnly = startOfDay(new Date(formData.appointmentDate));
        const excludedStatuses = [AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED];
        
        return patientAppointments.filter((apt) => {
            const aptDate = startOfDay(new Date(apt.appointmentDate));
            return (
                aptDate.getTime() === selectedDateOnly.getTime() &&
                !excludedStatuses.includes(apt.status as AppointmentStatus)
            );
        });
    }, [patientAppointments, formData.appointmentDate, formData.patientId]);

    // Check for same-doctor conflict (will be blocked by backend, but show warning)
    const sameDoctorConflict = useMemo(() => {
        if (!formData.doctorId || existingAppointmentsOnDate.length === 0) return null;
        return existingAppointmentsOnDate.find(
            apt => apt.doctorId === formData.doctorId
        );
    }, [existingAppointmentsOnDate, formData.doctorId]);

    // Check for different-doctor appointments (allowed but show info)
    const differentDoctorAppointments = useMemo(() => {
        if (!formData.doctorId || existingAppointmentsOnDate.length === 0) return [];
        return existingAppointmentsOnDate.filter(
            apt => apt.doctorId !== formData.doctorId
        );
    }, [existingAppointmentsOnDate, formData.doctorId]);

    // Effects
    useEffect(() => {
        if (initialDoctorId && !initialDoctor) {
            loadSpecificDoctor(initialDoctorId);
        }
        loadDoctors();
    }, [initialDoctorId, initialDoctor]);

    // Load patient if ID provided but no full object
    useEffect(() => {
        if (initialPatientId && !selectedPatient && !initialPatient) {
            loadSpecificPatient(initialPatientId);
        }
    }, [initialPatientId, initialPatient]);

    // Update selected doctor when formData changes
    useEffect(() => {
        if (formData.doctorId && doctors.length > 0) {
            const found = doctors.find(d => d.id === formData.doctorId);
            if (found) setSelectedDoctor(found);
        }
    }, [formData.doctorId, doctors]);



    const loadSpecificPatient = async (id: string) => {
        try {
            // Use doctorApi if user is doctor, else frontdeskApi/patientApi
            // Assuming frontdeskApi.getPatient works
            const response = await frontdeskApi.getPatient(id);
            if (response.success && response.data) {
                setSelectedPatient(response.data);
                setFormData(prev => ({ ...prev, patientId: id }));
            }
        } catch (error) {
            console.error('Failed to load patient', error);
        }
    };

    const loadSpecificDoctor = async (id: string) => {
        try {
            const response = await doctorApi.getDoctor(id);
            if (response.success && response.data) {
                setSelectedDoctor(response.data);
                setFormData(prev => ({ ...prev, doctorId: id }));
            }
        } catch (error) {
            console.error('Failed to load specific doctor', error);
        }
    };

    const loadDoctors = async () => {
        setLoadingDoctors(true);
        try {
            const response = await patientApi.getAllDoctors();
            if (response.success && response.data) {
                setDoctors(response.data);
            }
        } catch (error) {
            console.error('Failed to load doctors', error);
        } finally {
            setLoadingDoctors(false);
        }
    };

    const handleNext = () => {
        if (canProceed()) {
            if (currentStep === 1) {
                // If patient is already selected (e.g. from profile), skip Step 2
                if (formData.patientId) {
                    setCurrentStep(3);
                } else {
                    setCurrentStep(2);
                }
            } else {
                setCurrentStep(prev => prev + 1);
            }
        }
    };

    const handleBack = () => {
        if (currentStep === 3) {
            // If patient was pre-selected, go back to Doctor (Step 1)
            if (initialPatientId || initialPatient) {
                setCurrentStep(1);
            } else {
                setCurrentStep(2);
            }
        } else if (currentStep === 2) {
            // Go back to Step 1 (Doctor)
            setCurrentStep(1);
        } else if (currentStep === 1) {
            // If we are at the first step, cancel/close
            if (onCancel) onCancel();
        } else {
            setCurrentStep(prev => prev - 1);
        }
    };

    const canProceed = () => {
        switch (currentStep) {
            case 1: return !!formData.doctorId;
            case 2: return !!formData.patientId;
            case 3: return !!formData.appointmentDate && !!formData.selectedSlot;
            case 4: return !!formData.type;
            default: return false;
        }
    };

    const handleSubmit = async () => {
        if (!formData.patientId || !formData.doctorId || !formData.appointmentDate || !formData.selectedSlot || !formData.type) {
            toast.error('Missing required fields');
            return;
        }

        // Prevent submission if there's a same-doctor conflict (backend will also block, but UX is better)
        if (sameDoctorConflict) {
            toast.warning(
                `This patient already has an appointment with this doctor on ${format(new Date(formData.appointmentDate), 'MMMM d, yyyy')} at ${sameDoctorConflict.time}. Please choose a different date.`,
                { duration: 5000 }
            );
            return;
        }

        setIsSubmitting(true);
        try {
            const api = userRole === 'doctor' ? doctorApi : frontdeskApi;

            const response = await api.scheduleAppointment({
                patientId: formData.patientId,
                doctorId: formData.doctorId,
                appointmentDate: new Date(formData.appointmentDate),
                time: formData.selectedSlot,
                type: formData.type,
                reason: formData.reason || undefined, // Optional reason field
                note: formData.note,
                // Source-aware fields for follow-up linkage
                ...(source ? { source: typeof source === 'string' ? source : source } : {}),
                ...(bookingChannel ? { bookingChannel } : {}),
                ...(parentAppointmentId ? { parentAppointmentId } : {}),
                ...(parentConsultationId ? { parentConsultationId } : {}),
            });

            if (response.success) {
                toast.success(isFollowUp
                    ? 'Follow-up appointment scheduled successfully'
                    : 'Appointment scheduled successfully'
                );
                if (onSuccess) {
                    onSuccess(response.data?.id, new Date(formData.appointmentDate));
                } else {
                    router.back();
                }
            } else {
                // Provide more helpful error messages
                let errorMessage = response.error || 'Failed to schedule appointment';
                
                // Check for availability-related errors
                if (errorMessage.includes('no availability configured') || errorMessage.includes('availability schedule')) {
                    if (isFollowUp) {
                        // For follow-up appointments, this shouldn't happen (we allow it), but show helpful message
                        errorMessage = 'Unable to schedule appointment. Please configure your availability schedule in Settings → Schedule, or contact support.';
                    } else {
                        errorMessage = 'The selected doctor has not configured their availability schedule. Please ask the doctor to set up their working hours, or contact the administrator.';
                    }
                } else if (errorMessage.includes('not available') || errorMessage.includes('already booked')) {
                    errorMessage = `The selected time slot is not available. ${isFollowUp ? 'Please choose a different time, or configure your availability schedule if you need to schedule outside your regular hours.' : 'Please select a different date or time.'}`;
                }
                
                toast.error(errorMessage, { duration: 6000 });
            }
        } catch (error: any) {
            console.error('Booking error', error);
            
            // Extract error message from various error types
            let errorMessage = 'An error occurred while booking the appointment';
            
            if (error?.message) {
                errorMessage = error.message;
            } else if (error?.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }
            
            // Provide helpful context for availability errors
            if (errorMessage.includes('no availability configured') || errorMessage.includes('availability schedule')) {
                if (isFollowUp) {
                    errorMessage = 'Unable to schedule follow-up appointment. Please configure your availability schedule in Settings → Schedule, or contact support.';
                } else {
                    errorMessage = 'The selected doctor has not configured their availability schedule. Please ask the doctor to set up their working hours, or contact the administrator.';
                }
            }
            
            toast.error(errorMessage, { duration: 6000 });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Enhanced Step Indicator with Dynamic Labels
    const stepLabels = useMemo(() => {
        const labels = [
            { id: 1, label: 'Doctor', icon: Stethoscope },
            { id: 3, label: 'Date & Time', icon: CalendarIcon },
            { id: 4, label: 'Review', icon: FileText },
        ];

        // Only show Patient step if it's not pre-selected
        if (!initialPatientId && !initialPatient) {
            labels.splice(1, 0, { id: 2, label: 'Patient', icon: User });
        }

        return labels;
    }, [initialPatientId, initialPatient]);

    // Map the actual step ID to a sequence number (1, 2, 3...) for visual display
    const currentStepIndex = stepLabels.findIndex(s => s.id === currentStep) + 1;

    const renderStepIndicator = () => {
        const progressPercentage = ((currentStepIndex - 1) / (stepLabels.length - 1)) * 100;
        
        return (
            <div className="mb-8">
                {/* Progress Bar */}
                <div className="relative h-1.5 bg-slate-200 rounded-full mb-6 overflow-hidden">
                    <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>

                {/* Step Indicators */}
                <div className="flex items-start justify-between relative px-2 sm:px-0">
                    {stepLabels.map((step, index) => {
                        const Icon = step.icon;
                        const isActive = currentStep === step.id;
                        const isCompleted = currentStepIndex > index + 1;
                        const isUpcoming = currentStepIndex < index + 1;

                        return (
                            <div key={step.id} className="flex flex-col items-center flex-1 relative z-10 min-w-0">
                                {/* Step Circle */}
                                <div className={cn(
                                    "relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300 shadow-sm",
                                    isActive && "border-primary bg-primary text-primary-foreground scale-110 shadow-md",
                                    isCompleted && "border-primary bg-primary text-primary-foreground",
                                    isUpcoming && "border-slate-300 bg-white text-slate-400"
                                )}>
                                    {isCompleted ? (
                                        <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                                    ) : (
                                        <>
                                            <Icon className={cn(
                                                "h-4 w-4 sm:h-5 sm:w-5",
                                                isActive ? "text-primary-foreground" : "text-slate-400"
                                            )} />
                                            {isUpcoming && (
                                                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                                                    {index + 1}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Step Label */}
                                <div className="mt-2 sm:mt-3 text-center min-w-0 px-1">
                                    <p className={cn(
                                        "text-[10px] sm:text-xs font-semibold transition-colors truncate",
                                        isActive ? "text-primary" : isCompleted ? "text-slate-700" : "text-slate-400"
                                    )}>
                                        {step.label}
                                    </p>
                                    {isActive && (
                                        <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 hidden sm:block">Current</p>
                                    )}
                                </div>

                                {/* Connector Line - Hidden on mobile */}
                                {index < stepLabels.length - 1 && (
                                    <div className={cn(
                                        "hidden sm:block absolute top-5 sm:top-6 left-[60%] w-[80%] h-0.5 transition-colors duration-300",
                                        isCompleted ? "bg-primary" : "bg-slate-200"
                                    )} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-8 sm:pb-12 px-4 sm:px-0">

            {/* Follow-up context banner */}
            {isFollowUp && parentConsultationId && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-5 py-4 flex items-start gap-3">
                    <div className="mt-0.5 h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-amber-700" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-amber-900 text-sm">Follow-up Appointment</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                            Linked to consultation #{parentConsultationId}
                            {parentAppointmentId ? ` (appointment #${parentAppointmentId})` : ''}
                            . This appointment will be auto-confirmed — no additional confirmation step required.
                        </p>
                    </div>
                </div>
            )}

            {renderStepIndicator()}

            <Card className="border-none shadow-none bg-white">
                <CardHeader className="bg-white pb-4 px-6 sm:px-8 pt-6 sm:pt-8">
                    <div className="space-y-1">
                        <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            {currentStep === 1 && <><Stethoscope className="h-5 w-5 text-cyan-600" /> Select Doctor</>}
                            {currentStep === 2 && <><User className="h-5 w-5 text-cyan-600" /> Select Patient</>}
                            {currentStep === 3 && <><CalendarIcon className="h-5 w-5 text-cyan-600" /> Select Date & Time</>}
                            {currentStep === 4 && <><CheckCircle2 className="h-5 w-5 text-cyan-600" /> {isFollowUp ? "Review & Schedule" : "Review & Confirm"}</>}
                        </CardTitle>
                        <CardDescription className="text-slate-500 text-sm">
                            {currentStep === 1 && "Choose a medical professional for this visit"}
                            {currentStep === 2 && "Search for the patient record"}
                            {currentStep === 3 && "Pick a convenient time slot"}
                            {currentStep === 4 && "Verify appointment details before finalizing"}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 pt-2">
                    <div className="min-h-[400px]">

                    {/* STEP 1: DOCTOR */}
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            {lockDoctor && selectedDoctor ? (
                                <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 shadow-sm transition-all underline-offset-4 decoration-primary/30">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Pre-selected Medical Professional</span>
                                        </div>
                                        <CheckCircle className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-white flex items-center justify-center text-xl font-bold text-primary shadow-sm hover:scale-105 transition-transform">
                                            {selectedDoctor.name?.charAt(0) || selectedDoctor.firstName?.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-slate-900 leading-tight">
                                                {selectedDoctor.title} {selectedDoctor.name || `${selectedDoctor.firstName} ${selectedDoctor.lastName}`}
                                            </h4>
                                            <p className="text-sm text-slate-500 font-medium mt-1">{selectedDoctor.specialization || 'Clinical Specialist'}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : loadingDoctors ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                                    <p className="text-sm font-medium text-slate-400 animate-pulse">Retrieving doctor directory...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {doctors.map((doctor) => {
                                        const isSelected = formData.doctorId === doctor.id;
                                        const doctorName = doctor.name || `${doctor.firstName} ${doctor.lastName}`;
                                        const title = doctor.title;
                                        // Check if title already appears at start of name (case-insensitive)
                                        let displayName = doctorName;
                                        if (title && !doctorName.toLowerCase().startsWith(title.toLowerCase()) && !doctorName.toLowerCase().startsWith('dr.')) {
                                            displayName = `${title} ${doctorName}`;
                                        }
                                        
                                        return (
                                            <div 
                                                key={doctor.id}
                                                onClick={() => setFormData(prev => ({ ...prev, doctorId: doctor.id, appointmentDate: '', selectedSlot: null }))}
                                                className={cn(
                                                    "group relative p-5 rounded-2xl border transition-all cursor-pointer",
                                                    isSelected 
                                                        ? "border-cyan-500 bg-cyan-50/50 shadow-sm ring-1 ring-cyan-500/20" 
                                                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="relative shrink-0">
                                                        <ProfileImage
                                                            url={doctor.profileImage}
                                                            name={doctorName}
                                                            className={cn(
                                                                "h-14 w-14 rounded-full border-2 transition-transform group-hover:scale-105",
                                                                isSelected ? "border-cyan-200" : "border-white shadow-sm"
                                                            )}
                                                        />
                                                        {isSelected && (
                                                            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-cyan-600 border-2 border-white flex items-center justify-center text-white">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className={cn(
                                                            "font-bold text-[15px] truncate transition-colors",
                                                            isSelected ? "text-slate-900" : "text-slate-800 group-hover:text-cyan-600"
                                                        )}>
                                                            {displayName}
                                                        </h4>
                                                        <p className="text-xs text-slate-500 font-medium mt-0.5 truncate uppercase tracking-wider opacity-80">
                                                            {doctor.specialization || 'Medical Specialist'}
                                                        </p>
                                                        {doctor.clinicLocation && (
                                                            <div className="flex items-center mt-1 text-[11px] text-slate-400">
                                                                <MapPin className="h-3 w-3 mr-1" />
                                                                <span className="truncate">{doctor.clinicLocation}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="pt-6 flex justify-between border-t border-slate-100">
                                {onCancel ? (
                                    <Button 
                                        variant="outline"
                                        onClick={onCancel} 
                                        size="lg"
                                        className="border-slate-300 hover:bg-slate-50 text-slate-600"
                                    >
                                        Cancel
                                    </Button>
                                ) : (
                                    <div />
                                )}
                                <Button 
                                    onClick={handleNext} 
                                    disabled={!formData.doctorId}
                                    size="lg"
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg px-8 transition-all"
                                >
                                    Next Step <ChevronsRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: PATIENT */}
                    {currentStep === 2 && (
                        <div className="space-y-4">
                            <PatientCombobox
                                value={formData.patientId}
                                onSelect={(id, patient) => {
                                    setFormData(prev => ({ ...prev, patientId: id }));
                                    if (patient) setSelectedPatient(patient);
                                }}
                            />
                            {selectedPatient && (
                                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300">
                                    <div className="p-5">
                                        <div className="flex items-start gap-4">
                                            {/* Avatar */}
                                            <div className="relative shrink-0">
                                                <ProfileImage
                                                    url={selectedPatient.profileImage}
                                                    name={`${selectedPatient.firstName} ${selectedPatient.lastName}`}
                                                    bgColor={selectedPatient.colorCode}
                                                    className="h-14 w-14 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-100"
                                                />
                                                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-sm">
                                                    <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                                                </div>
                                            </div>

                                            {/* Patient Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="font-bold text-slate-900 text-[15px]">
                                                        {selectedPatient.firstName} {selectedPatient.lastName}
                                                    </h3>
                                                    {selectedPatient.fileNumber && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono font-bold tracking-tight">
                                                            {selectedPatient.fileNumber}
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3">
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <Clock className="h-3 w-3 text-slate-300" />
                                                        <span className="font-medium">
                                                            {selectedPatient.age} yrs · {selectedPatient.gender}
                                                        </span>
                                                    </div>
                                                    {selectedPatient.phone && (
                                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                                            <Clock className="h-3 w-3 text-slate-300" />
                                                            <span className="truncate font-medium">{selectedPatient.phone}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 px-5 py-2.5 border-t border-slate-100 flex items-center justify-between">
                                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Confirmed Selection</p>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-6 text-[10px] text-slate-400 hover:text-slate-600"
                                            onClick={() => {
                                                setFormData(prev => ({ ...prev, patientId: '' }));
                                                setSelectedPatient(null);
                                            }}
                                        >
                                            Change Patient
                                        </Button>
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-between pt-4">
                                <Button 
                                    variant="outline" 
                                    onClick={handleBack} 
                                    size="lg"
                                    className="border-slate-300 hover:bg-slate-50"
                                >
                                    Back
                                </Button>
                                <Button 
                                    onClick={handleNext} 
                                    disabled={!formData.patientId}
                                    size="lg"
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg px-8 transition-all"
                                >
                                    Next Step <ChevronsRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: DATE & TIME — Refined with Calendar and Slots */}
                    {currentStep === 3 && (
                        <Step3DateTimePicker
                            doctorId={formData.doctorId}
                            selectedDate={formData.appointmentDate}
                            selectedSlot={formData.selectedSlot}
                            onSelect={(date, slot) =>
                                setFormData(prev => ({ ...prev, appointmentDate: date, selectedSlot: slot }))
                            }
                            onBack={handleBack}
                            onNext={handleNext}
                        />
                    )}

                    {/* STEP 4: DETAILS & CONFIRM */}
                    {currentStep === 4 && (
                        <div className="space-y-6">
                            {/* Conflict Warnings */}
                            {sameDoctorConflict && (
                                <Alert className="border-amber-200 bg-amber-50">
                                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                                    <AlertTitle className="text-amber-900">Existing Appointment Found</AlertTitle>
                                    <AlertDescription className="text-amber-800">
                                        This patient already has an appointment with this doctor on{' '}
                                        <span className="font-semibold">
                                            {format(new Date(formData.appointmentDate), 'MMMM d, yyyy')} at {sameDoctorConflict.time}
                                        </span>.
                                        <br />
                                        <span className="mt-2 block text-sm">
                                            💡 <strong>Tip:</strong> Choose a different date or reschedule the existing appointment to avoid conflicts.
                                        </span>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {!sameDoctorConflict && differentDoctorAppointments.length > 0 && (
                                <Alert className="border-blue-200 bg-blue-50">
                                    <Info className="h-4 w-4" />
                                    <AlertTitle>Multiple Appointments on Same Day</AlertTitle>
                                    <AlertDescription>
                                        This patient has {differentDoctorAppointments.length} other appointment(s) on{' '}
                                        {format(new Date(formData.appointmentDate), 'MMMM d, yyyy')} with different doctor(s).{' '}
                                        This is allowed (patient may be seeing multiple specialists), but please ensure the patient can attend all appointments.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Appointment Type *</Label>
                                    <Select
                                        value={formData.type}
                                        onValueChange={(val) => setFormData(prev => ({ ...prev, type: val }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select appointment type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Initial Consultation">Initial Consultation</SelectItem>
                                            <SelectItem value="Follow-up">Follow-up</SelectItem>
                                            <SelectItem value="Routine Checkup">Routine Checkup</SelectItem>
                                            <SelectItem value="Procedure">Procedure</SelectItem>
                                            <SelectItem value="Emergency">Emergency</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Notes</Label>
                                    <Textarea
                                        placeholder="Any additional notes for the doctor..."
                                        rows={3}
                                        value={formData.note}
                                        onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-6 space-y-4">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider text-[10px]">
                                    <FileText className="h-3 w-3 text-cyan-600" /> Appointment Summary
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                                    <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                        <span className="text-xs text-slate-500 font-medium">Patient</span>
                                        <span className="text-xs font-bold text-slate-900">{selectedPatient?.firstName} {selectedPatient?.lastName}</span>
                                    </div>

                                    <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                        <span className="text-xs text-slate-500 font-medium">Doctor</span>
                                        <span className="text-xs font-bold text-slate-900">
                                            {(() => {
                                                const doctorName = selectedDoctor?.name || `${selectedDoctor?.firstName} ${selectedDoctor?.lastName}`;
                                                const title = selectedDoctor?.title;
                                                // Check if title already appears at start of name (case-insensitive)
                                                if (title && doctorName.toLowerCase().startsWith(title.toLowerCase())) {
                                                    return doctorName;
                                                }
                                                // Check for "Dr." prefix already in name
                                                if (doctorName.toLowerCase().startsWith('dr.')) {
                                                    return doctorName;
                                                }
                                                return title ? `${title} ${doctorName}` : `Dr. ${doctorName}`;
                                            })()}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                        <span className="text-xs text-slate-500 font-medium">Date</span>
                                        <span className="text-xs font-bold text-slate-900">
                                            {formData.appointmentDate && format(new Date(formData.appointmentDate), 'EEE, MMM d, yyyy')}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                        <span className="text-xs text-slate-500 font-medium">Time Slot</span>
                                        <span className="text-xs font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md">{formData.selectedSlot}</span>
                                    </div>

                                    <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                        <span className="text-xs text-slate-500 font-medium">Type</span>
                                        <span className="text-xs font-bold text-slate-900">{formData.type}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between pt-4 border-t border-slate-100">
                                <Button 
                                    variant="outline" 
                                    onClick={handleBack} 
                                    disabled={isSubmitting} 
                                    size="lg"
                                    className="border-slate-300 hover:bg-slate-50"
                                >
                                    Back
                                </Button>
                                <Button 
                                    onClick={handleSubmit} 
                                    disabled={!formData.type || isSubmitting} 
                                    size="lg"
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg px-8 transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {isFollowUp ? 'Scheduling…' : 'Booking…'}
                                        </>
                                    ) : (
                                        <>
                                            {isFollowUp ? 'Schedule Follow-up' : 'Confirm Booking'}
                                            <CheckCircle className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   Step3DateTimePicker — unified date chip + slot grid
   Auto-selects first available date and loads slots immediately.
   No two-phase interaction required.
═══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════
   Step3DateTimePicker — Refined Calendar + Slot Grid
═══════════════════════════════════════════════════════════════ */

interface Step3Props {
    doctorId: string;
    selectedDate: string;        // YYYY-MM-DD
    selectedSlot: string | null; // HH:mm
    onSelect: (date: string, slot: string | null) => void;
    onBack: () => void;
    onNext: () => void;
}

function Step3DateTimePicker({ doctorId, selectedDate, selectedSlot, onSelect, onBack, onNext }: Step3Props) {
    const [proposedDate, setProposedDate] = useState<Date | undefined>(
        selectedDate ? new Date(selectedDate) : startOfToday()
    );
    const [availableSlots, setAvailableSlots] = useState<any[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    // Load slots when date changes
    useEffect(() => {
        if (proposedDate && doctorId) {
            loadSlots(proposedDate);
        }
    }, [proposedDate, doctorId]);

    const loadSlots = async (date: Date) => {
        setLoadingSlots(true);
        try {
            const dateStr = format(date, 'yyyy-MM-dd');
            const res = await doctorApi.getAvailableSlots(doctorId, dateStr);
            if (res.success) {
                setAvailableSlots(res.data || []);
            }
        } catch (err) {
            console.error('Failed to load slots', err);
            toast.error('Failed to load available time slots');
        } finally {
            setLoadingSlots(false);
        }
    };

    const handleDateChange = (date: Date | undefined) => {
        if (!date) return;
        setProposedDate(date);
        onSelect(format(date, 'yyyy-MM-dd'), null);
    };

    const categorizedSlots = useMemo(() => {
        const morning: any[] = [];
        const afternoon: any[] = [];
        const evening: any[] = [];

        availableSlots.forEach(slot => {
            const timeStr = typeof slot === 'string' ? slot : slot.startTime;
            const hour = parseInt(timeStr.split(':')[0]);
            
            if (hour < 12) morning.push(slot);
            else if (hour < 17) afternoon.push(slot);
            else evening.push(slot);
        });

        return { morning, afternoon, evening };
    }, [availableSlots]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 items-start">
                {/* Calendar */}
                <div className="md:col-span-1 lg:col-span-5 space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <CalendarIcon className="h-4 w-4 text-cyan-600" />
                        <Label className="text-sm font-bold text-slate-700">
                            Select Date
                        </Label>
                    </div>
                    <div className="p-4 bg-slate-50/50 rounded-3xl border border-slate-100 shadow-sm flex justify-center">
                        <Calendar
                            mode="single"
                            selected={proposedDate}
                            onSelect={handleDateChange}
                            disabled={(date: Date) => date < startOfToday()}
                            className="bg-transparent"
                            classNames={{
                                day_selected: "bg-slate-900 text-white hover:bg-slate-800",
                                day_today: "bg-cyan-50 text-cyan-700 font-bold border border-cyan-100",
                            }}
                        />
                    </div>
                </div>

                {/* Slots */}
                <div className="md:col-span-1 lg:col-span-7 flex flex-col space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-cyan-600" />
                            <Label className="text-sm font-bold text-slate-700">
                                Available Times
                            </Label>
                        </div>
                        {proposedDate && (
                            <span className="text-xs font-bold text-cyan-700 bg-cyan-50 px-3 py-1 rounded-full border border-cyan-100 transition-all">
                                {format(proposedDate, 'MMMM d, yyyy')}
                            </span>
                        )}
                    </div>

                    <div className="flex-1 bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm min-h-[380px]">
                        {loadingSlots ? (
                            <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4">
                                <Loader2 className="h-10 w-10 animate-spin text-cyan-500/30" />
                                <p className="text-xs font-medium text-slate-400 animate-pulse tracking-wide">Scanning Provider Availability...</p>
                            </div>
                        ) : availableSlots.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-5 text-center px-4">
                                <div className="h-16 w-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                                    <CalendarIcon className="h-7 w-7 text-slate-300" />
                                </div>
                                <div className="max-w-[240px]">
                                    <h4 className="text-base font-bold text-slate-700">Fully Booked</h4>
                                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">The doctor has no available slots for this date. Please select a different day from the calendar.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8 max-h-[340px] overflow-y-auto pr-2 custom-scrollbar">
                                {categorizedSlots.morning.length > 0 && (
                                    <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                                            <Sun className="h-3.5 w-3.5 text-amber-500/80" /> Morning Sessions
                                        </p>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                            {categorizedSlots.morning.map(slot => (
                                                <SlotButton 
                                                    key={typeof slot === 'string' ? slot : slot.startTime} 
                                                    slot={slot} 
                                                    active={selectedSlot === (typeof slot === 'string' ? slot : slot.startTime)} 
                                                    onClick={(s) => onSelect(format(proposedDate!, 'yyyy-MM-dd'), s)} 
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {categorizedSlots.afternoon.length > 0 && (
                                    <div className="animate-in fade-in slide-in-from-top-1 duration-400">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                                            <Sunset className="h-3.5 w-3.5 text-orange-500/70" /> Afternoon Consultations
                                        </p>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                            {categorizedSlots.afternoon.map(slot => (
                                                <SlotButton 
                                                    key={typeof slot === 'string' ? slot : slot.startTime} 
                                                    slot={slot} 
                                                    active={selectedSlot === (typeof slot === 'string' ? slot : slot.startTime)} 
                                                    onClick={(s) => onSelect(format(proposedDate!, 'yyyy-MM-dd'), s)} 
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {categorizedSlots.evening.length > 0 && (
                                    <div className="animate-in fade-in slide-in-from-top-1 duration-500">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                                            <Moon className="h-3.5 w-3.5 text-indigo-400/80" /> Evening Visits
                                        </p>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                            {categorizedSlots.evening.map(slot => (
                                                <SlotButton 
                                                    key={typeof slot === 'string' ? slot : slot.startTime} 
                                                    slot={slot} 
                                                    active={selectedSlot === (typeof slot === 'string' ? slot : slot.startTime)} 
                                                    onClick={(s) => onSelect(format(proposedDate!, 'yyyy-MM-dd'), s)} 
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t border-slate-100">
                <Button 
                    variant="outline" 
                    onClick={onBack}
                    size="lg"
                    className="rounded-xl border-slate-200"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button 
                    onClick={onNext} 
                    disabled={!selectedDate || !selectedSlot}
                    size="lg"
                    className="rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-200"
                >
                    Continue <ChevronsRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

function SlotButton({ slot, active, onClick }: { slot: string | { startTime: string; isAvailable: boolean }, active: boolean, onClick: (s: string) => void }) {
    const time = typeof slot === 'string' ? slot : slot.startTime;
    const isAvailable = typeof slot === 'string' ? true : slot.isAvailable;

    return (
        <button
            type="button"
            onClick={() => onClick(time)}
            disabled={!isAvailable}
            className={cn(
                "h-10 rounded-2xl text-xs font-bold transition-all border shadow-sm",
                active 
                    ? "bg-slate-900 border-slate-900 text-white scale-[1.02] shadow-md ring-2 ring-slate-900/10" 
                    : isAvailable
                        ? "bg-white border-slate-200 text-slate-600 hover:border-cyan-500 hover:text-cyan-600 hover:bg-cyan-50/50 hover:shadow-md"
                        : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
            )}
        >
            {time}
        </button>
    );
}
