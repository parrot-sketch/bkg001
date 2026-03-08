import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AppointmentTimelineProps {
  createdAt?: string | Date;
  checkedInAt?: string | Date;
  consultationStartedAt?: string | Date;
  consultationEndedAt?: string | Date;
}

export function AppointmentTimeline({
  createdAt,
  checkedInAt,
  consultationStartedAt,
  consultationEndedAt,
}: AppointmentTimelineProps) {
  const events = [
    { label: 'Created', value: createdAt, color: 'bg-slate-400' },
    { label: 'Checked In', value: checkedInAt, color: 'bg-teal-500' },
    { label: 'Consultation Started', value: consultationStartedAt, color: 'bg-indigo-500' },
    { label: 'Consultation Completed', value: consultationEndedAt, color: 'bg-green-500' },
  ].filter(e => !!e.value);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event, idx) => (
            <div key={idx} className="flex items-start gap-4">
              <div className={cn("h-3 w-3 rounded-full mt-1 shrink-0", event.color)} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{event.label}</p>
                <p className="text-xs text-slate-500">
                  {format(new Date(event.value!), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No timeline events recorded.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
