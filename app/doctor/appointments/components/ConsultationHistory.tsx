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
        <div className="space-y-3">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50/50 rounded-t-xl border-b border-slate-100">
                <FileText className="h-4 w-4 text-slate-600" />
                <h3 className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest">Consultation History</h3>
            </div>
            <div className="space-y-4">
                {groups.map((group) => (
                    <div key={group.label} className="space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-4">
                            {group.label}
                        </p>
                        <div className="space-y-2">
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
