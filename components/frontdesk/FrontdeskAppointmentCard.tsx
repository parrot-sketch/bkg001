'use client';

/**
 * Frontdesk Appointment Card
 * 
 * High-density row-based layout for frontdesk sessions management.
 * Optimized for professional clinical environments with clear status indicators.
 */

import { useState } from 'react';
import { CheckCircle, Clock, MoreVertical, User, AlertTriangle, ExternalLink, XCircle, CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AppointmentStatus, canCheckIn } from '@/domain/enums/AppointmentStatus';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { cn } from '@/lib/utils';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface FrontdeskAppointmentCardProps {
    appointment: AppointmentResponseDto;
    onCheckIn: (appointment: AppointmentResponseDto) => void;
}

/**
 * Check if an appointment is overdue (past its scheduled time but not completed)
 */
function isAppointmentOverdue(appointment: AppointmentResponseDto): boolean {
    if (appointment.status === AppointmentStatus.COMPLETED || 
        appointment.status === AppointmentStatus.CANCELLED ||
        appointment.status === AppointmentStatus.NO_SHOW) {
        return false;
    }
    
    const now = new Date();
    const appointmentDate = new Date(appointment.appointmentDate);
    
    // Parse the time (HH:mm format)
    const [hours, minutes] = appointment.time.split(':').map(Number);
    appointmentDate.setHours(hours, minutes, 0, 0);
    
    // Add 1 hour buffer - consider overdue if more than 1 hour past appointment time
    const overdueThreshold = new Date(appointmentDate.getTime() + 60 * 60 * 1000);
    
    return now > overdueThreshold;
}

