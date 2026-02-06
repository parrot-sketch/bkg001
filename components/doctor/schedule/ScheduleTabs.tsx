'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarIcon, Settings } from 'lucide-react';
import { ScheduleCalendarView } from '@/components/doctor/schedule/ScheduleCalendarView';
import { ScheduleSettingsPanel } from '@/components/doctor/schedule/ScheduleSettingsPanel';
// import { useAuth } from '@/hooks/patient/useAuth'; // No longer needed for initial load
import { getDoctorSchedule } from '@/app/actions/schedule';
import { toast } from 'sonner';

interface ScheduleTabsProps {
    initialSchedule: any;
    currentUser: any;
}

export function ScheduleTabs({ initialSchedule, currentUser }: ScheduleTabsProps) {
    // const { user } = useAuth(); // We can use prop 'currentUser' instead
    const [activeTab, setActiveTab] = useState('calendar');
    const [scheduleData, setScheduleData] = useState<any>(initialSchedule);
    const [loading, setLoading] = useState(false); // No longer loading initially

    // We can still keep a refresh function if needed, but initial data is via props
    const refreshSchedule = async () => {
        if (!currentUser?.id) return;
        setLoading(true);
        try {
            // Fetch next 30 days by default
            const start = new Date();
            const end = new Date();
            end.setDate(end.getDate() + 30);
            const data = await getDoctorSchedule(currentUser.id, start, end);
            setScheduleData(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to refresh schedule");
        } finally {
            setLoading(false);
        }
    };

    if (!currentUser) return <div className="p-8 text-center text-muted-foreground">Please log in to view schedule.</div>;

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="flex items-center justify-between">
                <TabsList>
                    <TabsTrigger value="calendar" className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        Calendar View
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Weekly Schedule
                    </TabsTrigger>
                </TabsList>

                {/* Optional Refresh Button */}
                {/* <Button variant="ghost" size="sm" onClick={refreshSchedule} disabled={loading}>Refresh</Button> */}
            </div>

            <TabsContent value="calendar" className="space-y-4">
                <ScheduleCalendarView
                    appointments={scheduleData?.appointments || []}
                    workingDays={scheduleData?.workingDays || []}
                    blocks={scheduleData?.blocks || []}
                    onSetupScheduleClick={() => setActiveTab('settings')}
                />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
                <ScheduleSettingsPanel initialWorkingDays={scheduleData?.workingDays || []} />
            </TabsContent>
        </Tabs>
    );
}

