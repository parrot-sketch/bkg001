import { ScheduleTabs } from '@/components/doctor/schedule/ScheduleTabs';
import { getCurrentUserFull } from '@/lib/auth/server-auth';
import { redirect } from 'next/navigation';
import { getDoctorSchedule } from '@/app/actions/schedule';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function DoctorSchedulePage() {
    // 1. Auth
    const user = await getCurrentUserFull();
    if (!user) redirect('/login');
    if (user.role !== 'DOCTOR' && user.role !== 'ADMIN') redirect('/login');

    // Pre-fetch window: 30 days back → 60 days ahead
    const start = new Date();
    start.setDate(start.getDate() - 30);
    const end = new Date();
    end.setDate(end.getDate() + 60);

    let scheduleData;
    try {
        scheduleData = await getDoctorSchedule(user.id, start, end);
    } catch (error) {
        console.error('Failed to load schedule data', error);
        scheduleData = { appointments: [], workingDays: [], blocks: [], overrides: [] };
    }

    const appointmentCount = scheduleData?.appointments?.length ?? 0;
    const today = format(new Date(), 'EEEE, MMMM d');

    // 3. Render
    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{today}</p>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        My Schedule
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {appointmentCount > 0
                            ? `${appointmentCount} appointment${appointmentCount !== 1 ? 's' : ''} in the next 30 days`
                            : 'No upcoming appointments in the next 30 days'}
                    </p>
                </div>
            </div>

            <ScheduleTabs initialSchedule={scheduleData} currentUser={user} />
        </div>
    );
}
