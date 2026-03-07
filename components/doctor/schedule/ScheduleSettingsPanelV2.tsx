/**
 * ScheduleSettingsPanelV2 Component
 *
 * Redesigned for clarity: flat layout, doctor-friendly language,
 * preset-first, all actions inline with no redundant explanatory prose.
 */

'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Loader2, Save, Undo2, Redo2, Trash2, Copy, Calendar,
    Clock, Timer, Pause, Briefcase, Sun, Moon, Stethoscope,
    CheckCircle2, ChevronDown, Info
} from 'lucide-react';
import { updateAvailability, updateSlotConfiguration } from '@/app/actions/schedule';
import { SlotEditorDialog, SlotData } from './SlotEditorDialog';
import { useUndoRedo } from './useUndoRedo';
import { useSlotConfiguration } from './hooks/useSlotConfiguration';
import { WeeklyTemplateEditor } from './components/WeeklyTemplateEditor';
import { applyPresetToEvents } from './components/SchedulePresets';
import { CalendarAvailabilitySlot, WorkingDay, SlotType } from '@/domain/types/schedule';
import { mapWorkingDaysToCalendar, mapCalendarToWorkingDay } from '@/infrastructure/mappers/ScheduleMapper';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import type { SlotConfiguration } from '@/lib/validation/slotConfigValidation';
import { SLOT_TYPE_CONFIG, DAY_NAMES_SHORT } from './constants';

