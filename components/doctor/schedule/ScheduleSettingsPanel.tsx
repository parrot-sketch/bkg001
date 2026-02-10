'use client';

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Undo, Clock, Briefcase, Stethoscope, Scissors, Sun, Moon, Sunset, Star, CalendarDays, Info } from 'lucide-react';
import { updateAvailability } from '@/app/actions/schedule';
import { Calendar, Views } from 'react-big-calendar';
import { format } from 'date-fns';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { SlotEditorDialog, SlotData } from './SlotEditorDialog';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/styles/schedule-calendar.css';
import { cn } from '@/lib/utils';
import { calendarLocalizer } from '@/lib/calendar';

const DnDCalendar = withDragAndDrop<AvailabilitySlot>(Calendar);

// ── Fixed Base Date for Template (Jan 2, 2000 is a Sunday) ──
const BASE_DATE = new Date(2000, 0, 2);
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Slot Type Config ──
const SLOT_TYPE_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
    CLINIC: { color: '#059669', icon: Stethoscope, label: 'Clinic' },
    SURGERY: { color: '#3b82f6', icon: Scissors, label: 'Surgery' },
    ADMIN: { color: '#6b7280', icon: Briefcase, label: 'Admin' },
};

interface AvailabilitySlot {
    id: string;
    title: string;
    start: Date;
    end: Date;
    type: string;
}

interface ScheduleSettingsPanelProps {
    initialWorkingDays?: { dayOfWeek: number; startTime: string; endTime: string; type?: string }[];
    userId: string;
}

