'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { useStartConsultation } from '@/hooks/doctor/useConsultation';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface WaitingQueueProps {
    appointments: AppointmentResponseDto[];
    onStartConsultation?: (appointment: AppointmentResponseDto) => void;
}

export function WaitingQueue({ appointments, onStartConsultation: externalStartHandler }: WaitingQueueProps) {
    const { mutate: startConsultation, isPending } = useStartConsultation();
    const router = useRouter();

    // Sort by arrival time (checkedInAt) - oldest first
    const sortedAppointments = [...appointments].sort((a, b) => {
        const timeA = a.checkedInAt ? new Date(a.checkedInAt).getTime() : 0;
        const timeB = b.checkedInAt ? new Date(b.checkedInAt).getTime() : 0;
        return timeA - timeB;
    });

    const handleStart = (apt: AppointmentResponseDto) => {
        // If an external handler is provided (e.g. for routing), use that
        // Otherwise use the hook directly
        if (externalStartHandler) {
            externalStartHandler(apt);
        } else {
            startConsultation(apt.id, {
                onSuccess: () => {
                    router.push(`/doctor/consultations/session/${apt.id}`);
                }
            });
        }
    };

    if (appointments.length === 0) return null;

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.16em] text-slate-500 w-[40px]">#</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Patient</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Wait</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Type</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedAppointments.map((apt, index) => {
                            const patientName = apt.patient
                                ? `${apt.patient.firstName} ${apt.patient.lastName}`
                                : 'Unknown Patient';

                            const waitTime = apt.checkedInAt
                                ? formatDistanceToNow(new Date(apt.checkedInAt))
                                : 'Unknown';

                            return (
                                <tr key={apt.id} className="transition-colors hover:bg-slate-50/70">
                                    <td className="px-4 py-3 text-xs font-medium text-slate-400">
                                        {index + 1}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-900">{patientName}</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                            <Clock className="h-3 w-3 text-slate-400" />
                                            {waitTime}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant="outline" className="border-slate-200 bg-white text-[10px] uppercase tracking-[0.14em] text-slate-500 font-normal">
                                            {apt.type || 'Consultation'}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {apt.status === 'IN_CONSULTATION' ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.push(`/doctor/consultations/session/${apt.id}`)}
                                                className="h-8 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200"
                                            >
                                                <Activity className="h-3.5 w-3.5 mr-1.5 animate-pulse" />
                                                Resume
                                            </Button>
                                        ) : apt.status === 'READY_FOR_CONSULTATION' ? (
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => handleStart(apt)}
                                                className="h-8 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white"
                                            >
                                                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
                                                Start
                                            </Button>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
                                                <Clock className="h-3 w-3" />
                                                Triage
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
