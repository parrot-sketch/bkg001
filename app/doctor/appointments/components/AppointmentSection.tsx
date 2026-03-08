'use client';

import { LucideIcon } from 'lucide-react';
import { AppointmentRow } from './AppointmentRow';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

interface AppointmentSectionProps {
    title: string;
    icon: LucideIcon;
    appointments: AppointmentResponseDto[];
    onCheckIn: (id: number) => void;
    onStartConsultation: (apt: AppointmentResponseDto) => void;
    onCompleteConsultation: (apt: AppointmentResponseDto) => void;
    iconColor?: string;
}

export function AppointmentSection({
    title,
    icon: Icon,
    appointments,
    onCheckIn,
    onStartConsultation,
    onCompleteConsultation,
    iconColor = "text-slate-600",
}: AppointmentSectionProps) {
    if (appointments.length === 0) return null;

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 px-4 py-2">
                <Icon className={`h-4 w-4 ${iconColor}`} />
                <h3 className="text-sm font-bold text-slate-900">
                    {title} ({appointments.length})
                </h3>
            </div>
            <div className="space-y-2">
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