export function FrontdeskAppointmentCard({ appointment, onCheckIn }: FrontdeskAppointmentCardProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [showResolveDialog, setShowResolveDialog] = useState(false);
    const [resolveAction, setResolveAction] = useState<'complete' | 'cancel' | null>(null);
    const [isResolving, setIsResolving] = useState(false);
    
    const isOverdue = isAppointmentOverdue(appointment);
    const isStaleConsultation = appointment.status === AppointmentStatus.IN_CONSULTATION && isOverdue;

    interface StatusConfig {
        bar: string;
        text: string;
        bg: string;
        label: string;
    }

    // Color mapping based on clinical status - mapped to clinical logic
    const statusConfig: Record<AppointmentStatus, StatusConfig> = {
        [AppointmentStatus.PENDING]: {
            bar: 'bg-amber-400',
            text: 'text-amber-700',
            bg: 'bg-amber-50',
            label: 'Inquiry'
        },
        [AppointmentStatus.PENDING_DOCTOR_CONFIRMATION]: {
            bar: 'bg-indigo-400',
            text: 'text-indigo-700',
            bg: 'bg-indigo-50',
            label: 'Awaiting MD'
        },
        [AppointmentStatus.SCHEDULED]: {
            bar: 'bg-emerald-500',
            text: 'text-emerald-700',
            bg: 'bg-emerald-50',
            label: 'Scheduled'
        },
        [AppointmentStatus.CONFIRMED]: {
            bar: 'bg-emerald-600',
            text: 'text-emerald-800',
            bg: 'bg-emerald-100',
            label: 'Confirmed'
        },
        [AppointmentStatus.COMPLETED]: {
            bar: 'bg-blue-500',
            text: 'text-blue-700',
            bg: 'bg-blue-50',
            label: 'Completed'
        },
        [AppointmentStatus.CANCELLED]: {
            bar: 'bg-slate-300',
            text: 'text-slate-600',
            bg: 'bg-slate-50',
            label: 'Cancelled'
        },
        [AppointmentStatus.NO_SHOW]: {
            bar: 'bg-rose-500',
            text: 'text-rose-700',
            bg: 'bg-rose-50',
            label: 'No Show'
        },
        [AppointmentStatus.CHECKED_IN]: {
            bar: 'bg-sky-500',
            text: 'text-sky-700',
            bg: 'bg-sky-50',
            label: 'Checked In'
        },
        [AppointmentStatus.READY_FOR_CONSULTATION]: {
            bar: 'bg-teal-500',
            text: 'text-teal-700',
            bg: 'bg-teal-50',
            label: 'Ready'
        },
        [AppointmentStatus.IN_CONSULTATION]: {
            bar: 'bg-violet-500',
            text: 'text-violet-700',
            bg: 'bg-violet-50',
            label: 'In Consultation'
        }
    };

    const config = statusConfig[appointment.status as AppointmentStatus] || statusConfig[AppointmentStatus.PENDING];
    const patientName = appointment.patient
        ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
        : appointment.patientId || 'Unknown Patient';

    const handleResolve = async (action: 'complete' | 'cancel') => {
        setIsResolving(true);
        try {
            const response = await frontdeskApi.resolveStaleAppointment(appointment.id, action);
            if (response.success) {
                toast.success(action === 'complete' 
                    ? 'Consultation marked as completed' 
                    : 'Appointment cancelled');
                queryClient.invalidateQueries({ queryKey: ['appointments'] });
            } else {
                toast.error(response.error || 'Failed to resolve appointment');
            }
        } catch (error) {
            toast.error('An error occurred while resolving the appointment');
        } finally {
            setIsResolving(false);
            setShowResolveDialog(false);
            setResolveAction(null);
        }
    };

    const openResolveDialog = (action: 'complete' | 'cancel') => {
        setResolveAction(action);
        setShowResolveDialog(true);
    };

    return (
        <>
        <div className={cn(
            "group relative flex items-stretch bg-white border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 min-h-[80px]",
            isStaleConsultation ? "border-amber-300 bg-amber-50/30" : "border-slate-200"
        )}>
            {/* Visual Status Bar */}
            <div className={cn("w-1.5", isStaleConsultation ? "bg-amber-500" : config.bar)} />

            <div className="flex flex-1 flex-col sm:flex-row sm:items-center p-3 gap-3 sm:gap-6">
                {/* Time Slot Block */}
                <div className="flex flex-row sm:flex-col items-center sm:items-start gap-2 sm:gap-0 sm:min-w-[80px]">
                    <span className="text-lg font-bold text-slate-900 leading-tight">
                        {appointment.time}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 sm:mt-0.5">
                        Check-in Time
                    </span>
                </div>

                {/* Patient & Doctor Info */}
                <div className="flex-1 flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 flex-shrink-0">
                        {appointment.patient?.img ? (
                            <img
                                src={appointment.patient.img}
                                alt={patientName}
                                className="h-full w-full rounded-full object-cover"
                            />
                        ) : (
                            <User className="h-5 w-5 text-slate-400" />
                        )}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <h4 className="font-semibold text-slate-900 truncate">
                            {patientName}
                        </h4>
                        <div className="flex items-center text-xs text-slate-500 gap-1.5 mt-0.5">
                            <span className="truncate">{appointment.doctor?.name || 'Unassigned Doctor'}</span>
                            <span className="text-slate-300">•</span>
                            <span className="truncate">{appointment.type}</span>
                        </div>
                    </div>
                </div>

                {/* Status Badge & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                    {/* Mobile Label */}
                    <div className="sm:hidden">
                        <Badge variant="outline" className={cn("text-[10px] font-semibold py-0", config.text, config.bg, "border-0")}>
                            {config.label}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Show Check In button for appointments that can be checked in */}
                        {canCheckIn(appointment.status as AppointmentStatus) ? (
                            <Button
                                onClick={() => onCheckIn(appointment)}
                                size="sm"
                                className="h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm transition-all"
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Check In
                            </Button>
                        ) : appointment.status === AppointmentStatus.CHECKED_IN || 
                           appointment.status === AppointmentStatus.READY_FOR_CONSULTATION ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 hidden sm:flex">
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-xs font-semibold whitespace-nowrap">
                                    {appointment.status === AppointmentStatus.READY_FOR_CONSULTATION 
                                        ? 'Ready for Doctor' 
                                        : 'Checked In'}
                                </span>
                            </div>
                        ) : appointment.status === AppointmentStatus.IN_CONSULTATION ? (
                            isStaleConsultation ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span className="text-xs font-semibold whitespace-nowrap">Overdue</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 border border-violet-100 hidden sm:flex">
                                    <Clock className="h-4 w-4 animate-pulse" />
                                    <span className="text-xs font-semibold whitespace-nowrap">In Consultation</span>
                                </div>
                            )
                        ) : null}

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => router.push(`/frontdesk/appointments/${appointment.id}`)}>
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View Details
                                </DropdownMenuItem>
                                
                                {isStaleConsultation && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                            onClick={() => openResolveDialog('complete')}
                                            className="text-emerald-600 focus:text-emerald-600"
                                        >
                                            <CheckCheck className="h-4 w-4 mr-2" />
                                            Mark as Completed
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                            onClick={() => openResolveDialog('cancel')}
                                            className="text-red-600 focus:text-red-600"
                                        >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Cancel Appointment
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </div>

        {/* Resolve Confirmation Dialog */}
        <AlertDialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {resolveAction === 'complete' ? 'Mark Consultation as Completed?' : 'Cancel Appointment?'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {resolveAction === 'complete' 
                            ? `This will mark ${patientName}'s consultation as completed. Use this if the doctor completed the consultation but the system didn't update properly.`
                            : `This will cancel ${patientName}'s appointment. Use this if the appointment can no longer proceed.`}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isResolving}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => resolveAction && handleResolve(resolveAction)}
                        disabled={isResolving}
                        className={resolveAction === 'complete' 
                            ? 'bg-emerald-600 hover:bg-emerald-700' 
                            : 'bg-red-600 hover:bg-red-700'}
                    >
                        {isResolving ? 'Processing...' : resolveAction === 'complete' ? 'Mark Completed' : 'Cancel Appointment'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
}
