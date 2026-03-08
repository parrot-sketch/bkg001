import { Calendar, Clock, Stethoscope } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface AppointmentDetailsCardProps {
  appointmentDate: string | Date;
  time: string;
  type?: string;
  doctorName?: string;
  note?: string;
  reason?: string;
}

export function AppointmentDetailsCard({
  appointmentDate,
  time,
  type,
  doctorName,
  note,
  reason,
}: AppointmentDetailsCardProps) {
  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, 'EEEE, MMMM d, yyyy');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-slate-500" />
          Appointment Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-500">Date</p>
            <p className="font-medium">{formatDate(appointmentDate)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Time</p>
            <p className="font-medium flex items-center gap-1">
              <Clock className="h-4 w-4 text-slate-400" />
              {time}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Type</p>
            <p className="font-medium capitalize">{type || 'General'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Doctor</p>
            <p className="font-medium flex items-center gap-1">
              <Stethoscope className="h-4 w-4 text-slate-400" />
              {doctorName || 'Not assigned'}
            </p>
          </div>
        </div>

        {note && (
          <div className="pt-4 border-t">
            <p className="text-sm text-slate-500 mb-1">Notes</p>
            <p className="text-sm bg-slate-50 p-3 rounded-lg">{note}</p>
          </div>
        )}

        {reason && (
          <div className="pt-4 border-t">
            <p className="text-sm text-slate-500 mb-1">Reason</p>
            <p className="text-sm bg-slate-50 p-3 rounded-lg">{reason}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
