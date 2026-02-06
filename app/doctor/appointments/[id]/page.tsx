'use client';

/**
 * Doctor Appointment Detail Page
 * 
 * Context-aware UI that adapts based on:
 * - Appointment status (SCHEDULED, CHECKED_IN, IN_CONSULTATION, etc.)
 * - Time (past/present/future, overdue detection)
 * 
 * Features:
 * - Status-based actions
 * - Patient information
 * - Time-aware status display (overdue consultations)
 * - Direct access to consultation workspace
 */

import { use, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Calendar,
    Clock,
    User,
    Mail,
    Phone,
    CheckCircle,
    XCircle,
    CalendarClock,
    Stethoscope,
    UserX,
    FileText,
    ArrowLeft,
    Loader2,
    AlertCircle,
    AlertTriangle,
    Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAppointment, useAppointments } from '@/hooks/useAppointments';
import { format, formatDistanceToNow, isPast, isFuture, isToday } from 'date-fns';
import { toast } from 'sonner';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { ConfirmAppointmentDialog } from '@/components/appointments/ConfirmAppointmentDialog';
import { RescheduleDialog } from '@/components/appointments/RescheduleDialog';
import { CancelAppointmentDialog } from '@/components/appointments/CancelAppointmentDialog';
import { cn } from '@/lib/utils';
import { doctorApi } from '@/lib/api/doctor';
import { useAuth } from '@/hooks/patient/useAuth';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function AppointmentDetailPage({ params }: PageProps) {
    const resolvedParams = use(params);
    const appointmentId = parseInt(resolvedParams.id);
    const router = useRouter();
    const { user } = useAuth();

    const { appointment, isLoading, error, refetch } = useAppointment(appointmentId);
    const { isConfirming, isRescheduling, isCancelling } = useAppointments();

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [isStartingConsultation, setIsStartingConsultation] = useState(false);

    // Track recent actions for success feedback
    const [recentAction, setRecentAction] = useState<{
        type: 'confirmed' | 'rescheduled' | 'cancelled' | null;
        timestamp: number;
    }>({ type: null, timestamp: 0 });

    // Clear recent action after 5 seconds
    useEffect(() => {
        if (recentAction.type) {
            const timer = setTimeout(() => {
                setRecentAction({ type: null, timestamp: 0 });
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [recentAction.type]);

    // Time-aware status calculation
    const timeStatus = useMemo(() => {
        if (!appointment) return { isAppointmentToday: false, isOverdue: false, isPastDate: false };
        
        const now = new Date();
        const appointmentDate = new Date(appointment.appointmentDate);
        const isAppointmentToday = isToday(appointmentDate);
        
        let slotEndTime: Date | null = null;
        if (appointment.time && isAppointmentToday) {
            const [hours, minutes] = appointment.time.split(':').map(Number);
            slotEndTime = new Date(appointmentDate);
            slotEndTime.setHours(hours, minutes + 30, 0, 0);
        }
        
        const isOverdue = slotEndTime ? now > slotEndTime : false;
        const isPastDate = !isAppointmentToday && isPast(appointmentDate);
        
        return { isAppointmentToday, isOverdue, isPastDate, slotEndTime };
    }, [appointment?.appointmentDate, appointment?.time]);

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-center space-y-3">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">Loading appointment details...</p>
                </div>
            </div>
        );
    }

    if (error || !appointment) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="text-center space-y-3">
                            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                                <AlertCircle className="h-8 w-8 text-destructive" />
                            </div>
                            <h3 className="text-lg font-semibold">Appointment Not Found</h3>
                            <p className="text-sm text-muted-foreground">
                                The appointment you're looking for doesn't exist or you don't have permission to view it.
                            </p>
                            <Button onClick={() => router.back()} className="mt-4">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Go Back
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Safely parse appointment date
    const appointmentDate = appointment.appointmentDate ? new Date(appointment.appointmentDate) : new Date();
    const isValidAppointmentDate = !isNaN(appointmentDate.getTime());

    // Get status badge with colors
    const getStatusBadge = (status: string) => {
        const variants: Record<string, { className: string; label?: string }> = {
            'PENDING': { className: 'border-amber-500 text-amber-700 bg-amber-50' },
            'PENDING_DOCTOR_CONFIRMATION': { className: 'border-orange-500 text-orange-700 bg-orange-50', label: 'Awaiting Confirmation' },
            'SCHEDULED': { className: 'border-slate-500 text-slate-700 bg-slate-50' },
            'CONFIRMED': { className: 'bg-blue-600 text-white border-blue-600' },
            'CHECKED_IN': { className: 'bg-emerald-600 text-white border-emerald-600', label: 'Ready' },
            'READY_FOR_CONSULTATION': { className: 'bg-emerald-600 text-white border-emerald-600', label: 'Ready' },
            'IN_CONSULTATION': { className: 'bg-violet-600 text-white border-violet-600', label: 'In Progress' },
            'COMPLETED': { className: 'bg-gray-600 text-white border-gray-600' },
            'CANCELLED': { className: 'bg-red-600 text-white border-red-600' },
            'NO_SHOW': { className: 'border-red-500 text-red-700 bg-red-50', label: 'No Show' },
        };

        const config = variants[status] || { className: 'border-slate-300 text-slate-600 bg-slate-50' };
        const label = config.label || status.replace(/_/g, ' ');

        // Show overdue indicator for IN_CONSULTATION
        if (status === AppointmentStatus.IN_CONSULTATION && timeStatus.isOverdue) {
            return (
                <div className="flex items-center gap-2">
                    <Badge className="bg-amber-500 text-white border-amber-500">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Overdue
                    </Badge>
                    <Badge variant="outline" className={config.className}>
                        {label}
                    </Badge>
                </div>
            );
        }

        return (
            <Badge variant="outline" className={config.className}>
                {label}
            </Badge>
        );
    };

    // Determine available actions based on status
    const canConfirm = appointment.status === AppointmentStatus.PENDING || 
                       appointment.status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION;
    const canReschedule = [AppointmentStatus.PENDING, AppointmentStatus.PENDING_DOCTOR_CONFIRMATION, 
                          AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED].includes(appointment.status as AppointmentStatus);
    const canCancel = [AppointmentStatus.PENDING, AppointmentStatus.PENDING_DOCTOR_CONFIRMATION, 
                      AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED].includes(appointment.status as AppointmentStatus);
    
    // Can start consultation: patient is checked in
    const canStartConsultation = appointment.status === AppointmentStatus.CHECKED_IN || 
                                 appointment.status === AppointmentStatus.READY_FOR_CONSULTATION;
    
    // Can continue consultation: already in progress
    const canContinueConsultation = appointment.status === AppointmentStatus.IN_CONSULTATION;
    
    const canMarkNoShow = (appointment.status === AppointmentStatus.SCHEDULED || 
                          appointment.status === AppointmentStatus.CONFIRMED) && timeStatus.isPastDate;

    // Handle starting consultation
    const handleStartConsultation = async () => {
        if (!user) return;
        
        setIsStartingConsultation(true);
        try {
            const response = await doctorApi.startConsultation({
                appointmentId: appointment.id,
                doctorId: user.id,
                userId: user.id
            });

            if (response.success) {
                toast.success('Consultation started');
                router.push(`/doctor/consultations/${appointment.id}/session`);
            } else {
                toast.error(response.error || 'Failed to start consultation');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to start consultation');
        } finally {
            setIsStartingConsultation(false);
        }
    };

    // Handle going to consultation workspace
    const handleGoToConsultation = () => {
        router.push(`/doctor/consultations/${appointment.id}/session`);
    };

    return (
        <div className="container max-w-5xl py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Appointment #{appointment.id}</h1>
                        <p className="text-sm text-muted-foreground">
                            Created {appointment.createdAt && !isNaN(new Date(appointment.createdAt).getTime())
                                ? formatDistanceToNow(new Date(appointment.createdAt), { addSuffix: true })
                                : 'recently'
                            }
                        </p>
                    </div>
                </div>
                {getStatusBadge(appointment.status)}
            </div>

            {/* Overdue Warning for IN_CONSULTATION */}
            {canContinueConsultation && timeStatus.isOverdue && (
                <Alert className="bg-amber-50 border-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">Consultation Running Overtime</AlertTitle>
                    <AlertDescription className="text-amber-700">
                        The scheduled slot has ended. Please complete this consultation or continue as needed.
                    </AlertDescription>
                </Alert>
            )}

            {/* Loading Overlay */}
            {(isConfirming || isRescheduling || isCancelling || isStartingConsultation) && (
                <Alert className="bg-blue-50 border-blue-200">
                    <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                    <AlertTitle>Processing...</AlertTitle>
                    <AlertDescription>
                        {isConfirming && 'Confirming appointment...'}
                        {isRescheduling && 'Rescheduling appointment...'}
                        {isCancelling && 'Cancelling appointment...'}
                        {isStartingConsultation && 'Starting consultation...'}
                    </AlertDescription>
                </Alert>
            )}

            {/* Success Banners */}
            {recentAction.type === 'confirmed' && (
                <Alert className="bg-green-50 border-green-200 animate-in slide-in-from-top">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle>Appointment Confirmed!</AlertTitle>
                    <AlertDescription>
                        The patient has been notified and the appointment is now in your schedule.
                    </AlertDescription>
                </Alert>
            )}

            {recentAction.type === 'rescheduled' && (
                <Alert className="bg-blue-50 border-blue-200 animate-in slide-in-from-top">
                    <CalendarClock className="h-4 w-4 text-blue-600" />
                    <AlertTitle>Appointment Rescheduled!</AlertTitle>
                    <AlertDescription>
                        The patient and frontdesk have been notified of the new appointment time.
                    </AlertDescription>
                </Alert>
            )}

            {recentAction.type === 'cancelled' && (
                <Alert className="bg-red-50 border-red-200 animate-in slide-in-from-top">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <AlertTitle>Appointment Cancelled</AlertTitle>
                    <AlertDescription>
                        The patient and frontdesk have been notified of the cancellation.
                    </AlertDescription>
                </Alert>
            )}

            {/* Primary Actions - Consultation Controls */}
            {(canStartConsultation || canContinueConsultation) && (
                <Card className="border-2 border-emerald-200 bg-emerald-50/30">
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "h-12 w-12 rounded-xl flex items-center justify-center",
                                    canContinueConsultation 
                                        ? (timeStatus.isOverdue ? "bg-amber-100" : "bg-violet-100")
                                        : "bg-emerald-100"
                                )}>
                                    <Stethoscope className={cn(
                                        "h-6 w-6",
                                        canContinueConsultation 
                                            ? (timeStatus.isOverdue ? "text-amber-600" : "text-violet-600")
                                            : "text-emerald-600"
                                    )} />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">
                                        {canContinueConsultation 
                                            ? (timeStatus.isOverdue ? 'Consultation Overdue' : 'Consultation In Progress')
                                            : 'Patient Ready'
                                        }
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        {canContinueConsultation 
                                            ? 'Continue your session in the consultation workspace'
                                            : 'Patient is checked in and waiting'
                                        }
                                    </p>
                                </div>
                            </div>
                            
                            {canContinueConsultation ? (
                                <Button
                                    onClick={handleGoToConsultation}
                                    size="lg"
                                    className={cn(
                                        "font-bold shadow-lg",
                                        timeStatus.isOverdue 
                                            ? "bg-amber-600 hover:bg-amber-700 shadow-amber-200"
                                            : "bg-violet-600 hover:bg-violet-700 shadow-violet-200"
                                    )}
                                >
                                    <Play className="mr-2 h-5 w-5" />
                                    Continue Consultation
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleStartConsultation}
                                    disabled={isStartingConsultation}
                                    size="lg"
                                    className="bg-emerald-600 hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-200"
                                >
                                    {isStartingConsultation ? (
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    ) : (
                                        <Stethoscope className="mr-2 h-5 w-5" />
                                    )}
                                    Start Consultation
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Secondary Actions */}
            {(canConfirm || canReschedule || canCancel || canMarkNoShow) && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Actions</CardTitle>
                        <CardDescription>Manage this appointment</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {canConfirm && (
                                <Button
                                    onClick={() => setShowConfirmDialog(true)}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Confirm Appointment
                                </Button>
                            )}

                            {canReschedule && (
                                <Button
                                    onClick={() => setShowRescheduleDialog(true)}
                                    variant="outline"
                                >
                                    <CalendarClock className="mr-2 h-4 w-4" />
                                    Reschedule
                                </Button>
                            )}

                            {canMarkNoShow && (
                                <Button
                                    onClick={() => {/* Handle no-show */ }}
                                    variant="outline"
                                >
                                    <UserX className="mr-2 h-4 w-4" />
                                    Mark No-Show
                                </Button>
                            )}

                            {canCancel && (
                                <Button
                                    onClick={() => setShowCancelDialog(true)}
                                    variant="destructive"
                                >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2">
                {/* Patient Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            Patient Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-2xl font-semibold">
                                {appointment.patient
                                    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
                                    : 'Unknown Patient'
                                }
                            </p>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            {appointment.patient?.email && (
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span>{appointment.patient.email}</span>
                                </div>
                            )}

                            {appointment.patient?.phone && (
                                <div className="flex items-center gap-3 text-sm">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{appointment.patient.phone}</span>
                                </div>
                            )}

                            {appointment.patient?.dateOfBirth && (
                                <div className="flex items-center gap-3 text-sm">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span>
                                        {new Date().getFullYear() - new Date(appointment.patient.dateOfBirth).getFullYear()} years old
                                    </span>
                                </div>
                            )}
                        </div>

                        <Button 
                            variant="outline" 
                            className="w-full mt-4"
                            onClick={() => router.push(`/doctor/patients/${appointment.patientId}`)}
                        >
                            View Full Patient Record
                        </Button>
                    </CardContent>
                </Card>

                {/* Appointment Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            Appointment Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium">Date</p>
                                    <p className="text-sm text-muted-foreground">
                                        {isValidAppointmentDate
                                            ? format(appointmentDate, 'EEEE, MMMM d, yyyy')
                                            : 'Date not available'
                                        }
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium">Time</p>
                                    <p className="text-sm text-muted-foreground">
                                        {appointment.time || 'Time not specified'}
                                    </p>
                                </div>
                            </div>

                            {appointment.type && (
                                <div className="flex items-start gap-3">
                                    <Stethoscope className="h-4 w-4 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium">Type</p>
                                        <p className="text-sm text-muted-foreground">{appointment.type}</p>
                                    </div>
                                </div>
                            )}

                            {appointment.note && (
                                <div className="flex items-start gap-3">
                                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium">Notes</p>
                                        <p className="text-sm text-muted-foreground">{appointment.note}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Timeline */}
            <Card>
                <CardHeader>
                    <CardTitle>Activity Timeline</CardTitle>
                    <CardDescription>History of this appointment</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="h-2 w-2 rounded-full bg-primary" />
                                <div className="w-px flex-1 bg-border" />
                            </div>
                            <div className="flex-1 pb-4">
                                <p className="text-sm font-medium">Appointment created</p>
                                <p className="text-xs text-muted-foreground">
                                    {appointment.createdAt && !isNaN(new Date(appointment.createdAt).getTime())
                                        ? formatDistanceToNow(new Date(appointment.createdAt), { addSuffix: true })
                                        : 'recently'
                                    }
                                </p>
                            </div>
                        </div>

                        {appointment.status !== AppointmentStatus.PENDING && (
                            <div className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                    {appointment.status !== AppointmentStatus.CANCELLED && 
                                     appointment.status !== AppointmentStatus.COMPLETED && (
                                        <div className="w-px flex-1 bg-border" />
                                    )}
                                </div>
                                <div className="flex-1 pb-4">
                                    <p className="text-sm font-medium">
                                        Status: {appointment.status.replace(/_/g, ' ')}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {appointment.updatedAt && !isNaN(new Date(appointment.updatedAt).getTime())
                                            ? formatDistanceToNow(new Date(appointment.updatedAt), { addSuffix: true })
                                            : 'recently'
                                        }
                                    </p>
                                </div>
                            </div>
                        )}

                        {appointment.status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION && (
                            <div className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-amber-700">Awaiting your confirmation</p>
                                    <p className="text-xs text-muted-foreground">Please confirm or reschedule</p>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Dialogs */}
            <ConfirmAppointmentDialog
                open={showConfirmDialog}
                onOpenChange={setShowConfirmDialog}
                appointmentId={appointment.id}
                onSuccess={() => {
                    setRecentAction({ type: 'confirmed', timestamp: Date.now() });
                    refetch();
                }}
            />

            <RescheduleDialog
                open={showRescheduleDialog}
                onOpenChange={setShowRescheduleDialog}
                appointment={appointment}
                onSuccess={() => {
                    setRecentAction({ type: 'rescheduled', timestamp: Date.now() });
                    refetch();
                }}
            />

            <CancelAppointmentDialog
                open={showCancelDialog}
                onOpenChange={setShowCancelDialog}
                appointmentId={appointment.id}
                onSuccess={() => {
                    setRecentAction({ type: 'cancelled', timestamp: Date.now() });
                    refetch();
                }}
            />
        </div>
    );
}