interface ScheduleSettingsPanelProps {
    initialWorkingDays?: WorkingDay[];
    initialSlotConfig?: SlotConfiguration | null;
    userId: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── Preset definitions ─────────────────────────────────────────────────────
const PRESETS = [
    { key: 'business' as const, icon: Briefcase, label: 'Standard Hours', sub: '9 AM – 5 PM · Mon–Fri', color: 'text-blue-600' },
    { key: 'morning' as const, icon: Sun, label: 'Morning Clinic', sub: '7 AM – 1 PM · Mon–Fri', color: 'text-amber-500' },
    { key: 'split' as const, icon: Clock, label: 'Split Shift', sub: '8–12 AM · 4–8 PM · Mon–Fri', color: 'text-teal-600' },
    { key: 'night' as const, icon: Moon, label: 'Evening Clinic', sub: '6 PM – 12 AM · Mon–Fri', color: 'text-indigo-600' },
];

// ─── Appointment Timing Section ──────────────────────────────────────────────
function TimingSection({
    config,
    onChange,
    saving,
    hasChanges,
    onSave,
}: {
    config: SlotConfiguration;
    onChange: (c: SlotConfiguration) => void;
    saving: boolean;
    hasChanges: boolean;
    onSave: () => void;
}) {
    const update = (partial: Partial<SlotConfiguration>) => onChange({ ...config, ...partial });

    // Preview: slots starting at 9 AM
    const slot1End = `${9 + Math.floor(config.defaultDuration / 60)}:${String(config.defaultDuration % 60).padStart(2, '0')}`;
    const slot2StartH = 9 + Math.floor(config.slotInterval / 60);
    const slot2StartM = config.slotInterval % 60;
    const slot2Start = `${slot2StartH}:${String(slot2StartM).padStart(2, '0')}`;

    return (
        <div className="space-y-6">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Appointment Timing</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Controls how bookings are spaced throughout your day
                    </p>
                </div>
                <Button
                    onClick={onSave}
                    disabled={saving || !hasChanges}
                    size="sm"
                    className={cn(
                        'min-w-[110px] transition-all',
                        hasChanges && !saving
                            ? 'bg-teal-600 hover:bg-teal-700 shadow-sm'
                            : 'opacity-50'
                    )}
                >
                    {saving ? (
                        <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving…</>
                    ) : (
                        <><Save className="mr-1.5 h-3.5 w-3.5" />{hasChanges ? 'Save' : 'Saved'}</>
                    )}
                </Button>
            </div>

            {/* Three sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Appointment Length */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            Appointment Length
                        </Label>
                        <span className="text-sm font-semibold tabular-nums text-foreground">
                            {config.defaultDuration} min
                        </span>
                    </div>
                    <Slider
                        value={[config.defaultDuration]}
                        onValueChange={([v]) => {
                            const minInterval = Math.ceil(v * 0.3);
                            if (config.slotInterval < minInterval) {
                                update({ defaultDuration: v, slotInterval: Math.max(minInterval, 10) });
                            } else {
                                update({ defaultDuration: v });
                            }
                        }}
                        min={15} max={120} step={5}
                    />
                    <div className="flex justify-between text-[0.65rem] text-muted-foreground">
                        <span>15 min</span><span>2 hr</span>
                    </div>
                    <p className="text-[0.65rem] text-muted-foreground">Length of each patient visit</p>
                </div>

                {/* New Slot Every */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                            <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                            New Slot Every
                        </Label>
                        <span className="text-sm font-semibold tabular-nums text-foreground">
                            {config.slotInterval} min
                        </span>
                    </div>
                    <Slider
                        value={[config.slotInterval]}
                        onValueChange={([v]) => {
                            const min = Math.max(5, Math.ceil(config.defaultDuration * 0.3));
                            update({ slotInterval: Math.max(v, min) });
                        }}
                        min={5} max={60} step={5}
                    />
                    <div className="flex justify-between text-[0.65rem] text-muted-foreground">
                        <span>5 min</span><span>60 min</span>
                    </div>
                    <p className="text-[0.65rem] text-muted-foreground">How often a new booking slot opens</p>
                </div>

                {/* Break Between Patients */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                            <Pause className="h-3.5 w-3.5 text-muted-foreground" />
                            Break Between Patients
                        </Label>
                        <span className="text-sm font-semibold tabular-nums text-foreground">
                            {config.bufferTime} min
                        </span>
                    </div>
                    <Slider
                        value={[config.bufferTime]}
                        onValueChange={([v]) => update({ bufferTime: v })}
                        min={0} max={30} step={5}
                    />
                    <div className="flex justify-between text-[0.65rem] text-muted-foreground">
                        <span>None</span><span>30 min</span>
                    </div>
                    <p className="text-[0.65rem] text-muted-foreground">Breathing room between appointments</p>
                </div>
            </div>

            {/* Live mini-preview */}
            <div className="flex items-center gap-3 rounded-lg bg-muted/40 border px-4 py-3 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <span>
                    Starting at 9:00 AM — Slot 1: <strong className="text-foreground">9:00 – {slot1End}</strong>,
                    {' '}Slot 2 opens at <strong className="text-foreground">{slot2Start}</strong>
                    {config.bufferTime > 0 && `, ${config.bufferTime} min break included`}
                </span>
            </div>
        </div>
    );
}

// ─── Weekly Summary strip ─────────────────────────────────────────────────────
function WeekStrip({ events }: { events: CalendarAvailabilitySlot[] }) {
    const summary: Record<number, CalendarAvailabilitySlot[]> = {};
    for (let i = 0; i < 7; i++) summary[i] = [];
    for (const ev of events) summary[ev.start.getDay()].push(ev);

    const totalHours = events.reduce((acc, ev) =>
        acc + (ev.end.getTime() - ev.start.getTime()) / 3600000, 0
    );

    return (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 rounded-lg border bg-muted/20 px-4 py-3">
            <div className="flex gap-2 flex-1 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 0].map(day => {
                    const slots = summary[day];
                    const hasSlots = slots.length > 0;
                    return (
                        <div key={day} className="flex flex-col items-center gap-1 min-w-[36px]">
                            <span className={cn(
                                'text-[0.65rem] font-bold uppercase',
                                hasSlots ? 'text-foreground' : 'text-muted-foreground/50'
                            )}>
                                {DAY_NAMES_SHORT[day]}
                            </span>
                            <div className={cn(
                                'w-7 h-7 rounded-md flex items-center justify-center text-[0.6rem] font-semibold',
                                hasSlots
                                    ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                                    : 'bg-muted/40 text-muted-foreground/40 border border-transparent'
                            )}>
                                {hasSlots ? `${slots.length}` : '–'}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="text-right">
                <p className="text-sm font-semibold text-foreground tabular-nums">{totalHours.toFixed(1)}h</p>
                <p className="text-[0.65rem] text-muted-foreground">per week</p>
            </div>
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export function ScheduleSettingsPanelV2({
    initialWorkingDays = [],
    initialSlotConfig,
    userId,
}: ScheduleSettingsPanelProps) {
    const [saving, setSaving] = useState(false);
    const [savingConfig, setSavingConfig] = useState(false);

    const slotConfig = useSlotConfiguration({ initialConfig: initialSlotConfig });

    const { state: events, setState: setEvents, undo, redo, canUndo, canRedo } =
        useUndoRedo<CalendarAvailabilitySlot[]>(mapWorkingDaysToCalendar(initialWorkingDays));

    // Dialog state
    const [isSlotDialogOpen, setIsSlotDialogOpen] = useState(false);
    const [dialogSlot, setDialogSlot] = useState<SlotData | null>(null);

    // Bulk dialogs
    const [copyDialogOpen, setCopyDialogOpen] = useState(false);
    const [weekdaysDialogOpen, setWeekdaysDialogOpen] = useState(false);
    const [selectedSourceDay, setSelectedSourceDay] = useState<number | null>(null);
    const [selectedTargetDays, setSelectedTargetDays] = useState<number[]>([]);
    const [wdStart, setWdStart] = useState('09:00');
    const [wdEnd, setWdEnd] = useState('17:00');
    const [wdType, setWdType] = useState<'CLINIC' | 'SURGERY' | 'ADMIN'>('CLINIC');

    // ── Slot handlers ──────────────────────────────────────────────────────
    const onEventResize = useCallback((event: CalendarAvailabilitySlot, start: Date, end: Date) => {
        setEvents(events.map(ev => ev.id === event.id ? { ...ev, start, end } : ev));
    }, [events, setEvents]);

    const onEventDrop = useCallback((event: CalendarAvailabilitySlot, start: Date, end: Date) => {
        setEvents(events.map(ev => ev.id === event.id ? { ...ev, start, end } : ev));
    }, [events, setEvents]);

    const handleSelectSlot = useCallback((start: Date, end: Date) => {
        setDialogSlot({ start, end, type: 'CLINIC' });
        setIsSlotDialogOpen(true);
    }, []);

    const handleSelectEvent = useCallback((event: CalendarAvailabilitySlot) => {
        setDialogSlot({ id: event.id, start: event.start, end: event.end, type: event.type });
        setIsSlotDialogOpen(true);
    }, []);

    const handleSaveSlot = useCallback((slotData: SlotData) => {
        if (slotData.id) {
            setEvents(events.map(e =>
                e.id === slotData.id
                    ? { ...e, start: slotData.start, end: slotData.end, type: slotData.type as SlotType, title: slotData.type }
                    : e
            ));
        } else {
            setEvents([...events, {
                id: Math.random().toString(36).substr(2, 9),
                title: slotData.type,
                start: slotData.start,
                end: slotData.end,
                type: slotData.type as SlotType,
            }]);
        }
    }, [events, setEvents]);

    const handleDeleteSlot = useCallback((id: string) => {
        setEvents(events.filter(e => e.id !== id));
    }, [events, setEvents]);

    // ── Bulk operations ────────────────────────────────────────────────────
    const handleCopyDay = () => {
        if (selectedSourceDay === null || selectedTargetDays.length === 0) return;
        const sourceSlots = events.filter(e => e.start.getDay() === selectedSourceDay);
        if (sourceSlots.length === 0) { toast.error('No slots on the selected day'); return; }

        const newEvents = [...events];
        selectedTargetDays.forEach(targetDay => {
            const filtered = newEvents.filter(e => e.start.getDay() !== targetDay);
            sourceSlots.forEach(slot => {
                const date = new Date(2000, 0, 2);
                date.setDate(date.getDate() + targetDay);
                const timeDiff = slot.end.getTime() - slot.start.getTime();
                const newStart = new Date(date);
                newStart.setHours(slot.start.getHours(), slot.start.getMinutes(), 0, 0);
                filtered.push({ ...slot, id: Math.random().toString(36).substr(2, 9), start: newStart, end: new Date(newStart.getTime() + timeDiff) });
            });
            newEvents.length = 0;
            newEvents.push(...filtered);
        });
        setEvents(newEvents);
        toast.success(`Copied to ${selectedTargetDays.length} day${selectedTargetDays.length > 1 ? 's' : ''}`);
        setCopyDialogOpen(false);
    };

    const handleSetWeekdays = () => {
        const [sh, sm] = wdStart.split(':').map(Number);
        const [eh, em] = wdEnd.split(':').map(Number);
        if (sh * 60 + sm >= eh * 60 + em) { toast.error('End time must be after start'); return; }

        const weekdays = [1, 2, 3, 4, 5];
        const newEvents = events.filter(e => !weekdays.includes(e.start.getDay()));
        weekdays.forEach(day => {
            const date = new Date(2000, 0, 2);
            date.setDate(date.getDate() + day);
            const start = new Date(date); start.setHours(sh, sm, 0, 0);
            const end = new Date(date); end.setHours(eh, em, 0, 0);
            newEvents.push({ id: Math.random().toString(36).substr(2, 9), title: wdType, start, end, type: wdType as SlotType });
        });
        setEvents(newEvents);
        toast.success(`Set Mon–Fri to ${wdStart} – ${wdEnd}`);
        setWeekdaysDialogOpen(false);
    };

    // ── Save handlers ──────────────────────────────────────────────────────
    const handleSave = async () => {
        try {
            setSaving(true);
            const workingDays: WorkingDay[] = events.map(mapCalendarToWorkingDay);
            const result = await updateAvailability({
                doctorId: userId,
                templateName: 'Standard Week',
                slots: workingDays.map(wd => ({ dayOfWeek: wd.dayOfWeek, startTime: wd.startTime, endTime: wd.endTime, type: wd.type })),
            });
            if (result.success) toast.success('Availability saved');
            else toast.error('Failed to save');
        } catch { toast.error('An error occurred'); }
        finally { setSaving(false); }
    };

    const handleSaveSlotConfig = async () => {
        try {
            setSavingConfig(true);
            const { validateSlotConfig } = await import('@/lib/validation/slotConfigValidation');
            const validation = validateSlotConfig(slotConfig.config);
            const errs = validation.issues.filter(i => i.severity === 'error');
            if (errs.length > 0) { toast.error(errs[0].message); return; }

            const result = await updateSlotConfiguration({
                doctorId: userId,
                defaultDuration: slotConfig.config.defaultDuration,
                slotInterval: slotConfig.config.slotInterval,
                bufferTime: slotConfig.config.bufferTime,
            });
            if (result.success) toast.success('Timing settings saved');
            else toast.error('Failed to save');
        } catch (e: any) { toast.error(e?.message || 'An error occurred'); }
        finally { setSavingConfig(false); }
    };

    const initialEvents = mapWorkingDaysToCalendar(initialWorkingDays);
    const hasChanges = JSON.stringify(events) !== JSON.stringify(initialEvents);

    return (
        <div className="space-y-8">

            {/* ── Section 1: Availability Calendar ── */}
            <div className="space-y-4">
                {/* Section header with all actions inline */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold text-foreground">When Are You Available?</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Drag on the calendar below to add time blocks, or use Quick Fill to set a week at once.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Undo / Redo */}
                        <div className="flex items-center border rounded-md overflow-hidden">
                            <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 rounded-none"
                                onClick={undo} disabled={!canUndo}
                                title="Undo"
                            >
                                <Undo2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 rounded-none border-l"
                                onClick={redo} disabled={!canRedo}
                                title="Redo"
                            >
                                <Redo2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>

                        {/* Quick Fill dropdown trigger */}
                        <Button
                            variant="outline" size="sm"
                            onClick={() => setWeekdaysDialogOpen(true)}
                            className="h-8 text-xs"
                        >
                            <Calendar className="h-3.5 w-3.5 mr-1.5" />
                            Quick Fill Week
                        </Button>

                        {/* Copy day */}
                        <Button
                            variant="outline" size="sm"
                            onClick={() => { setSelectedSourceDay(null); setSelectedTargetDays([]); setCopyDialogOpen(true); }}
                            className="h-8 text-xs"
                        >
                            <Copy className="h-3.5 w-3.5 mr-1.5" />
                            Copy Day
                        </Button>

                        {/* Clear */}
                        <Button
                            variant="ghost" size="sm"
                            className="h-8 text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => { if (confirm('Clear all availability slots?')) { setEvents([]); toast.success('Cleared'); } }}
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Clear
                        </Button>

                        {/* Save */}
                        <Button
                            onClick={handleSave}
                            disabled={saving || !hasChanges}
                            size="sm"
                            className={cn(
                                'min-w-[110px] transition-all',
                                hasChanges && !saving
                                    ? 'bg-teal-600 hover:bg-teal-700 shadow-sm'
                                    : 'opacity-60'
                            )}
                        >
                            {saving ? (
                                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving…</>
                            ) : (
                                <><Save className="mr-1.5 h-3.5 w-3.5" />{hasChanges ? 'Save Schedule' : 'Saved'}</>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Quick presets strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PRESETS.map(({ key, icon: Icon, label, sub, color }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => {
                                if (!confirm(`Replace current schedule with "${label}"?`)) return;
                                setEvents(applyPresetToEvents(key));
                                toast.success(`Applied "${label}"`);
                            }}
                            className="flex items-center gap-3 rounded-lg border bg-muted/20 hover:bg-muted/40 hover:border-border px-3 py-2.5 text-left transition-all group"
                        >
                            <Icon className={cn('h-4 w-4 shrink-0', color)} />
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">{label}</p>
                                <p className="text-[0.62rem] text-muted-foreground truncate">{sub}</p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Weekly summary strip */}
                <WeekStrip events={events} />

                {/* Calendar editor */}
                <WeeklyTemplateEditor
                    events={events}
                    onEventDrop={onEventDrop}
                    onEventResize={onEventResize}
                    onSelectSlot={handleSelectSlot}
                    onSelectEvent={handleSelectEvent}
                />
            </div>

            <Separator />

            {/* ── Section 2: Appointment Timing ── */}
            <TimingSection
                config={slotConfig.config}
                onChange={slotConfig.updateConfig}
                saving={savingConfig}
                hasChanges={slotConfig.hasChanges}
                onSave={handleSaveSlotConfig}
            />

            {/* ── Dialogs ── */}
            <SlotEditorDialog
                isOpen={isSlotDialogOpen}
                onClose={() => setIsSlotDialogOpen(false)}
                onSave={handleSaveSlot}
                onDelete={handleDeleteSlot}
                initialData={dialogSlot}
            />

            {/* Quick Fill Week dialog */}
            <Dialog open={weekdaysDialogOpen} onOpenChange={setWeekdaysDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Fill All Weekdays
                        </DialogTitle>
                        <DialogDescription>
                            Set one time range for Monday–Friday. Existing weekday slots will be replaced.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="wd-start" className="text-sm">Start Time</Label>
                                <Input id="wd-start" type="time" value={wdStart} onChange={e => setWdStart(e.target.value)} className="h-10" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="wd-end" className="text-sm">End Time</Label>
                                <Input id="wd-end" type="time" value={wdEnd} onChange={e => setWdEnd(e.target.value)} className="h-10" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-sm">Session Type</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { value: 'CLINIC', label: 'Clinic', icon: Stethoscope, color: '#059669' },
                                    { value: 'SURGERY', label: 'Surgery', icon: Briefcase, color: '#3b82f6' },
                                    { value: 'ADMIN', label: 'Admin', icon: Clock, color: '#6b7280' },
                                ].map(t => {
                                    const Icon = t.icon;
                                    const sel = wdType === t.value;
                                    return (
                                        <button
                                            key={t.value} type="button"
                                            onClick={() => setWdType(t.value as any)}
                                            className={cn(
                                                'flex flex-col items-center gap-1 py-2 rounded-lg border-2 transition-all text-xs font-medium',
                                                sel ? 'shadow-sm' : 'border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/60'
                                            )}
                                            style={sel ? { borderColor: t.color, backgroundColor: `${t.color}15`, color: t.color } : {}}
                                        >
                                            <Icon className="h-4 w-4" />
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setWeekdaysDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSetWeekdays}>
                            <Calendar className="h-4 w-4 mr-1.5" />
                            Apply to Mon–Fri
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Copy Day dialog */}
            <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
                <DialogContent className="sm:max-w-[440px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Copy className="h-4 w-4" />
                            Copy Day's Schedule
                        </DialogTitle>
                        <DialogDescription>
                            Choose a day to copy from, then pick the days to paste to.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="space-y-1.5">
                            <Label className="text-sm">Copy from</Label>
                            <select
                                value={selectedSourceDay ?? ''}
                                onChange={e => {
                                    const v = e.target.value;
                                    if (!v) { setSelectedSourceDay(null); setSelectedTargetDays([]); return; }
                                    const d = parseInt(v);
                                    setSelectedSourceDay(d);
                                    setSelectedTargetDays([0, 1, 2, 3, 4, 5, 6].filter(x => x !== d));
                                }}
                                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">Select a day…</option>
                                {DAY_NAMES.map((name, idx) => {
                                    const count = events.filter(e => e.start.getDay() === idx).length;
                                    return <option key={idx} value={idx}>{name} {count > 0 ? `(${count} block${count !== 1 ? 's' : ''})` : '(empty)'}</option>;
                                })}
                            </select>
                        </div>
                        {selectedSourceDay !== null && (
                            <div className="space-y-2">
                                <Label className="text-sm">Paste to</Label>
                                <div className="grid grid-cols-2 gap-1.5 p-3 border rounded-lg bg-muted/20">
                                    {DAY_NAMES.map((name, idx) => {
                                        if (idx === selectedSourceDay) return null;
                                        const checked = selectedTargetDays.includes(idx);
                                        return (
                                            <label key={idx} className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted/40 transition-colors">
                                                <Checkbox
                                                    checked={checked}
                                                    onCheckedChange={() => setSelectedTargetDays(checked ? selectedTargetDays.filter(d => d !== idx) : [...selectedTargetDays, idx])}
                                                />
                                                <span className="text-sm">{name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-muted-foreground">{selectedTargetDays.length} day{selectedTargetDays.length !== 1 ? 's' : ''} selected</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleCopyDay}
                            disabled={selectedSourceDay === null || selectedTargetDays.length === 0}
                        >
                            <Copy className="h-4 w-4 mr-1.5" />
                            Copy Schedule
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
