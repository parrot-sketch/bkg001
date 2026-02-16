import { ScheduleTabs } from '@/components/doctor/schedule/ScheduleTabs';
import { getCurrentUserFull } from '@/lib/auth/server-auth';
import { redirect } from 'next/navigation';
import { getDoctorSchedule } from '@/app/actions/schedule';

export const dynamic = 'force-dynamic';

export default async function DoctorSchedulePage() {
    // 1. Server-Side Authentication
    const user = await getCurrentUserFull();

    if (!user) {
        redirect('/login');
    }

    if (user.role !== 'DOCTOR' && user.role !== 'ADMIN') {
        redirect('/login');
    }

    // 2. Pre-fetch Schedule Data (30 days ahead)
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30);

    let scheduleData;
    try {
        scheduleData = await getDoctorSchedule(user.id, start, end);
    } catch (error) {
        console.error("Failed to load schedule data", error);
        scheduleData = { appointments: [], workingDays: [], blocks: [], overrides: [] };
    }

    // 3. Render
    return (
        <div className="space-y-1">
            {/* Page Header */}
            <div className="flex flex-col gap-1 mb-5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Schedule Management
                </h1>
                <p className="text-sm text-muted-foreground">
                    View your appointment calendar and configure your weekly availability.
                </p>
            </div>

            <ScheduleTabs initialSchedule={scheduleData} currentUser={user} />
        </div>
    );
}
