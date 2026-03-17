'use client';

import { LucideIcon } from 'lucide-react';
import { AppointmentRow } from './AppointmentRow';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { cn } from '@/lib/utils';

interface AppointmentSectionProps {
    title: string;
    icon: LucideIcon;
    appointments: AppointmentResponseDto[];
    onCheckIn: (id: number) => void;
    onStartConsultation: (apt: AppointmentResponseDto) => void;
    onCompleteConsultation: (apt: AppointmentResponseDto) => void;
    iconColor?: string;
}

const sectionConfig = {
    'Active Consultations': {
        accent: 'bg-violet-500',
        bg: 'bg-violet-50/50',
        border: 'border-violet-200/40',
        text: 'text-violet-700',
    },
    'Pending Confirmations': {
        accent: 'bg-amber-500',
        bg: 'bg-amber-50/50',
        border: 'border-amber-200/40',
        text: 'text-amber-700',
    },
    'Waiting Queue': {
        accent: 'bg-emerald-500',
        bg: 'bg-emerald-50/50',
        border: 'border-emerald-200/40',
        text: 'text-emerald-700',
    },
};

export function AppointmentSection({
    title,
    icon: Icon,
    appointments,
    onCheckIn,
    onStartConsultation,
    onCompleteConsultation,
    iconColor = "text-stone-500",
}: AppointmentSectionProps) {
    if (appointments.length === 0) return null;

    const config = sectionConfig[title as keyof typeof sectionConfig] || {
        accent: 'bg-stone-400',
        bg: 'bg-stone-50/50',
        border: 'border-stone-200/40',
        text: 'text-stone-600',
    };

    return (
        <div className="space-y-2">
            <div className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-t-lg border-b border-transparent",
                config.bg
            )}>
                <div className={cn("w-1.5 h-4 rounded-full", config.accent)} />
                <Icon className={cn("h-4 w-4", iconColor)} />
                <h3 className={cn("text-[11px] font-semibold uppercase tracking-wider", config.text)}>
                    {title}
                </h3>
                <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", config.bg, config.text)}>
                    {appointments.length}
                </span>
            </div>
            <div className="space-y-1.5 border border-stone-100 rounded-lg bg-white/50">
                {appointments.map((apt) => (
                    <AppointmentRow
                        key={apt.id}
                        appointment={apt}
                        onCheckIn={onCheckIn}
                        onStartConsultation={onStartConsultation}
                        onCompleteConsultation={onCompleteConsultation}
                        showDate={false}
                    />
                ))}
            </div>
        </div>
    );
}
