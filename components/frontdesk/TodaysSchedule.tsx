import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Calendar, CheckCircle, Clock, Search, MoreVertical,
    User, Filter, ArrowRight, Loader2, Stethoscope, CalendarClock
} from 'lucide-react';
import { useTodaysSchedule } from '@/hooks/frontdesk/useTodaysSchedule';
import { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { format, isAfter, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { FrontdeskAppointmentCard } from './FrontdeskAppointmentCard';



export function TodaysSchedule() {
    const { data: schedule, isLoading, error } = useTodaysSchedule();
    const [searchQuery, setSearchQuery] = useState('');



    if (isLoading) {
        return (
            <Card className="h-full min-h-[400px] flex items-center justify-center border-slate-200 shadow-sm">
                <div className="flex flex-col items-center gap-2 text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    <p>Loading today's schedule...</p>
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="h-full min-h-[400px] flex items-center justify-center border-red-200 bg-red-50 shadow-sm">
                <p className="text-red-600 font-medium">Failed to load schedule. Please try again.</p>
            </Card>
        );
    }

    // Combine lists for searching if needed, or keep sections.
    // Let's filter the sections based on search query
    const filterAppointments = (list: AppointmentResponseDto[] = []) => {
        if (!searchQuery) return list;
        const lowerQuery = searchQuery.toLowerCase();
        return list.filter(apt =>
            apt.patient?.firstName.toLowerCase().includes(lowerQuery) ||
            apt.patient?.lastName.toLowerCase().includes(lowerQuery) ||
            apt.doctor?.name.toLowerCase().includes(lowerQuery)
        );
    };

    const scheduled = filterAppointments(schedule?.scheduled);
    const checkedIn = filterAppointments(schedule?.checkedIn);
    const inConsultation = filterAppointments(schedule?.inConsultation);
    const completed = filterAppointments(schedule?.completed);

    return (
        <>
            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden rounded-2xl">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-slate-600" />
                                Today's Schedule
                            </CardTitle>
                            <p className="text-sm text-slate-500 mt-1">
                                Manage appointment flow and patient check-ins
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search patient or doctor..."
                                    className="pl-9 w-full sm:w-[250px] bg-white border-slate-200 focus:border-slate-400 rounded-xl"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" size="icon" className="shrink-0 rounded-xl border-slate-200 text-slate-600">
                                <Filter className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="divide-y divide-slate-100">
                        {/* Scheduled Section */}
                        <Section
                            title="Scheduled / Arriving"
                            count={scheduled.length}
                            color="blue"
                            icon={Clock}
                            emptyMessage="No scheduled appointments pending arrival."
                        >
                            {scheduled.map(apt => (
                                <FrontdeskAppointmentCard
                                    key={apt.id}
                                    appointment={apt}
                                />
                            ))}
                        </Section>

                        {/* Checked In Section */}
                        <Section
                            title="Waiting Room"
                            count={checkedIn.length}
                            color="amber"
                            icon={User}
                            emptyMessage="Waiting room is empty."
                        >
                            {checkedIn.map(apt => (
                                <FrontdeskAppointmentCard
                                    key={apt.id}
                                    appointment={apt}
                                />
                            ))}
                        </Section>

                        {/* In Consultation Section */}
                        <Section
                            title="In Consultation"
                            count={inConsultation.length}
                            color="emerald"
                            icon={Stethoscope}
                            emptyMessage="No active consultations."
                        >
                            {inConsultation.map(apt => (
                                <FrontdeskAppointmentCard
                                    key={apt.id}
                                    appointment={apt}
                                />
                            ))}
                        </Section>

                        {/* Completed Section (Optional/Collapsible could be better, but showing simple list for now) */}
                        {completed.length > 0 && (
                            <Section
                                title="Completed Today"
                                count={completed.length}
                                color="slate"
                                icon={CheckCircle}
                            >
                                {completed.map(apt => (
                                    <FrontdeskAppointmentCard
                                        key={apt.id}
                                        appointment={apt}
                                    />
                                ))}
                            </Section>
                        )}
                    </div>
                </CardContent>
            </Card>


        </>
    );
}

// Sub-components for cleaner code

function Section({ title, count, children, color, icon: Icon, emptyMessage }: any) {
    return (
        <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-slate-100">
                    <Icon className="h-4 w-4 text-slate-600" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">{title}</h3>
                <Badge variant="secondary" className="ml-auto font-bold bg-slate-100 text-slate-600">{count}</Badge>
            </div>

            {count === 0 && emptyMessage ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-400">{emptyMessage}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {children}
                </div>
            )}
        </div>
    );
}


