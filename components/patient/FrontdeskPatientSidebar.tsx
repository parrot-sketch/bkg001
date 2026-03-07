'use client';

import { useRouter, useSearchParams } from "next/navigation";
import {
    CalendarDays,
    ClipboardList,
    CreditCard,
    CalendarPlus,
    ArrowRight,
    User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useBookAppointmentStore } from "@/hooks/frontdesk/useBookAppointmentStore";
import { BookingChannel } from "@/domain/enums/BookingChannel";

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
        label: "Clinical Records",
        description: "View medical records",
        icon: ClipboardList,
        tabKey: "medical-history",
        iconClass: "text-teal-600 bg-teal-50",
    },
    {
        label: "Billing & Payments",
        description: "View billing history",
        icon: CreditCard,
        tabKey: "billing",
        iconClass: "text-amber-600 bg-amber-50",
    },
];

// External action (opens in new context)
const EXTERNAL_ACTION = {
    label: "Schedule Appointment",
    description: "Book a new appointment",
    icon: CalendarPlus,
    getHref: (id: string) => `/frontdesk/appointments/new?patientId=${id}&source=profile`,
    iconClass: "text-emerald-600 bg-emerald-50",
};

export function FrontdeskPatientSidebar({
    patientId,
    patientName,
    lastVisit,
    totalAppointments,
}: FrontdeskPatientSidebarProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentTab = searchParams.get("cat") || "overview";
    const { openBookingDialog } = useBookAppointmentStore();

    const handleTabClick = (tabKey: string) => {
        // Use replace to avoid adding to history stack for smoother UX
        router.push(`/frontdesk/patient/${patientId}?cat=${tabKey}`, { scroll: false });
        // Scroll to top of content area smoothly
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
            <Card className="border-border shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Patient Summary
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-0">
                    <div className="flex items-center justify-between py-2.5 border-b border-border">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            Active
                        </span>
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
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-border shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Quick Actions
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                    {/* Inline Tab Actions */}
                    {QUICK_ACTIONS.map((action) => {
                        const Icon = action.icon;
                        const isActive = currentTab === action.tabKey;
                        return (
                            <button
                                key={action.label}
                                onClick={() => handleTabClick(action.tabKey)}
                                className={cn(
                                    "w-full flex items-center gap-3 p-3 rounded-lg border transition-all group text-left",
                                    isActive
                                        ? "border-primary/50 bg-primary/5 hover:bg-primary/10"
                                        : "border-border hover:border-primary/30 hover:bg-muted/40"
                                )}
                            >
                                <div className={cn("p-2 rounded-md flex-shrink-0", action.iconClass)}>
                                    <Icon size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={cn(
                                        "text-sm font-medium leading-tight",
                                        isActive ? "text-primary" : "text-foreground"
                                    )}>
                                        {action.label}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                                </div>
                                {isActive ? (
                                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                                ) : (
                                    <ArrowRight
                                        size={14}
                                        className="text-muted-foreground/50 group-hover:text-primary transition-colors flex-shrink-0"
                                    />
                                )}
                            </button>
                        );
                    })}

                    {/* External Action (Schedule Appointment) */}
                    <button
                        onClick={() => openBookingDialog({ initialPatientId: patientId, bookingChannel: BookingChannel.PATIENT_PROFILE })}
                        className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/40 transition-all group text-left"
                    >
                        <div className={`p-2 rounded-md flex-shrink-0 ${EXTERNAL_ACTION.iconClass}`}>
                            <EXTERNAL_ACTION.icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground leading-tight">{EXTERNAL_ACTION.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{EXTERNAL_ACTION.description}</p>
                        </div>
                        <ArrowRight
                            size={14}
                            className="text-muted-foreground/50 group-hover:text-primary transition-colors flex-shrink-0"
                        />
                    </button>
                </CardContent>
            </Card>
        </div>
    );
}
