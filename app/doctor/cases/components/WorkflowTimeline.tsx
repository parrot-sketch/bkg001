'use client';

import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';

interface WorkflowTimelineProps {
    status: string;
}

export function WorkflowTimeline({ status }: WorkflowTimelineProps) {
    const isCompleted = status === AppointmentStatus.COMPLETED;
    const isScheduled = status === AppointmentStatus.SCHEDULED;

    return (
        <div className="hidden md:flex items-center justify-between px-10 py-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <Step indicator="1" label="Consultation" active completed={isCompleted || isScheduled} />
            <Connector active={isCompleted || isScheduled} />
            <Step indicator="2" label="Case Planning" active={isCompleted} />
            <Connector />
            <Step indicator="3" label="Pre-Op" />
            <Connector />
            <Step indicator="4" label="Surgery" />
            <Connector />
            <Step indicator="5" label="Recovery" />
        </div>
    );
}

function Step({ indicator, label, active, completed }: { indicator: string; label: string; active?: boolean; completed?: boolean }) {
    return (
        <div className="flex flex-col items-center gap-2 relative z-10">
            <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-sm ring-4 ring-white",
                completed ? "bg-emerald-500 text-white" :
                    active ? "bg-indigo-600 text-white shadow-indigo-200" :
                        "bg-slate-100 text-slate-400"
            )}>
                {completed ? <CheckCircle2 className="h-5 w-5" /> : indicator}
            </div>
            <span className={cn(
                "text-xs font-bold uppercase tracking-wider",
                active || completed ? "text-slate-900" : "text-slate-400"
            )}>{label}</span>
        </div>
    );
}

function Connector({ active }: { active?: boolean }) {
    return (
        <div className={cn(
            "h-0.5 flex-1 mx-4 -mt-6 transition-colors duration-500",
            active ? "bg-emerald-500" : "bg-slate-100"
        )} />
    );
}
