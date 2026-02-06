import { ScheduleTabs } from '@/components/doctor/schedule/ScheduleTabs';
import { getCurrentUser, getCurrentUserFull } from '@/lib/auth/server-auth';
import { redirect } from 'next/navigation';
import { getDoctorSchedule } from '@/app/actions/schedule';

export default async function DoctorSchedulePage() {
    // 1. Server-Side Authentication
    const user = await getCurrentUserFull();

    if (!user) {
        redirect('/login');
    }

    // Role check (Optional but robust)
    if (user.role !== 'DOCTOR' && user.role !== 'ADMIN') {
        // Allow admin or doctor
        // redirect('/dashboard'); 
    }

    // 2. Pre-fetch Schedule Data
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30); // 30 days ahead

    let scheduleData;
    try {
        scheduleData = await getDoctorSchedule(user.id, start, end);
    } catch (error) {
        console.error("Failed to load schedule data", error);
        scheduleData = { appointments: [], workingDays: [], blocks: [] };
    }

    // 3. Render
    return (
        <div className="space-y-6 container mx-auto py-6 max-w-7xl">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Schedule Management</h1>
                <p className="text-muted-foreground">
                    Manage your weekly working hours, exceptions, and view your appointment calendar.
                </p>
            </div>

            <ScheduleTabs initialSchedule={scheduleData} currentUser={user} />
        </div>
    );
}
