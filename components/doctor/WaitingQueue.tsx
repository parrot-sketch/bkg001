import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Clock, Play, ArrowRight, Activity, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { useStartConsultation } from '@/hooks/doctor/useConsultation';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface WaitingQueueProps {
    appointments: AppointmentResponseDto[];
    onStartConsultation?: (appointment: AppointmentResponseDto) => void;
}

export function WaitingQueue({ appointments, onStartConsultation: externalStartHandler }: WaitingQueueProps) {
    const { mutate: startConsultation, isPending } = useStartConsultation();

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
            startConsultation(apt.id);
        }
    };

    if (appointments.length === 0) return null;

    return (
        <Card className="border-emerald-100 bg-emerald-50/30 overflow-hidden shadow-sm">
            <CardHeader className="border-b border-emerald-100/50 pb-4 bg-emerald-50/50">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-emerald-900 flex items-center gap-2">
                        <Users className="h-5 w-5 text-emerald-600" />
                        Waiting Queue
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-sm shadow-emerald-200">
                            {appointments.length} Patient{appointments.length !== 1 ? 's' : ''}
                        </Badge>
                    </CardTitle>
                    {sortedAppointments.length > 0 && (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full animate-pulse">
                            Next: {sortedAppointments[0].patient?.firstName}
                        </span>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-emerald-100/50">
                    {sortedAppointments.map((apt, index) => {
                        const patientName = apt.patient
                            ? `${apt.patient.firstName} ${apt.patient.lastName}`
                            : 'Unknown Patient';

                        const waitTime = apt.checkedInAt
                            ? formatDistanceToNow(new Date(apt.checkedInAt))
                            : 'Unknown';

                        return (
                            <div
                                key={apt.id}
                                className="group flex items-center justify-between p-4 hover:bg-white transition-colors duration-200"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <Avatar className="h-12 w-12 border-2 border-white shadow-sm group-hover:border-emerald-100 transition-colors">
                                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${patientName}`} />
                                            <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold">
                                                {patientName.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                            <div className="bg-emerald-500 h-3 w-3 rounded-full border-2 border-white animate-pulse" />
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                                            {patientName}
                                        </h4>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                            <span className="flex items-center gap-1.5 text-emerald-700 font-medium bg-emerald-100/50 px-2 py-0.5 rounded-md">
                                                <Clock className="h-3 w-3" />
                                                Waited {waitTime}
                                            </span>
                                            <span className="text-slate-400">•</span>
                                            <span>{apt.type || 'Consultation'}</span>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    onClick={() => handleStart(apt)}
                                    className="bg-white hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 shadow-sm font-semibold rounded-xl group-hover:shadow-md transition-all duration-200"
                                >
                                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                                    Start
                                </Button>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
