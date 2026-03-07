'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Calendar as CalendarIcon, Settings2, RefreshCw, Loader2, ChevronRight } from 'lucide-react';
import { ScheduleCalendarView } from '@/components/doctor/schedule/ScheduleCalendarView';
import { getDoctorSchedule } from '@/app/actions/schedule';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Lazy-load the availability editor — only pay for the JS when needed
const ScheduleSettingsPanel = dynamic(
    () => import('@/components/doctor/schedule/ScheduleSettingsPanelV2').then(m => ({ default: m.ScheduleSettingsPanelV2 })),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-sm">Loading availability editor…</span>
            </div>
        ),
    },
);

interface ScheduleTabsProps {
    initialSchedule: any;
    currentUser: any;
}

type View = 'calendar' | 'availability';

export function ScheduleTabs({ initialSchedule, currentUser }: ScheduleTabsProps) {
    const [activeView, setActiveView] = useState<View>('calendar');
    const [scheduleData, setScheduleData] = useState<any>(initialSchedule);
    const [refreshing, setRefreshing] = useState(false);

    const refreshSchedule = useCallback(async () => {
        if (!currentUser?.id) return;
        setRefreshing(true);
        try {
            const start = new Date();
            start.setDate(start.getDate() - 30);
            const end = new Date();
            end.setDate(end.getDate() + 60);
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
        <div className="space-y-5">
            {/* View switcher + refresh */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1">
                    <button
                        type="button"
                        onClick={() => setActiveView('calendar')}
                        className={cn(
                            'flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                            activeView === 'calendar'
                                ? 'bg-background shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <CalendarIcon className="h-4 w-4" />
                        Appointments
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveView('availability')}
                        className={cn(
                            'flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                            activeView === 'availability'
                                ? 'bg-background shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <Settings2 className="h-4 w-4" />
                        My Availability
                    </button>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshSchedule}
                    disabled={refreshing}
                    className="text-muted-foreground hover:text-foreground h-8"
                >
                    <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', refreshing && 'animate-spin')} />
                    Refresh
                </Button>
            </div>

            {/* Calendar view */}
            {activeView === 'calendar' && (
                <ScheduleCalendarView
                    appointments={scheduleData?.appointments || []}
                    surgicalCases={scheduleData?.surgicalCases || []}
                    workingDays={scheduleData?.workingDays || []}
                    blocks={scheduleData?.blocks || []}
                    overrides={scheduleData?.overrides || []}
                    onSetupScheduleClick={() => setActiveView('availability')}
                />
            )}

            {/* Availability editor */}
            {activeView === 'availability' && (
                <ScheduleSettingsPanel
                    initialWorkingDays={scheduleData?.workingDays || []}
                    initialSlotConfig={scheduleData?.slotConfig || null}
                    userId={currentUser.id}
                />
            )}
        </div>
    );
}
