'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    ArrowLeft, CheckCircle, User,
    FileText, ChevronsRight, Sun, Sunset, Moon, Loader2, Calendar, Stethoscope
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
import type { AvailableSlotResponseDto } from '@/application/dtos/AvailableSlotResponseDto';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';
import { usePatientAppointments } from '@/hooks/appointments/useAppointments';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';
import { useDoctorAvailableDates, useDoctorAvailableSlots, getDefaultAvailabilityDateRange } from '@/hooks/schedule/useDoctorAvailability';

interface AppointmentBookingFormProps {
    mode?: 'full' | 'quick'; // NEW: Determines workflow behavior
    initialPatientId?: string;
    initialDoctorId?: string;
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
    initialDoctorId,
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

    // Steps: 1. Patient, 2. Doctor, 3. DateTime, 4. Details/Review
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form Data
    const [formData, setFormData] = useState<{
        patientId: string;
        doctorId: string;
        appointmentDate: string; // YYYY-MM-DD
        selectedSlot: string | null; // HH:mm
        type: string;
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
            note: '',
        };
    });

    const [selectedPatient, setSelectedPatient] = useState<PatientResponseDto | null>(null);
    const [selectedDoctor, setSelectedDoctor] = useState<DoctorResponseDto | null>(null);

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
        if (initialDoctorId) {
            loadSpecificDoctor(initialDoctorId);
        }
        loadDoctors();
    }, [initialDoctorId]);

    // Load patient if ID provided
    useEffect(() => {
        if (initialPatientId && !selectedPatient) {
            loadSpecificPatient(initialPatientId);
        }
    }, [initialPatientId]);

    // Update selected doctor when formData changes
    useEffect(() => {
        if (formData.doctorId && doctors.length > 0) {
            const found = doctors.find(d => d.id === formData.doctorId);
            if (found) setSelectedDoctor(found);
        }
    }, [formData.doctorId, doctors]);

    // Smart step navigation based on pre-filled data and mode
    useEffect(() => {
        if (currentStep !== 1) return; // Only run on initial load

        // Quick mode with locked doctor: skip doctor selection step
        if (mode === 'quick' && lockDoctor && initialDoctorId) {
            if (initialPatientId) {
                if (initialDate && initialTime) {
                    setCurrentStep(4); // Skip to review
                } else {
                    setCurrentStep(3); // Skip to date/time
                }
            } else {
                setCurrentStep(1); // Start at patient selection
            }
            return;
        }

        // Full mode: traditional navigation
        // If coming from a specific slot selection (doctor + date + time)
        if (initialDoctorId && initialDate && initialTime) {
            // Skip to patient selection, then to review
            if (initialPatientId) {
                setCurrentStep(4); // Skip to review
            } else {
                setCurrentStep(1); // Start at patient selection
            }
        }
        // If doctor is pre-selected but no specific slot
        else if (initialDoctorId) {
            if (initialPatientId) {
                setCurrentStep(3); // Skip to date/time selection
            } else {
                setCurrentStep(1); // Start at patient selection
            }
        }
        // If only patient is pre-selected
        else if (initialPatientId) {
            setCurrentStep(2); // Skip to doctor selection
        }
    }, [initialPatientId, initialDoctorId, initialDate, initialTime, mode, lockDoctor]);

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
            // In quick mode with locked doctor, skip step 2
            if (mode === 'quick' && lockDoctor && currentStep === 1) {
                setCurrentStep(3); // Skip doctor selection
            } else {
                setCurrentStep(prev => prev + 1);
            }
        }
    };

    const handleBack = () => {
        // In quick mode with locked doctor, skip step 2 when going back
        if (mode === 'quick' && lockDoctor && currentStep === 3) {
            setCurrentStep(1); // Skip doctor selection
        } else {
            setCurrentStep(prev => prev - 1);
        }
    };

    const canProceed = () => {
        switch (currentStep) {
            case 1: return !!formData.patientId;
            case 2: return !!formData.doctorId;
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
                toast.error(response.error || 'Failed to schedule appointment');
            }
        } catch (error) {
            console.error('Booking error', error);
            toast.error('An error occurred while booking');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Enhanced Step Indicator with Labels
    const stepLabels = [
        { number: 1, label: 'Patient', icon: User },
        { number: 2, label: 'Doctor', icon: Stethoscope },
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
                            {currentStep === 1 && "Select Patient"}
                            {currentStep === 2 && "Select Doctor"}
                            {currentStep === 3 && "Select Date & Time"}
                            {currentStep === 4 && (isFollowUp ? "Review & Schedule" : "Review & Confirm")}
                        </CardTitle>
                        <CardDescription className="text-slate-600 text-sm sm:text-base">
                            {currentStep === 1 && "Search and select the patient for this appointment"}
                            {currentStep === 2 && "Choose the doctor who will see this patient"}
                            {currentStep === 3 && "View available slots and select a date and time"}
                            {currentStep === 4 && (isFollowUp ? "Review all details and schedule the follow-up appointment" : "Review all details and confirm the booking")}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">

                    {/* STEP 1: PATIENT */}
                    {currentStep === 1 && (
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
                            <div className="pt-6 flex justify-end border-t border-slate-100">
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

                    {/* STEP 2: DOCTOR */}
                    {currentStep === 2 && (
                        <div className="space-y-4">
                            {lockDoctor && selectedDoctor ? (
                                <>
                                    <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <Label className="text-sm font-medium text-muted-foreground">Selected Doctor (Locked)</Label>
                                            <CheckCircle className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="flex gap-3 items-center">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                                                {selectedDoctor.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold">{selectedDoctor.name}</h4>
                                                <p className="text-sm text-muted-foreground">{selectedDoctor.specialization}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        This doctor was pre-selected. To change doctors, please start a new booking.
                                    </p>
                                </>
                            ) : loadingDoctors ? (
                                <div>Loading doctors...</div>
                            ) : (
                                <DoctorSelect
                                    doctors={doctors}
                                    value={formData.doctorId}
                                    onValueChange={(val) => setFormData(prev => ({ ...prev, doctorId: val, appointmentDate: '', selectedSlot: null }))}
                                />
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
                                    disabled={!formData.doctorId}
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
    const { startDate, endDate } = getDefaultAvailabilityDateRange();

    // Use shared hooks - will reuse cached data from AvailableDoctorsPanel if available
    const { 
        data: availableDates = [], 
        isLoading: loadingDates 
    } = useDoctorAvailableDates(doctorId, startDate, endDate);

    const { 
        data: slots = [], 
        isLoading: loadingSlots 
    } = useDoctorAvailableSlots(doctorId, selectedDate || '');

    // Auto-select first available date if none selected yet
    useEffect(() => {
        if (availableDates.length > 0 && !selectedDate && !loadingDates) {
            onSelect(availableDates[0], null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableDates, selectedDate, loadingDates]);

    const availableSlots = slots.filter(s => s.isAvailable);

    // Group slots by time of day
    const morning = availableSlots.filter(s => parseInt(s.startTime) < 12);
    const afternoon = availableSlots.filter(s => { const h = parseInt(s.startTime); return h >= 12 && h < 17; });
    const evening = availableSlots.filter(s => parseInt(s.startTime) >= 17);
    const sections = [
        { label: 'Morning', icon: Sun, slots: morning, color: 'text-amber-500' },
        { label: 'Afternoon', icon: Sunset, slots: afternoon, color: 'text-orange-500' },
        { label: 'Evening', icon: Moon, slots: evening, color: 'text-indigo-500' },
    ].filter(s => s.slots.length > 0);

    const dateLabelFor = (dateStr: string) => {
        const d = new Date(dateStr + 'T00:00:00');
        if (isToday(d)) return 'Today';
        if (isTomorrow(d)) return 'Tomorrow';
        return format(d, 'EEE, MMM d');
    };

    return (
        <div className="space-y-5">
            {/* ── Date chips ── */}
            {loadingDates ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading availability…
                </div>
            ) : availableDates.length === 0 ? (
                <div className="rounded-lg bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                    No available dates in the next 2 months for this doctor.
                </div>
            ) : (
                <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Date</Label>
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                        {availableDates.slice(0, 14).map(dateStr => {
                            const d = new Date(dateStr + 'T00:00:00');
                            const isSelected = selectedDate === dateStr;
                            const todayDate = isToday(d);
                            return (
                                <button
                                    key={dateStr}
                                    type="button"
                                    onClick={() => onSelect(dateStr, null)}
                                    className={cn(
                                        'shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 border min-w-[58px]',
                                        isSelected
                                            ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                            : todayDate
                                                ? 'bg-cyan-50 text-cyan-700 border-cyan-300 hover:border-cyan-400'
                                                : 'bg-background text-foreground border-border hover:border-primary/40 hover:bg-muted/40'
                                    )}
                                >
                                    <span className={cn('text-[10px] font-bold uppercase tracking-wider leading-none', isSelected ? 'opacity-70' : 'text-muted-foreground')}>
                                        {todayDate ? 'Today' : format(d, 'EEE')}
                                    </span>
                                    <span className="text-lg font-bold leading-none">{format(d, 'd')}</span>
                                    <span className={cn('text-[9px] leading-none', isSelected ? 'opacity-60' : 'text-muted-foreground')}>
                                        {format(d, 'MMM')}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Slot grid ── */}
            {selectedDate && (
                <div className="space-y-3">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Select Time — {dateLabelFor(selectedDate)}
                    </Label>
                    {loadingSlots ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading slots…
                        </div>
                    ) : sections.length > 0 ? (
                        <div className="space-y-4">
                            {sections.map(section => (
                                <div key={section.label}>
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <section.icon className={cn('h-3.5 w-3.5', section.color)} />
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                            {section.label}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground/50">({section.slots.length})</span>
                                    </div>
                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                                        {section.slots.map((slot, i) => {
                                            const isSelected = selectedSlot === slot.startTime;
                                            return (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => onSelect(selectedDate, slot.startTime)}
                                                    className={cn(
                                                        'py-2 px-1 rounded-lg text-xs font-semibold transition-all duration-150 border text-center',
                                                        isSelected
                                                            ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-[1.04]'
                                                            : 'bg-background text-foreground border-border hover:border-primary/40 hover:bg-muted/40'
                                                    )}
                                                >
                                                    {slot.startTime}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-lg bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                            No available slots on {dateLabelFor(selectedDate)}.
                        </div>
                    )}
                </div>
            )}

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
                    disabled={!selectedDate || !selectedSlot}
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg px-8 transition-all disabled:opacity-50"
                >
                    Next Step <ChevronsRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
