import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Search,
} from 'lucide-react';
import { useTodaysSchedule } from '@/hooks/frontdesk/use-frontdesk-dashboard';
import { FrontdeskAppointment } from '@/actions/frontdesk/get-dashboard-data';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { cn } from '@/lib/utils';
import { FrontdeskAppointmentCard } from './FrontdeskAppointmentCard';
import { ReactNode, useState } from 'react';

type ScheduleSectionKey = 'scheduled' | 'checkedIn' | 'inConsultation' | 'completed';

interface ScheduleSectionDefinition {
    key: ScheduleSectionKey;
    title: string;
    description: string;
    emptyMessage: string;
}

const SCHEDULE_SECTIONS: ScheduleSectionDefinition[] = [
    {
        key: 'scheduled',
        title: 'Scheduled',
        description: 'Expected today',
        emptyMessage: 'No scheduled appointments pending arrival.',
    },
    {
        key: 'checkedIn',
        title: 'Waiting Room',
        description: 'Checked in, awaiting consultation',
        emptyMessage: 'Waiting room is empty.',
    },
    {
        key: 'inConsultation',
        title: 'In Consultation',
        description: 'Currently with a doctor',
        emptyMessage: 'No active consultations.',
    },
    {
        key: 'completed',
        title: 'Completed',
        description: 'Finished today',
        emptyMessage: 'No completed appointments yet.',
    },
];

function mapScheduleAppointmentToDto(appointment: FrontdeskAppointment): AppointmentResponseDto {
    return {
        id: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        appointmentDate: new Date(appointment.appointmentDate),
        time: appointment.time,
        status: appointment.status,
        type: appointment.type,
        patient: appointment.patient,
        doctor: appointment.doctor,
    };
}

export function TodaysSchedule() {
    const { data: schedule, isLoading, error } = useTodaysSchedule();
    const [searchQuery, setSearchQuery] = useState('');

    const filterAppointments = (list: FrontdeskAppointment[] = []) => {
        if (!searchQuery) return list;
        const lowerQuery = searchQuery.toLowerCase();
        return list.filter(apt =>
            apt.patientName.toLowerCase().includes(lowerQuery) ||
            apt.doctorName.toLowerCase().includes(lowerQuery)
        );
    };

    const scheduled = filterAppointments(schedule?.scheduled ?? []);
    const checkedIn = filterAppointments(schedule?.checkedIn ?? []);
    const inConsultation = filterAppointments(schedule?.inConsultation ?? []);
    const completed = filterAppointments(schedule?.completed ?? []);
    const totalAppointments = scheduled.length + checkedIn.length + inConsultation.length + completed.length;

    const sections = SCHEDULE_SECTIONS;

    const appointmentMap: Record<ScheduleSectionKey, FrontdeskAppointment[]> = {
        scheduled,
        checkedIn,
        inConsultation,
        completed,
    };

    if (isLoading) {
        return (
            <Card className="h-full min-h-[400px] flex items-center justify-center border-slate-200 bg-white">
                <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Search className="h-8 w-8 animate-pulse text-slate-300" />
                    <p className="text-sm">Loading today&apos;s schedule...</p>
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="h-full min-h-[400px] flex items-center justify-center border-slate-200 bg-white">
                <p className="text-sm text-slate-500">Failed to load schedule.</p>
            </Card>
        );
    }

    return (
        <Card className="border border-slate-200 bg-white shadow-sm">
            <div className="px-5 py-5 sm:px-6 border-b border-slate-100">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-0.5">
                        <h2 className="text-base font-semibold text-[#121c1d] tracking-tight">Today&apos;s Schedule</h2>
                        <p className="text-sm text-slate-500">{totalAppointments} appointments across all stages</p>
                    </div>
                    <div className="relative w-full lg:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search patient or doctor..."
                            className="w-full rounded-md border-slate-200 bg-white pl-9 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#0c5d69] focus:ring-[#0c5d69]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="divide-y divide-slate-100">
                {sections.map((section) => (
                    <div key={section.key} className="px-5 sm:px-6">
                        <div className="flex items-center justify-between py-3">
                            <div>
                                <h3 className="text-sm font-medium text-[#121c1d]">{section.title}</h3>
                                <p className="text-xs text-slate-400 mt-0.5">{section.description}</p>
                            </div>
                            <Badge variant="outline" className="h-6 rounded-md px-2 text-xs font-medium border-slate-200 text-slate-600">
                                {appointmentMap[section.key].length}
                            </Badge>
                        </div>
                        <div className="pb-4">
                            {appointmentMap[section.key].length === 0 ? (
                                <p className="text-xs text-slate-400 py-2">{section.emptyMessage}</p>
                            ) : (
                                <div className="space-y-2">
                                    {appointmentMap[section.key].map((appointment) => (
                                        <FrontdeskAppointmentCard
                                            key={appointment.id}
                                            appointment={mapScheduleAppointmentToDto(appointment)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
