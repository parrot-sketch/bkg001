'use client';

import { FileText } from 'lucide-react';
import { AppointmentRow } from './AppointmentRow';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

interface ConsultationHistoryProps {
    groups: { label: string; items: AppointmentResponseDto[] }[];
    onCheckIn: (id: number) => void;
    onStartConsultation: (apt: AppointmentResponseDto) => void;
    onCompleteConsultation: (apt: AppointmentResponseDto) => void;
}

export function ConsultationHistory({
    groups,
    onCheckIn,
    onStartConsultation,
    onCompleteConsultation,
}: ConsultationHistoryProps) {
    if (groups.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2.5 px-4">
                <div className="w-1.5 h-4 rounded-full bg-stone-300" />
                <FileText className="h-4 w-4 text-stone-400" />
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Consultation History</h3>
            </div>
            <div className="space-y-4 mx-4">
                {groups.map((group) => (
                    <div key={group.label} className="space-y-2">
                        <p className="text-xs font-medium text-stone-500 px-2">
                            {group.label}
                        </p>
                        <div className="space-y-1 border border-stone-100 rounded-lg bg-white/50 overflow-hidden">
                            {group.items.map((apt) => (
                                <AppointmentRow
                                    key={apt.id}
                                    appointment={apt}
                                    onCheckIn={onCheckIn}
                                    onStartConsultation={onStartConsultation}
                                    onCompleteConsultation={onCompleteConsultation}
                                    showDate={true}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
