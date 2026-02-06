'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Save, Undo, Info } from 'lucide-react';
import { updateAvailability } from '@/app/actions/schedule';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { SlotEditorDialog, SlotData } from './SlotEditorDialog';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Setup Localizer
const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

const DnDCalendar = withDragAndDrop<AvailabilitySlot>(Calendar);

interface AvailabilitySlot {
    id: string; // Temporary ID for UI
    title: string;
    start: Date;
    end: Date;
    type: string;
}

interface ScheduleSettingsPanelProps {
    // We receive "workingDays" from the server which now are just simple DTO objects
    initialWorkingDays?: { dayOfWeek: number; startTime: string; endTime: string; type?: string }[];
}

export function ScheduleSettingsPanel({ initialWorkingDays = [] }: ScheduleSettingsPanelProps) {
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogSlot, setDialogSlot] = useState<SlotData | null>(null);

    // Transform initial props to Calendar Events (on a generic week)
    // We use a fixed week (e.g., first week of Jan 2000) to represent the "Template Week"
    const BASE_DATE = new Date(2000, 0, 2); // Jan 2, 2000 is a Sunday

    const [events, setEvents] = useState<AvailabilitySlot[]>(() => {
        return initialWorkingDays.map((slot, idx) => {
            const dayOffset = slot.dayOfWeek; // 0=Sun, 1=Mon...
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
                title: slot.type || 'Available',
                start,
                end,
                type: slot.type || 'CLINIC'
            };
        });
    });

    const onEventResize = useCallback(({ event, start, end }: any) => {
        setEvents((prev) => {
            const existing = prev.find((ev) => ev.id === event.id);
            if (!existing) return prev;
            return prev.map((ev) => (ev.id === event.id ? { ...ev, start, end } : ev));
        });
    }, []);

    const onEventDrop = useCallback(({ event, start, end }: any) => {
        setEvents((prev) => {
            const existing = prev.find((ev) => ev.id === event.id);
            if (!existing) return prev;
            return prev.map((ev) => (ev.id === event.id ? { ...ev, start, end } : ev));
        });
    }, []);

    // Open Dialog for NEW slot
    const handleSelectSlot = useCallback(({ start, end }: any) => {
        setDialogSlot({
            start,
            end,
            type: 'CLINIC'
        });
        setIsDialogOpen(true);
    }, []);

    // Open Dialog for EXISTING slot
    const handleSelectEvent = useCallback((event: AvailabilitySlot) => {
        setDialogSlot({
            id: event.id,
            start: event.start,
            end: event.end,
            type: event.type
        });
        setIsDialogOpen(true);
    }, []);

    const handleSaveSlot = (slotData: SlotData) => {
        if (slotData.id) {
            // Update existing
            setEvents((prev) => prev.map(e => e.id === slotData.id ? {
                ...e,
                start: slotData.start,
                end: slotData.end,
                type: slotData.type,
                title: slotData.type // Simplified title
            } : e));
        } else {
            // Create new
            const newEvent: AvailabilitySlot = {
                id: Math.random().toString(36).substr(2, 9),
                title: slotData.type,
                start: slotData.start,
                end: slotData.end,
                type: slotData.type
            };
            setEvents((prev) => [...prev, newEvent]);
        }
    };

    const handleDeleteSlot = (id: string) => {
        setEvents((prev) => prev.filter((e) => e.id !== id));
    };

    const handleSave = async () => {
        if (!user) return;

        try {
            setSaving(true);

            // Transform Events back to DTO
            const slots = events.map(event => {
                const dayOfWeek = event.start.getDay(); // 0-6
                const startTime = format(event.start, 'HH:mm');
                const endTime = format(event.end, 'HH:mm');
                return {
                    dayOfWeek,
                    startTime,
                    endTime,
                    type: event.type
                };
            });

            const result = await updateAvailability({
                doctorId: user.id,
                templateName: 'Standard Week', // Defaulting for now
                slots
            });

            if (result.success) {
                toast.success('Weekly schedule updated successfully');
            } else {
                toast.error('Failed to update schedule');
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    // Quick Actions
    const applyBusinessHours = () => {
        if (!confirm('This will replace all current slots with 9am-5pm Mon-Fri. Continue?')) return;

        const newEvents: AvailabilitySlot[] = [];
        // Mon (1) to Fri (5)
        for (let i = 1; i <= 5; i++) {
            const date = new Date(BASE_DATE);
            date.setDate(BASE_DATE.getDate() + i); // Calculate date for that day

            const start = new Date(date);
            start.setHours(9, 0, 0, 0);

            const end = new Date(date);
            end.setHours(17, 0, 0, 0);

            newEvents.push({
                id: `auto-${i}`,
                title: 'CLINIC',
                start,
                end,
                type: 'CLINIC'
            });
        }
        setEvents(newEvents);
    };

    const eventStyleGetter = (event: AvailabilitySlot) => {
        let backgroundColor = '#22c55e'; // default green (Clinic)
        if (event.type === 'SURGERY') backgroundColor = '#3b82f6'; // Blue
        if (event.type === 'ADMIN') backgroundColor = '#6b7280'; // Gray

        return {
            style: {
                backgroundColor,
                borderRadius: '4px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block',
            },
        };
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Left Column: Calendar Editor */}
            <div className="lg:col-span-2 flex flex-col h-full space-y-4">
                <Card className="flex-1 flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle>Weekly Template Editor</CardTitle>
                            <CardDescription>
                                Click time slots to add availability. Drag to move or resize.
                            </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="flex items-center gap-2 mr-4 text-xs">
                                <span className="flex items-center"><div className="w-3 h-3 bg-green-500 rounded mr-1"></div> Clinic</span>
                                <span className="flex items-center"><div className="w-3 h-3 bg-blue-500 rounded mr-1"></div> Surgery</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-[500px] p-0 relative">
                        <DnDCalendar
                            localizer={localizer}
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
                            resizable
                            selectable
                            step={30}
                            timeslots={2}
                            min={new Date(2000, 0, 1, 6, 0, 0)}
                            max={new Date(2000, 0, 1, 22, 0, 0)}
                            date={BASE_DATE}
                            onNavigate={() => { }}
                            dayPropGetter={(date: Date) => ({
                                className: 'bg-background hover:bg-muted/5 transition-colors',
                            })}
                        />
                        <div className="absolute bottom-4 right-4 bg-background/90 p-2 rounded border shadow-sm text-xs text-muted-foreground">
                            Double check that your slots don't overlap.
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Right Column: Summary & Actions */}
            <div className="flex flex-col space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button variant="outline" className="w-full justify-start" onClick={applyBusinessHours}>
                            Apply 9-5 Mon-Fri
                        </Button>
                        <Button variant="outline" className="w-full justify-start text-destructive hover:bg-destructive/10" onClick={() => {
                            if (confirm('Clear all slots?')) setEvents([]);
                        }}>
                            <Undo className="mr-2 h-4 w-4" />
                            Clear All
                        </Button>
                        <div className="pt-4">
                            <Button onClick={handleSave} disabled={saving} className="w-full">
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex-1">
                    <CardHeader>
                        <CardTitle>Configured Hours</CardTitle>
                        <CardDescription>Summary of your weekly recurring schedule</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[0, 1, 2, 3, 4, 5, 6].map(day => {
                            const dayEvents = events.filter(e => e.start.getDay() === day).sort((a, b) => a.start.getTime() - b.start.getTime());
                            const dayName = format(new Date(2000, 0, 2 + day), 'EEEE');

                            return (
                                <div key={day} className="border-b last:border-0 pb-2 last:pb-0">
                                    <div className="font-medium text-sm mb-1">{dayName}</div>
                                    {dayEvents.length === 0 ? (
                                        <div className="text-xs text-muted-foreground italic">No availability</div>
                                    ) : (
                                        <div className="space-y-1">
                                            {dayEvents.map(ev => (
                                                <div key={ev.id} className="text-xs flex items-center justify-between bg-muted/30 p-1 rounded">
                                                    <span>{format(ev.start, 'HH:mm')} - {format(ev.end, 'HH:mm')}</span>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded text-white ${ev.type === 'SURGERY' ? 'bg-blue-500' : 'bg-green-500'}`}>
                                                        {ev.type}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
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