export function ScheduleSettingsPanel({ initialWorkingDays = [], userId }: ScheduleSettingsPanelProps) {
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogSlot, setDialogSlot] = useState<SlotData | null>(null);

    // Transform initial working days to calendar events on the template week
    const [events, setEvents] = useState<AvailabilitySlot[]>(() => {
        return initialWorkingDays.map((slot, idx) => {
            const dayOffset = slot.dayOfWeek;
            const date = new Date(BASE_DATE);
            date.setDate(BASE_DATE.getDate() + dayOffset);

            const [startH, startM] = slot.startTime.split(':').map(Number);
            const [endH, endM] = slot.endTime.split(':').map(Number);

            const start = new Date(date);
            start.setHours(startH, startM, 0, 0);

            const end = new Date(date);
            end.setHours(endH, endM, 0, 0);

            return {
                id: `init-${idx}`,
                title: slot.type || 'CLINIC',
                start,
                end,
                type: slot.type || 'CLINIC'
            };
        });
    });

    // Track changes
    const markChanged = useCallback(() => setHasChanges(true), []);

    const onEventResize = useCallback(({ event, start, end }: any) => {
        setEvents((prev) => prev.map((ev) => (ev.id === event.id ? { ...ev, start, end } : ev)));
        markChanged();
    }, [markChanged]);

    const onEventDrop = useCallback(({ event, start, end }: any) => {
        setEvents((prev) => prev.map((ev) => (ev.id === event.id ? { ...ev, start, end } : ev)));
        markChanged();
    }, [markChanged]);

    // Open Dialog for NEW slot
    const handleSelectSlot = useCallback(({ start, end }: any) => {
        setDialogSlot({ start, end, type: 'CLINIC' });
        setIsDialogOpen(true);
    }, []);

    // Open Dialog for EXISTING slot
    const handleSelectEvent = useCallback((event: AvailabilitySlot) => {
        setDialogSlot({ id: event.id, start: event.start, end: event.end, type: event.type });
        setIsDialogOpen(true);
    }, []);

    const handleSaveSlot = (slotData: SlotData) => {
        if (slotData.id) {
            setEvents((prev) => prev.map(e => e.id === slotData.id ? {
                ...e, start: slotData.start, end: slotData.end, type: slotData.type, title: slotData.type
            } : e));
        } else {
            const newEvent: AvailabilitySlot = {
                id: Math.random().toString(36).substr(2, 9),
                title: slotData.type,
                start: slotData.start,
                end: slotData.end,
                type: slotData.type
            };
            setEvents((prev) => [...prev, newEvent]);
        }
        markChanged();
    };

    const handleDeleteSlot = (id: string) => {
        setEvents((prev) => prev.filter((e) => e.id !== id));
        markChanged();
    };

    // Save to server
    const handleSave = async () => {
        try {
            setSaving(true);

            const slots = events.map(event => ({
                dayOfWeek: event.start.getDay(),
                startTime: format(event.start, 'HH:mm'),
                endTime: format(event.end, 'HH:mm'),
                type: event.type
            }));

            const result = await updateAvailability({
                doctorId: userId,
                templateName: 'Standard Week',
                slots
            });

            if (result.success) {
                toast.success('Weekly schedule saved successfully');
                setHasChanges(false);
            } else {
                toast.error('Failed to save schedule');
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    // Quick presets
    type PresetKey = 'business' | 'morning' | 'afternoon' | 'evening' | 'night' | 'night_7d' | 'split' | 'full_week' | 'weekend_only';

    const PRESET_CONFIG: Record<PresetKey, {
        label: string;
        days: number[];       // 0=Sun..6=Sat
        blocks: { start: number; end: number; type: string }[];
    }> = {
        business:     { label: '9 am – 5 pm Mon–Fri',                 days: [1,2,3,4,5], blocks: [{ start: 9,  end: 17, type: 'CLINIC' }] },
        morning:      { label: '7 am – 1 pm Mon–Fri',                 days: [1,2,3,4,5], blocks: [{ start: 7,  end: 13, type: 'CLINIC' }] },
        afternoon:    { label: '1 pm – 7 pm Mon–Fri',                 days: [1,2,3,4,5], blocks: [{ start: 13, end: 19, type: 'CLINIC' }] },
        evening:      { label: '5 pm – 10 pm Mon–Fri',                days: [1,2,3,4,5], blocks: [{ start: 17, end: 22, type: 'CLINIC' }] },
        night:        { label: '8 pm – 6 am Mon–Fri (Night Shift)',    days: [1,2,3,4,5], blocks: [{ start: 20, end: 23, type: 'CLINIC' }, { start: 0, end: 6, type: 'CLINIC' }] },
        night_7d:     { label: '8 pm – 6 am 7 days (Night Shift)',    days: [0,1,2,3,4,5,6], blocks: [{ start: 20, end: 23, type: 'CLINIC' }, { start: 0, end: 6, type: 'CLINIC' }] },
        split:        { label: '8 am – 12 pm + 4 pm – 8 pm Mon–Fri',  days: [1,2,3,4,5], blocks: [{ start: 8, end: 12, type: 'CLINIC' }, { start: 16, end: 20, type: 'CLINIC' }] },
        full_week:    { label: '9 am – 5 pm 7 days',                  days: [0,1,2,3,4,5,6], blocks: [{ start: 9, end: 17, type: 'CLINIC' }] },
        weekend_only: { label: '9 am – 3 pm Sat & Sun',               days: [0,6],       blocks: [{ start: 9, end: 15, type: 'CLINIC' }] },
    };

    const applyPreset = (preset: PresetKey) => {
        const config = PRESET_CONFIG[preset];
        if (!confirm(`Replace all current slots with ${config.label}?`)) return;

        const newEvents: AvailabilitySlot[] = [];
        let counter = 0;
        for (const dayOfWeek of config.days) {
            const date = new Date(BASE_DATE);
            date.setDate(BASE_DATE.getDate() + dayOfWeek);

            for (const block of config.blocks) {
                counter++;
                const start = new Date(date);
                start.setHours(block.start, 0, 0, 0);

                // If end <= start (overnight), clamp to midnight end of that day
                const endHour = block.end <= block.start ? 23 : block.end;
                const endMin  = block.end <= block.start ? 59 : 0;

                const end = new Date(date);
                end.setHours(endHour, endMin, 0, 0);

                newEvents.push({
                    id: `preset-${counter}`,
                    title: block.type,
                    start,
                    end,
                    type: block.type,
                });
            }
        }
        setEvents(newEvents);
        markChanged();
    };

    // Event styling
    const eventStyleGetter = useCallback((event: AvailabilitySlot) => {
        const config = SLOT_TYPE_CONFIG[event.type] || SLOT_TYPE_CONFIG.CLINIC;
        return {
            style: {
                backgroundColor: config.color,
                borderRadius: '4px',
                opacity: 0.85,
                color: 'white',
                border: 'none',
                fontSize: '0.75rem',
                padding: '2px 6px',
                cursor: 'pointer',
            },
        };
    }, []);

    // Summary data
    const weekSummary = useMemo(() => {
        const summary: Record<number, { slots: AvailabilitySlot[]; totalMinutes: number }> = {};
        for (let i = 0; i < 7; i++) {
            summary[i] = { slots: [], totalMinutes: 0 };
        }
        for (const ev of events) {
            const day = ev.start.getDay();
            summary[day].slots.push(ev);
            summary[day].totalMinutes += (ev.end.getTime() - ev.start.getTime()) / 60000;
        }
        return summary;
    }, [events]);

    const totalWeeklyHours = useMemo(() => {
        return Object.values(weekSummary).reduce((acc, day) => acc + day.totalMinutes, 0) / 60;
    }, [weekSummary]);

    // Custom event component for template
    const TemplateEventComponent = useCallback(({ event }: { event: AvailabilitySlot }) => {
        const config = SLOT_TYPE_CONFIG[event.type] || SLOT_TYPE_CONFIG.CLINIC;
        const Icon = config.icon;
        return (
            <div className="flex items-center gap-1 overflow-hidden">
                <Icon className="h-3 w-3 flex-shrink-0" />
                <span className="text-[0.7rem] font-medium truncate">{config.label}</span>
            </div>
        );
    }, []);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* ── Left: Calendar Editor ── */}
            <div className="lg:col-span-2 flex flex-col gap-4">
                {/* Info Banner */}
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-3">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            Weekly Recurring Schedule
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                            This defines your repeating weekly pattern. Click a time slot to add availability,
                            drag to move or resize. Changes are saved when you click "Save Changes".
                        </p>
                    </div>
                </div>

                <Card className="flex-1 shadow-sm">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base">Weekly Template</CardTitle>
                            <CardDescription className="text-xs">
                                Click and drag on the calendar to create availability windows
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                            {Object.entries(SLOT_TYPE_CONFIG).map(([key, config]) => {
                                const Icon = config.icon;
                                return (
                                    <div key={key} className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: config.color }} />
                                        <span className="text-[0.65rem] text-muted-foreground font-medium">
                                            {config.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 min-h-[520px] relative">
                        <div className="schedule-template-calendar h-[520px]">
                            <DnDCalendar
                                localizer={calendarLocalizer}
                                events={events}
                                defaultView={Views.WEEK}
                                views={[Views.WEEK]}
                                defaultDate={BASE_DATE}
                                toolbar={false}
                                onEventDrop={onEventDrop}
                                onEventResize={onEventResize}
                                onSelectSlot={handleSelectSlot}
                                onSelectEvent={handleSelectEvent}
                                eventPropGetter={eventStyleGetter}
                                components={{
                                    event: TemplateEventComponent,
                                }}
                                formats={{
                                    // KEY FIX: Show only day names, not "Mon 01/03"
                                    dayFormat: (date: Date) => DAY_NAMES_SHORT[date.getDay()],
                                    dayHeaderFormat: (date: Date) => DAY_NAMES[date.getDay()],
                                }}
                                resizable
                                selectable
                                step={30}
                                timeslots={2}
                                min={new Date(2000, 0, 1, 6, 0, 0)}
                                max={new Date(2000, 0, 1, 22, 0, 0)}
                                date={BASE_DATE}
                                onNavigate={() => { }}
                                style={{ height: '100%' }}
                                dayPropGetter={() => ({
                                    className: 'bg-background',
                                })}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Right: Actions & Summary ── */}
            <div className="flex flex-col gap-4">
                {/* Save */}
                <Card className="shadow-sm">
                    <CardContent className="p-4">
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className={cn(
                                "w-full",
                                hasChanges && !saving && "bg-primary animate-pulse"
                            )}
                            size="lg"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    {hasChanges ? 'Save Changes *' : 'Save Changes'}
                                </>
                            )}
                        </Button>
                        {hasChanges && (
                            <p className="text-[0.65rem] text-amber-600 text-center mt-2">
                                You have unsaved changes
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Presets */}
                <Card className="shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm">Quick Presets</CardTitle>
                        <CardDescription className="text-[0.65rem] text-muted-foreground">
                            Click a preset to replace all current slots
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 px-4 pb-4">
                        {/* ── Day Shifts ── */}
                        <div>
                            <p className="text-[0.6rem] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Day Shifts</p>
                            <div className="space-y-1">
                                <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8" onClick={() => applyPreset('business')}>
                                    <Briefcase className="mr-2 h-3 w-3 text-blue-600" />
                                    Standard 9 am – 5 pm Mon–Fri
                                </Button>
                                <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8" onClick={() => applyPreset('morning')}>
                                    <Sun className="mr-2 h-3 w-3 text-amber-500" />
                                    Morning 7 am – 1 pm Mon–Fri
                                </Button>
                                <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8" onClick={() => applyPreset('afternoon')}>
                                    <Sunset className="mr-2 h-3 w-3 text-orange-500" />
                                    Afternoon 1 pm – 7 pm Mon–Fri
                                </Button>
                            </div>
                        </div>

                        {/* ── Evening & Night Shifts ── */}
                        <div>
                            <p className="text-[0.6rem] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Evening & Night</p>
                            <div className="space-y-1">
                                <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8" onClick={() => applyPreset('evening')}>
                                    <Moon className="mr-2 h-3 w-3 text-indigo-500" />
                                    Evening 5 pm – 10 pm Mon–Fri
                                </Button>
                                <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8" onClick={() => applyPreset('night')}>
                                    <Star className="mr-2 h-3 w-3 text-violet-500" />
                                    Night 8 pm – 6 am Mon–Fri
                                </Button>
                                <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8" onClick={() => applyPreset('night_7d')}>
                                    <Star className="mr-2 h-3 w-3 text-purple-500" />
                                    Night 8 pm – 6 am 7 days
                                </Button>
                            </div>
                        </div>

                        {/* ── Split & Extended ── */}
                        <div>
                            <p className="text-[0.6rem] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Split & Extended</p>
                            <div className="space-y-1">
                                <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8" onClick={() => applyPreset('split')}>
                                    <Clock className="mr-2 h-3 w-3 text-teal-600" />
                                    Split 8–12 pm + 4–8 pm Mon–Fri
                                </Button>
                                <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8" onClick={() => applyPreset('full_week')}>
                                    <CalendarDays className="mr-2 h-3 w-3 text-emerald-600" />
                                    Full Week 9 am – 5 pm 7 days
                                </Button>
                                <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8" onClick={() => applyPreset('weekend_only')}>
                                    <Sun className="mr-2 h-3 w-3 text-rose-500" />
                                    Weekend Only 9 am – 3 pm Sat & Sun
                                </Button>
                            </div>
                        </div>

                        {/* ── Clear ── */}
                        <div className="pt-1 border-t border-dashed border-slate-200">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start text-xs h-8 text-destructive hover:bg-destructive/10 border-destructive/30"
                                onClick={() => {
                                    if (confirm('Clear all availability slots?')) {
                                        setEvents([]);
                                        markChanged();
                                    }
                                }}
                            >
                                <Undo className="mr-2 h-3 w-3" />
                                Clear All Slots
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Weekly Summary */}
                <Card className="shadow-sm flex-1">
                    <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Weekly Summary</CardTitle>
                            <Badge variant="secondary" className="text-[0.65rem] font-normal">
                                <Clock className="h-2.5 w-2.5 mr-1" />
                                {totalWeeklyHours.toFixed(1)}h / week
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="space-y-1">
                            {[1, 2, 3, 4, 5, 6, 0].map(day => {
                                const { slots, totalMinutes } = weekSummary[day];
                                const hours = Math.floor(totalMinutes / 60);
                                const mins = totalMinutes % 60;

                                return (
                                    <div
                                        key={day}
                                        className={cn(
                                            "flex items-center justify-between py-1.5 px-2 rounded-md transition-colors",
                                            slots.length > 0 ? "bg-muted/40" : "opacity-50"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium w-8">
                                                {DAY_NAMES_SHORT[day]}
                                            </span>
                                            {slots.length > 0 ? (
                                                <div className="flex flex-col gap-0.5">
                                                    {slots
                                                        .sort((a, b) => a.start.getTime() - b.start.getTime())
                                                        .map(ev => {
                                                            const config = SLOT_TYPE_CONFIG[ev.type] || SLOT_TYPE_CONFIG.CLINIC;
                                                            return (
                                                                <span key={ev.id} className="text-[0.65rem] text-muted-foreground">
                                                                    {format(ev.start, 'h:mm a')} – {format(ev.end, 'h:mm a')}
                                                                    <span
                                                                        className="ml-1.5 inline-block px-1 py-0 rounded text-[0.55rem] text-white"
                                                                        style={{ backgroundColor: config.color }}
                                                                    >
                                                                        {config.label}
                                                                    </span>
                                                                </span>
                                                            );
                                                        })}
                                                </div>
                                            ) : (
                                                <span className="text-[0.65rem] text-muted-foreground italic">Off</span>
                                            )}
                                        </div>
                                        {slots.length > 0 && (
                                            <span className="text-[0.6rem] text-muted-foreground tabular-nums">
                                                {hours > 0 ? `${hours}h` : ''}{mins > 0 ? `${mins}m` : ''}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <SlotEditorDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSave={handleSaveSlot}
                onDelete={handleDeleteSlot}
                initialData={dialogSlot}
            />
        </div>
    );
}
