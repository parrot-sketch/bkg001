"use client";

import { usePatientAppointments } from "@/hooks/appointments/useAppointments";
import { useAuth } from "@/hooks/patient/useAuth";
import { format } from "date-fns";
import { Calendar, Clock, CheckCircle, AlertCircle, Stethoscope, ArrowRight, Plus, Loader2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AppointmentResponseDto } from "@/application/dtos/AppointmentResponseDto";

interface PatientAppointmentsPanelProps {
    patientId: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
    PENDING: { label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200", icon: AlertCircle },
    PENDING_DOCTOR_CONFIRMATION: { label: "Awaiting Doctor", color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: Clock },
    SCHEDULED: { label: "Scheduled", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: Calendar },
    CONFIRMED: { label: "Confirmed", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle },
    CHECKED_IN: { label: "Checked In", color: "bg-sky-50 text-sky-700 border-sky-200", icon: CheckCircle },
    IN_CONSULTATION: { label: "In Consultation", color: "bg-violet-50 text-violet-700 border-violet-200", icon: Stethoscope },
    COMPLETED: { label: "Completed", color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle },
    CANCELLED: { label: "Cancelled", color: "bg-red-50 text-red-700 border-red-200", icon: AlertCircle },
    NO_SHOW: { label: "No Show", color: "bg-gray-50 text-gray-600 border-gray-200", icon: AlertCircle },
};

function AppointmentRow({ appointment }: { appointment: AppointmentResponseDto }) {
    const status = STATUS_CONFIG[appointment.status] ?? {
        label: appointment.status,
        color: "bg-gray-50 text-gray-600 border-gray-200",
        icon: Calendar,
    };
    const Icon = status.icon;

    return (
        <Link
            href={`/frontdesk/appointments/${appointment.id}`}
            className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 transition-all group"
        >
            {/* Date block */}
            <div className="flex-shrink-0 w-12 text-center">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                    {format(new Date(appointment.appointmentDate), "MMM")}
                </p>
                <p className="text-xl font-bold text-foreground leading-tight">
                    {format(new Date(appointment.appointmentDate), "d")}
                </p>
                <p className="text-xs text-muted-foreground">
                    {format(new Date(appointment.appointmentDate), "yyyy")}
                </p>
            </div>

            {/* Divider */}
            <div className="w-px h-10 bg-border flex-shrink-0" />

            {/* Details */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">
                        {appointment.time || "Time TBD"}
                    </p>
                    {appointment.type && (
                        <span className="text-xs text-muted-foreground">· {appointment.type}</span>
                    )}
                </div>
                {appointment.doctor?.name && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        Dr. {appointment.doctor.name}
                    </p>
                )}
            </div>

            {/* Status badge */}
            <div className="flex-shrink-0 flex items-center gap-2">
                <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border", status.color)}>
                    <Icon className="h-3 w-3" />
                    {status.label}
                </span>
                <ArrowRight size={14} className="text-muted-foreground/40 group-hover:text-primary transition-colors" />
            </div>
        </Link>
    );
}

export function PatientAppointmentsPanel({ patientId }: PatientAppointmentsPanelProps) {
    const { isAuthenticated, user } = useAuth();
    const { data: appointments = [], isLoading, isError } = usePatientAppointments(
        patientId,
        isAuthenticated && !!user // Only fetch when authenticated, same pattern as appointments page
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading appointments…
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                <AlertCircle className="h-8 w-8 text-destructive/40" />
                <p className="text-sm text-muted-foreground">Failed to load appointments</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-primary" />
                    <h2 className="text-base font-semibold text-foreground">Appointments</h2>
                    {appointments.length > 0 && (
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {appointments.length}
                        </span>
                    )}
                </div>
                <Link href={`/frontdesk/appointments/new?patientId=${patientId}&source=profile`}>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                        <Plus size={13} />
                        Book Appointment
                    </Button>
                </Link>
            </div>

            {/* List */}
            {appointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-dashed border-border bg-muted/20 text-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-foreground">No appointments yet</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            This patient has no appointment history
                        </p>
                    </div>
                    <Link href={`/frontdesk/appointments/new?patientId=${patientId}&source=profile`}>
                        <Button size="sm" className="text-xs gap-1.5">
                            <Plus size={13} />
                            Book First Appointment
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="space-y-2">
                    {appointments.map((apt) => (
                        <AppointmentRow key={apt.id} appointment={apt} />
                    ))}
                </div>
            )}
        </div>
    );
}
