'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    ArrowLeft, CheckCircle, User,
    FileText, ChevronsRight
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PatientCombobox } from '@/components/frontdesk/PatientCombobox';
import { DoctorSelect } from '@/components/patient/DoctorSelect';
import { useAvailableSlots } from '@/hooks/useAvailableSlots';
import { useDoctorAvailableDates } from '@/hooks/useDoctorAvailableDates';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { patientApi } from '@/lib/api/patient';
import { doctorApi } from '@/lib/api/doctor';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

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
    source?: string;
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
    parentAppointmentId,
    parentConsultationId,
    onSuccess,
    onCancel
}: AppointmentBookingFormProps) {
    const router = useRouter();

    const isFollowUp = source === 'DOCTOR_FOLLOW_UP' || initialType === 'Follow-up';

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
    const { data: availableDates = [], isLoading: loadingAvailableDates } = useDoctorAvailableDates({
        doctorId: formData.doctorId || null,
        startDate: today,
        endDate: dateRangeEnd,
        enabled: !!formData.doctorId && currentStep === 3,
    });
    const availableDatesSet = new Set(availableDates);

    // Load slots
    const selectedDateObj = formData.appointmentDate ? new Date(formData.appointmentDate) : null;
    const { slots, loading: loadingSlots, error: slotsError, refetch: refetchSlots } = useAvailableSlots({
        doctorId: formData.doctorId || null,
        date: selectedDateObj,
        enabled: !!formData.doctorId && !!formData.appointmentDate && currentStep === 3,
    });

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
                ...(source ? { source } : {}),
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
                if (response.error?.includes('booked')) {
                    refetchSlots();
                }
            }
        } catch (error) {
            console.error('Booking error', error);
            toast.error('An error occurred while booking');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render Steps
    const renderStepIndicator = () => (
        <div className="flex items-center justify-center mb-8">
            {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                    <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all",
                        currentStep === step ? "border-primary bg-primary text-primary-foreground" :
                            currentStep > step ? "border-primary bg-primary text-primary-foreground" :
                                "border-muted-foreground/30 text-muted-foreground"
                    )}>
                        {currentStep > step ? <CheckCircle className="h-5 w-5" /> : step}
                    </div>
                    {step < 4 && (
                        <div className={cn(
                            "w-12 h-0.5 mx-2",
                            currentStep > step ? "bg-primary" : "bg-muted-foreground/30"
                        )} />
                    )}
                </div>
            ))}
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-12">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={onCancel || (() => router.back())}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {isFollowUp ? 'Schedule Follow-up' : 'Book Appointment'}
                    </h1>
                    <p className="text-muted-foreground">
                        {isFollowUp
                            ? 'Select a date and time for the patient\'s follow-up visit'
                            : 'Schedule a new appointment'
                        }
                    </p>
                </div>
            </div>

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

            <Card className="border-2 shadow-sm">
                <CardHeader>
                    <CardTitle>
                        {currentStep === 1 && "Select Patient"}
                        {currentStep === 2 && "Select Doctor"}
                        {currentStep === 3 && "Select Date & Time"}
                        {currentStep === 4 && (isFollowUp ? "Review & Schedule" : "Review & Confirm")}
                    </CardTitle>
                    <CardDescription>
                        {currentStep === 1 && "Search for the patient."}
                        {currentStep === 2 && "Choose a doctor."}
                        {currentStep === 3 && "View availability and select a time slot."}
                        {currentStep === 4 && (isFollowUp ? "Review and schedule the follow-up." : "Confirm booking details.")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

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
                                <div className="rounded-lg border bg-muted/20 p-4 flex gap-4 items-start">
                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <User className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{selectedPatient.firstName} {selectedPatient.lastName}</h3>
                                        <p className="text-sm text-muted-foreground">{selectedPatient.email}</p>
                                        <div className="mt-2 flex gap-2">
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                                                ID: {selectedPatient.id}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="pt-4 flex justify-between">
                                <div></div>
                                <Button onClick={handleNext} disabled={!formData.patientId}>
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
                                <Button variant="outline" onClick={handleBack}>Back</Button>
                                <Button onClick={handleNext} disabled={!formData.doctorId}>
                                    Next Step <ChevronsRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: DATE & TIME */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Date Selection */}
                                <div className="space-y-3">
                                    <Label>Select Date *</Label>
                                    <Input
                                        type="date"
                                        min={today.toISOString().split('T')[0]}
                                        max={dateRangeEnd.toISOString().split('T')[0]}
                                        value={formData.appointmentDate}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (availableDatesSet.has(val) || !formData.appointmentDate) {
                                                setFormData(prev => ({ ...prev, appointmentDate: val, selectedSlot: null }));
                                            } else {
                                                toast.error('No slots available on this date');
                                            }
                                        }}
                                        className={cn(
                                            formData.appointmentDate && !availableDatesSet.has(formData.appointmentDate) && "border-destructive focus-visible:ring-destructive"
                                        )}
                                    />
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {availableDates.slice(0, 5).map(dateStr => (
                                            <Button
                                                key={dateStr}
                                                variant={formData.appointmentDate === dateStr ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setFormData(prev => ({ ...prev, appointmentDate: dateStr, selectedSlot: null }))}
                                                className="text-xs"
                                            >
                                                {format(new Date(dateStr), 'MMM d')}
                                            </Button>
                                        ))}
                                    </div>
                                    {loadingAvailableDates && <p className="text-xs text-muted-foreground animate-pulse">Loading availability...</p>}
                                </div>

                                {/* Slot Selection */}
                                <div className="space-y-3">
                                    <Label>Select Time *</Label>
                                    {loadingSlots ? (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                                            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                                            Loading slots...
                                        </div>
                                    ) : slots.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-2 max-h-[240px] overflow-y-auto pr-2">
                                            {slots.filter(s => s.isAvailable).map((slot, i) => (
                                                <Button
                                                    key={i}
                                                    variant={formData.selectedSlot === slot.startTime ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => setFormData(prev => ({ ...prev, selectedSlot: slot.startTime }))}
                                                    className="w-full text-xs"
                                                >
                                                    {slot.startTime}
                                                </Button>
                                            ))}
                                        </div>
                                    ) : formData.appointmentDate ? (
                                        <div className="text-sm text-muted-foreground py-4 bg-muted/30 rounded-lg text-center">
                                            No available slots on this date.
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground py-4">
                                            Please select a date first.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-between pt-4">
                                <Button variant="outline" onClick={handleBack}>Back</Button>
                                <Button onClick={handleNext} disabled={!formData.appointmentDate || !formData.selectedSlot}>
                                    Next Step <ChevronsRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: DETAILS & CONFIRM */}
                    {currentStep === 4 && (
                        <div className="space-y-6">
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

                            <div className="flex justify-between pt-4">
                                <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>Back</Button>
                                <Button onClick={handleSubmit} disabled={!formData.type || isSubmitting} className="bg-teal-600 hover:bg-teal-700">
                                    {isSubmitting
                                        ? (isFollowUp ? 'Scheduling…' : 'Booking…')
                                        : (isFollowUp ? 'Schedule Follow-up' : 'Confirm Booking')
                                    }
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
