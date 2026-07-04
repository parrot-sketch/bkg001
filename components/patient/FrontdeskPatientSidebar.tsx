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
            <div className="border border-[#e7d6bf] bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-[#e7d6bf] bg-[#e7d6bf]/10">
                    <p className="text-[10px] font-bold text-[#2c2e4b]/60 uppercase tracking-widest">
                        Summary
                    </p>
                </div>
                <div className="px-4 py-1">
                    <div className="flex items-center justify-between py-2.5 border-b border-[#e7d6bf]/60">
                        <span className="text-sm text-[#2c2e4b]/60">Status</span>
                        <span className="inline-flex items-center text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Active
                        </span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 border-b border-[#e7d6bf]/60">
                        <span className="text-sm text-[#2c2e4b]/60">Total Appointments</span>
                        <span className="text-sm font-semibold text-[#2c2e4b]">{totalAppointments}</span>
                    </div>
                    {lastVisit ? (
                        <div className="flex items-center justify-between py-2.5">
                            <span className="text-sm text-[#2c2e4b]/60">Last Visit</span>
                            <span className="text-sm font-semibold text-[#2c2e4b]">
                                {format(lastVisit, "MMM d, yyyy")}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between py-2.5">
                            <span className="text-sm text-[#2c2e4b]/60">Last Visit</span>
                            <span className="text-sm text-[#2c2e4b]/40 italic">No visits yet</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="border border-[#e7d6bf] bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-[#e7d6bf] bg-[#e7d6bf]/10">
                    <p className="text-[10px] font-bold text-[#2c2e4b]/60 uppercase tracking-widest">
                        Actions
                    </p>
                </div>
                <div className="p-4 space-y-2.5">
                    {/* Add to Queue */}
                    <button
                        onClick={() => setQueueDialogOpen(true)}
                        className="w-full flex items-center gap-3 p-3 border border-[#e7d6bf] rounded-lg bg-white hover:bg-[#e7d6bf]/15 transition-all duration-200 group text-left shadow-sm hover:border-[#caa26a]/60"
                    >
                        <div className="p-2 flex-shrink-0 text-[#caa26a] bg-[#e7d6bf]/20 rounded-md group-hover:bg-[#caa26a] group-hover:text-white transition-all duration-200">
                            <UserPlus size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#2c2e4b] leading-tight">Add to Queue</p>
                            <p className="text-[11px] text-[#2c2e4b]/50 mt-0.5">Assign to a doctor</p>
                        </div>
                        <ArrowRight size={14} className="text-[#2c2e4b]/30 group-hover:text-[#caa26a] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </button>

                    {/* Schedule Appointment */}
                    <button
                        onClick={() => openBookingDialog({
                            initialPatientId: patientId,
                            source: AppointmentSource.FRONTDESK_SCHEDULED,
                            bookingChannel: BookingChannel.DASHBOARD,
                        })}
                        className="w-full flex items-center gap-3 p-3 border border-[#e7d6bf] rounded-lg bg-white hover:bg-[#e7d6bf]/15 transition-all duration-200 group text-left shadow-sm hover:border-[#caa26a]/60"
                    >
                        <div className="p-2 flex-shrink-0 text-[#caa26a] bg-[#e7d6bf]/20 rounded-md group-hover:bg-[#caa26a] group-hover:text-white transition-all duration-200">
                            <CalendarPlus size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#2c2e4b] leading-tight">Schedule Appointment</p>
                            <p className="text-[11px] text-[#2c2e4b]/50 mt-0.5">Book a new appointment</p>
                        </div>
                        <ArrowRight size={14} className="text-[#2c2e4b]/30 group-hover:text-[#caa26a] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
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
                                    "w-full flex items-center gap-3 p-3 border rounded-lg transition-all duration-200 group text-left shadow-sm",
                                    isActive
                                        ? "border-[#caa26a] bg-[#e7d6bf]/15"
                                        : "border-[#e7d6bf] bg-white hover:bg-[#e7d6bf]/15 hover:border-[#caa26a]/60"
                                )}
                            >
                                <div className={cn(
                                    "p-2 flex-shrink-0 rounded-md transition-all duration-200",
                                    isActive
                                        ? "text-white bg-[#caa26a]"
                                        : "text-[#caa26a] bg-[#e7d6bf]/20 group-hover:bg-[#caa26a] group-hover:text-white"
                                )}>
                                    <Icon size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-[#2c2e4b] leading-tight">
                                        {action.label}
                                    </p>
                                    <p className="text-[11px] text-[#2c2e4b]/50 mt-0.5">{action.description}</p>
                                </div>
                                <ArrowRight
                                    size={14}
                                    className={cn(
                                        "transition-all flex-shrink-0",
                                        isActive ? "text-[#caa26a]" : "text-[#2c2e4b]/30 group-hover:text-[#caa26a] group-hover:translate-x-0.5"
                                    )}
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
