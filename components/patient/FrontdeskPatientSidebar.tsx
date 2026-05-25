'use client';

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    CalendarDays,
    ClipboardList,
    CreditCard,
    CalendarPlus,
    ArrowRight,
    UserPlus,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BookingChannel } from "@/domain/enums/BookingChannel";
import { useBookAppointmentStore } from "@/hooks/frontdesk/useBookAppointmentStore";
import { AppointmentSource } from "@/domain/enums/AppointmentSource";
import { QuickAssignmentDialog } from "@/components/frontdesk/QuickAssignmentDialog";

interface FrontdeskPatientSidebarProps {
    patientId: string;
    patientName: string;
    lastVisit?: Date | null;
    totalAppointments: number;
}

const QUICK_ACTIONS = [
    {
        label: "Appointments",
        description: "View all appointments",
        icon: CalendarDays,
        tabKey: "appointments",
        iconClass: "text-blue-600 bg-blue-50",
    },
    {
        label: "Billing & Payments",
        description: "View billing history",
        icon: CreditCard,
        tabKey: "billing",
        iconClass: "text-amber-600 bg-amber-50",
    },
];

export function FrontdeskPatientSidebar({
    patientId,
    patientName,
    lastVisit,
    totalAppointments,
}: FrontdeskPatientSidebarProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { openBookingDialog } = useBookAppointmentStore();
    const currentTab = searchParams.get("cat") || "overview";
    const [queueDialogOpen, setQueueDialogOpen] = useState(false);

    const handleTabClick = (tabKey: string) => {
        router.push(`/frontdesk/patient/${patientId}?cat=${tabKey}`, { scroll: false });
        setTimeout(() => {
            const contentArea = document.querySelector('[data-content-area]');
            if (contentArea) {
                contentArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 50);
    };

    return (
        <div className="space-y-4">
            {/* Patient Summary */}
            <div className="border border-border bg-white">
                <div className="px-4 py-3 border-b border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Summary
                    </p>
                </div>
                <div className="px-4">
                    <div className="flex items-center justify-between py-2.5 border-b border-border">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <span className="text-xs font-medium text-foreground">Active</span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 border-b border-border">
                        <span className="text-sm text-muted-foreground">Total Appointments</span>
                        <span className="text-sm font-semibold text-foreground">{totalAppointments}</span>
                    </div>
                    {lastVisit ? (
                        <div className="flex items-center justify-between py-2.5">
                            <span className="text-sm text-muted-foreground">Last Visit</span>
                            <span className="text-sm font-medium text-foreground">
                                {format(lastVisit, "MMM d, yyyy")}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between py-2.5">
                            <span className="text-sm text-muted-foreground">Last Visit</span>
                            <span className="text-sm text-muted-foreground italic">No visits yet</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="border border-border bg-white">
                <div className="px-4 py-3 border-b border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Actions
                    </p>
                </div>
                <div className="p-4 space-y-2">
                    {/* Add to Queue */}
                    <button
                        onClick={() => setQueueDialogOpen(true)}
                        className="w-full flex items-center gap-3 p-3 border border-border hover:bg-muted/30 transition-colors group text-left"
                    >
                        <div className="p-2 flex-shrink-0 text-foreground bg-muted">
                            <UserPlus size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground leading-tight">Add to Queue</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Assign to a doctor</p>
                        </div>
                        <ArrowRight size={14} className="text-muted-foreground/50 group-hover:text-foreground transition-colors flex-shrink-0" />
                    </button>

                    {/* Schedule Appointment */}
                    <button
                        onClick={() => openBookingDialog({
                            initialPatientId: patientId,
                            source: AppointmentSource.FRONTDESK_SCHEDULED,
                            bookingChannel: BookingChannel.DASHBOARD,
                        })}
                        className="w-full flex items-center gap-3 p-3 border border-border hover:bg-muted/30 transition-colors group text-left"
                    >
                        <div className="p-2 flex-shrink-0 text-foreground bg-muted">
                            <CalendarPlus size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground leading-tight">Schedule Appointment</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Book a new appointment</p>
                        </div>
                        <ArrowRight size={14} className="text-muted-foreground/50 group-hover:text-foreground transition-colors flex-shrink-0" />
                    </button>

                    {/* Tab Actions */}
                    {QUICK_ACTIONS.map((action) => {
                        const Icon = action.icon;
                        const isActive = currentTab === action.tabKey;
                        return (
                            <button
                                key={action.label}
                                onClick={() => handleTabClick(action.tabKey)}
                                className={cn(
                                    "w-full flex items-center gap-3 p-3 border transition-colors group text-left",
                                    isActive
                                        ? "border-foreground/30 bg-muted/40"
                                        : "border-border hover:bg-muted/30"
                                )}
                            >
                                <div className="p-2 flex-shrink-0 text-foreground bg-muted">
                                    <Icon size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={cn(
                                        "text-sm font-medium leading-tight",
                                        "text-foreground"
                                    )}>
                                        {action.label}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                                </div>
                                <ArrowRight
                                    size={14}
                                    className="text-muted-foreground/50 group-hover:text-foreground transition-colors flex-shrink-0"
                                />
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Queue Assignment Dialog — pre-selected patient */}
            <QuickAssignmentDialog
                open={queueDialogOpen}
                onOpenChange={setQueueDialogOpen}
                initialPatientId={patientId}
                initialPatientName={patientName}
            />
        </div>
    );
}
