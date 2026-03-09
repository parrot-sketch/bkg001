'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    ArrowLeft, CheckCircle, User,
    FileText, ChevronsRight, Sun, Sunset, Moon, Loader2, Calendar, Stethoscope, Clock
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PatientCombobox } from '@/components/frontdesk/PatientCombobox';
import { DoctorSelect } from '@/components/patient/DoctorSelect';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { patientApi } from '@/lib/api/patient';
import { doctorApi } from '@/lib/api/doctor';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, addMonths, endOfMonth, isToday, isTomorrow, startOfDay, isAfter } from 'date-fns';
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
    const [currentStep, setCurrentStep] = useState(() => {
        const hasPatient = !!(initialPatientId || initialPatient);
        const hasDoctor = !!(initialDoctorId || initialDoctor);

        // Pre-selected both: go to DateTime
        if (hasPatient && hasDoctor) return 3;
        
        // Locked doctor and have doctor: skip to Step 2 (Patient)
        if (lockDoctor && hasDoctor) {
            return hasPatient ? 3 : 2;
        }

        // Default: Start at Step 1 (Doctor Selection)
        return 1;
    });
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

    // Enhanced Step Indicator with Labels
    const stepLabels = [
        { number: 1, label: 'Doctor', icon: Stethoscope },
        { number: 2, label: 'Patient', icon: User },
        { number: 3, label: 'Date & Time', icon: Calendar },
        { number: 4, label: 'Review', icon: FileText },
    ];

    const renderStepIndicator = () => {
        const progressPercentage = ((currentStep - 1) / 3) * 100;
        
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
                        const isActive = currentStep === step.number;
                        const isCompleted = currentStep > step.number;
                        const isUpcoming = currentStep < step.number;

                        return (
                            <div key={step.number} className="flex flex-col items-center flex-1 relative z-10 min-w-0">
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
                                                    {step.number}
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

            <Card className="border border-slate-200 shadow-lg overflow-hidden bg-white">
                <CardHeader className="border-b bg-gradient-to-br from-slate-50 via-white to-slate-50/50 pb-6 px-6 sm:px-8 pt-6 sm:pt-8">
                    <div className="space-y-1">
                        <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                            {currentStep === 1 && "Select Doctor"}
                            {currentStep === 2 && "Select Patient"}
                            {currentStep === 3 && "Select Date & Time"}
                            {currentStep === 4 && (isFollowUp ? "Review & Schedule" : "Review & Confirm")}
                        </CardTitle>
                        <CardDescription className="text-slate-600 text-sm sm:text-base">
                            {currentStep === 1 && "Select the doctor"}
                            {currentStep === 2 && "Search and select the patient"}
                            {currentStep === 3 && "Date & Time Selection"}
                            {currentStep === 4 && (isFollowUp ? "Review & Schedule" : "Final Review")}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">

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
                                        const displayName = doctor.title ? (doctorName.includes(doctor.title) ? doctorName : `${doctor.title} ${doctorName}`) : `Dr. ${doctorName}`;
                                        
                                        return (
                                            <div 
                                                key={doctor.id}
                                                onClick={() => setFormData(prev => ({ ...prev, doctorId: doctor.id, appointmentDate: '', selectedSlot: null }))}
                                                className={cn(
                                                    "group relative p-4 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-md",
                                                    isSelected 
                                                        ? "border-primary bg-primary/5 shadow-sm scale-[1.02] ring-4 ring-primary/5" 
                                                        : "border-slate-100 bg-white hover:border-slate-200"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "h-12 w-12 rounded-full flex items-center justify-center text-base font-bold transition-transform group-hover:scale-105 shadow-sm ring-2 ring-white",
                                                        isSelected ? "bg-primary text-white" : "bg-slate-100 text-slate-400"
                                                    )}>
                                                        {doctorName.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className={cn(
                                                            "font-bold text-sm truncate transition-colors",
                                                            isSelected ? "text-primary" : "text-slate-900 group-hover:text-primary"
                                                        )}>
                                                            {displayName}
                                                        </h4>
                                                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5 truncate uppercase tracking-wider opacity-70">
                                                            {doctor.specialization || 'Medical Specialist'}
                                                        </p>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="shrink-0 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center animate-in zoom-in duration-300">
                                                            <CheckCircle className="h-3 w-3" />
                                                        </div>
                                                    )}
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
                                <div className="relative overflow-hidden rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-white to-slate-50/50 shadow-md transition-all hover:shadow-lg">
                                    <div className="p-6">
                                        <div className="flex items-start gap-4">
                                            {/* Avatar */}
                                            <div className="relative shrink-0">
                                                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-md ring-2 ring-white">
                                                    <span className="text-lg font-bold text-white">
                                                        {selectedPatient.firstName?.[0]?.toUpperCase() || ''}
                                                        {selectedPatient.lastName?.[0]?.toUpperCase() || ''}
                                                    </span>
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                                                    <CheckCircle className="h-3 w-3 text-white" />
                                                </div>
                                            </div>

                                            {/* Patient Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-slate-900 text-base">
                                                        {selectedPatient.firstName} {selectedPatient.lastName}
                                                    </h3>
                                                    {selectedPatient.fileNumber && (
                                                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono font-medium">
                                                            {selectedPatient.fileNumber}
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                <div className="space-y-1.5 mt-2">
                                                    {selectedPatient.email && (
                                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                                            <span className="text-slate-400">Email:</span>
                                                            <span className="truncate font-medium">{selectedPatient.email}</span>
                                                        </div>
                                                    )}
                                                    {selectedPatient.phone && (
                                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                                            <span className="text-slate-400">Phone:</span>
                                                            <span className="font-medium">{selectedPatient.phone}</span>
                                                        </div>
                                                    )}
                                                    {selectedPatient.dateOfBirth && (
                                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                                            <span className="text-slate-400">Age:</span>
                                                            <span className="font-medium">
                                                                {selectedPatient.age} years
                                                                {selectedPatient.age && selectedPatient.age < 18 && (
                                                                    <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Minor</span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
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

                    {/* STEP 3: DATE & TIME — unified date chip + slot grid */}
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

                            <div className="rounded-lg bg-muted/30 p-4 space-y-3 text-sm">
                                <h4 className="font-semibold flex items-center gap-2">
                                    <FileText className="h-4 w-4" /> Summary
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <span className="text-muted-foreground">Patient:</span>
                                    <span className="font-medium text-right">{selectedPatient?.firstName} {selectedPatient?.lastName}</span>

                                    <span className="text-muted-foreground">Doctor:</span>
                                    <span className="font-medium text-right">{selectedDoctor?.name}</span>

                                    <span className="text-muted-foreground">Date:</span>
                                    <span className="font-medium text-right">
                                        {formData.appointmentDate && format(new Date(formData.appointmentDate), 'EEEE, MMMM d, yyyy')}
                                    </span>

                                    <span className="text-muted-foreground">Time:</span>
                                    <span className="font-medium text-right">{formData.selectedSlot}</span>

                                    <span className="text-muted-foreground">Type:</span>
                                    <span className="font-medium text-right">{formData.type}</span>

                                    {formData.reason && (
                                        <>
                                            <span className="text-muted-foreground">Reason:</span>
                                            <span className="font-medium text-right">{formData.reason}</span>
                                        </>
                                    )}
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

interface Step3Props {
    doctorId: string;
    selectedDate: string;        // YYYY-MM-DD
    selectedSlot: string | null; // HH:mm
    onSelect: (date: string, slot: string | null) => void;
    onBack: () => void;
    onNext: () => void;
}

function Step3DateTimePicker({ doctorId, selectedDate, selectedSlot, onSelect, onBack, onNext }: Step3Props) {
    const [proposedDate, setProposedDate] = useState(selectedDate || '');
    const [proposedTime, setProposedTime] = useState(selectedSlot || '');

    // Auto-set today's date if none selected
    useEffect(() => {
        if (!proposedDate) {
            const today = format(new Date(), 'yyyy-MM-dd');
            setProposedDate(today);
            onSelect(today, null);
        }
    }, [proposedDate, onSelect]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const date = e.target.value;
        setProposedDate(date);
        onSelect(date, proposedTime);
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = e.target.value;
        setProposedTime(time);
        onSelect(proposedDate, time);
    };

    const minDate = format(new Date(), 'yyyy-MM-dd'); // Today

    return (
        <div className="space-y-6">
            <div className="space-y-2 text-center sm:text-left">
                <Label className="text-lg font-bold text-slate-900 tracking-tight">
                    Select Date & Time
                </Label>
                <p className="text-sm text-slate-500 font-medium">
                    Choose your preferred slot. Clinical sessions are subject to doctor availability.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date Input */}
                <div className="space-y-2">
                    <Label htmlFor="appointment-date" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Date
                    </Label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            id="appointment-date"
                            type="date"
                            value={proposedDate}
                            onChange={handleDateChange}
                            min={minDate}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Time Input */}
                <div className="space-y-2">
                    <Label htmlFor="appointment-time" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Time
                    </Label>
                    <div className="relative">
                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            id="appointment-time"
                            type="time"
                            value={proposedTime}
                            onChange={handleTimeChange}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>
                </div>
            </div>

            {/* Info Alert */}
            <Alert className="bg-cyan-50 border-cyan-200">
                <Info className="h-4 w-4 text-cyan-600" />
                <AlertTitle className="text-cyan-800 text-sm font-semibold">How it works</AlertTitle>
                <AlertDescription className="text-cyan-700 text-xs mt-1">
                    The system will check if your proposed time is available. If it is, the slot will be automatically allocated. 
                    If not, the doctor will receive alternative time suggestions to choose from.
                </AlertDescription>
            </Alert>

            {/* ── Navigation ── */}
            <div className="flex justify-between pt-4 border-t border-slate-100">
                <Button 
                    variant="outline" 
                    onClick={onBack}
                    size="lg"
                    className="border-slate-300 hover:bg-slate-50"
                >
                    Back
                </Button>
                <Button 
                    onClick={onNext} 
                    disabled={!proposedDate || !proposedTime}
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg px-8 transition-all disabled:opacity-50"
                >
                    Next Step <ChevronsRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
