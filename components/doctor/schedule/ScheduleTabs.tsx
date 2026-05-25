'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { RefreshCw, Loader2, Calendar, Clock } from 'lucide-react';
import { ScheduleCalendarView } from '@/components/doctor/schedule/ScheduleCalendarView';
import { getDoctorSchedule } from '@/app/actions/schedule';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchParams } from 'next/navigation';

// Lazy-load the availability editor — only pay for the JS when needed
const AvailabilitySettingsPanel = dynamic(
    () => import('@/components/doctor/schedule/AvailabilitySettings').then(m => ({ default: m.AvailabilitySettings })),
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

export function ScheduleTabs({ initialSchedule, currentUser }: ScheduleTabsProps) {
    const searchParams = useSearchParams();
    const urlTab = searchParams.get('tab');
    const setupMode = searchParams.get('setup') === 'true';
    
    const [scheduleData, setScheduleData] = useState<any>(initialSchedule);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<string>(() => {
        // If setupMode is true, start on availability tab
        // Otherwise, use URL param or default to calendar
        if (setupMode) return 'availability';
        return urlTab === 'availability' ? 'availability' : 'calendar';
    });
    const [isSettingsDirty, setIsSettingsDirty] = useState(false);

    const refreshSchedule = useCallback(async (options?: { silent?: boolean }) => {
        if (!currentUser?.id) return;
        setRefreshing(true);
        try {
            const start = new Date();
            start.setDate(start.getDate() - 30);
            const end = new Date();
            end.setDate(end.getDate() + 60);
            const data = await getDoctorSchedule(currentUser.id, start, end);
            setScheduleData(data);
            if (!options?.silent) {
                toast.success('Schedule refreshed');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to refresh schedule');
        } finally {
            setRefreshing(false);
        }
    }, [currentUser?.id]);

    const handleTabChange = (value: string) => {
        if (activeTab === 'availability' && value === 'calendar' && isSettingsDirty) {
            const confirmClose = window.confirm(
                'You have unsaved availability changes. Are you sure you want to discard them?'
            );
            if (!confirmClose) return;
        }
        setActiveTab(value);
    };

    if (!currentUser) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Please log in to view schedule.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                {/* Header Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <TabsList className="bg-slate-100 p-1 rounded-none border border-slate-200 h-10">
                        <TabsTrigger 
                            value="calendar" 
                            className="rounded-none px-4 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm flex items-center gap-1.5"
                        >
                            <Calendar className="h-3.5 w-3.5" />
                            Calendar View
                        </TabsTrigger>
                        <TabsTrigger 
                            value="availability" 
                            className="rounded-none px-4 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm flex items-center gap-1.5"
                        >
                            <Clock className="h-3.5 w-3.5" />
                            Weekly Availability
                            {isSettingsDirty && (
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse ml-0.5" />
                            )}
                        </TabsTrigger>
                    </TabsList>
                    
                    <div className="flex items-center gap-2">
                        {activeTab === 'calendar' && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refreshSchedule()}
                                disabled={refreshing}
                                className="h-8 rounded-none border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs"
                            >
                                <RefreshCw className={refreshing ? 'h-3.5 w-3.5 mr-1.5 animate-spin' : 'h-3.5 w-3.5 mr-1.5'} />
                                Refresh Calendar
                            </Button>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                <TabsContent value="calendar" className="mt-4 outline-none focus:outline-none">
                    <ScheduleCalendarView
                        appointments={scheduleData?.appointments || []}
                        calendarEvents={scheduleData?.calendarEvents || []}
                        workingDays={scheduleData?.workingDays || []}
                        blocks={scheduleData?.blocks || []}
                        overrides={scheduleData?.overrides || []}
                        onSetupScheduleClick={() => setActiveTab('availability')}
                    />
                </TabsContent>

                <TabsContent value="availability" className="mt-4 outline-none focus:outline-none">
                    <div className="border border-slate-200 bg-white shadow-sm p-6 md:p-8">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Configure Availability & Slot Rules</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Set up your recurring weekly working hours, slot intervals, and buffer periods.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-none text-xs"
                                onClick={() => handleTabChange('calendar')}
                            >
                                Back to Calendar
                            </Button>
                        </div>

                        <AvailabilitySettingsPanel
                            initialWorkingDays={scheduleData?.workingDays || []}
                            initialSlotConfig={scheduleData?.slotConfig || null}
                            userId={currentUser.id}
                            onSaved={() => {
                                setIsSettingsDirty(false);
                                refreshSchedule({ silent: true });
                                toast.success('Availability settings saved successfully!');
                                setActiveTab('calendar');
                            }}
                            onDirtyChange={setIsSettingsDirty}
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
