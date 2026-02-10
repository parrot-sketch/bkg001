'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarIcon, Settings2, RefreshCw, Loader2 } from 'lucide-react';
import { ScheduleCalendarView } from '@/components/doctor/schedule/ScheduleCalendarView';
import { getDoctorSchedule } from '@/app/actions/schedule';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Lazy-load the settings panel — it bundles its own react-big-calendar
// instance, so we only pay for that JS when the doctor opens the tab.
const ScheduleSettingsPanel = dynamic(
    () => import('@/components/doctor/schedule/ScheduleSettingsPanel').then(m => ({ default: m.ScheduleSettingsPanel })),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-sm">Loading schedule editor…</span>
            </div>
        ),
    },
);

interface ScheduleTabsProps {
    initialSchedule: any;
    currentUser: any;
}

export function ScheduleTabs({ initialSchedule, currentUser }: ScheduleTabsProps) {
    const [activeTab, setActiveTab] = useState('calendar');
    const [scheduleData, setScheduleData] = useState<any>(initialSchedule);
    const [refreshing, setRefreshing] = useState(false);

    const refreshSchedule = useCallback(async () => {
        if (!currentUser?.id) return;
        setRefreshing(true);
        try {
            const start = new Date();
            const end = new Date();
            end.setDate(end.getDate() + 30);
            const data = await getDoctorSchedule(currentUser.id, start, end);
            setScheduleData(data);
            toast.success('Schedule refreshed');
        } catch (error) {
            console.error(error);
            toast.error('Failed to refresh schedule');
        } finally {
            setRefreshing(false);
        }
    }, [currentUser?.id]);

    if (!currentUser) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Please log in to view schedule.
            </div>
        );
    }

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
            <div className="flex items-center justify-between">
                <TabsList className="bg-muted/60 p-1">
                    <TabsTrigger
                        value="calendar"
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all",
                            "data-[state=active]:bg-background data-[state=active]:shadow-sm"
                        )}
                    >
                        <CalendarIcon className="h-4 w-4" />
                        Calendar
                    </TabsTrigger>
                    <TabsTrigger
                        value="settings"
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all",
                            "data-[state=active]:bg-background data-[state=active]:shadow-sm"
                        )}
                    >
                        <Settings2 className="h-4 w-4" />
                        Weekly Schedule
                    </TabsTrigger>
                </TabsList>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshSchedule}
                    disabled={refreshing}
                    className="text-muted-foreground hover:text-foreground h-8"
                >
                    <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", refreshing && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            <TabsContent value="calendar" className="mt-0">
                <ScheduleCalendarView
                    appointments={scheduleData?.appointments || []}
                    workingDays={scheduleData?.workingDays || []}
                    blocks={scheduleData?.blocks || []}
                    overrides={scheduleData?.overrides || []}
                    onSetupScheduleClick={() => setActiveTab('settings')}
                />
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
                <ScheduleSettingsPanel
                    initialWorkingDays={scheduleData?.workingDays || []}
                    userId={currentUser.id}
                />
            </TabsContent>
        </Tabs>
    );
}
