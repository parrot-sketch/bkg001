/**
 * ScheduleSettingsPanelV3 - Clean, Simple, Robust
 * 
 * Key improvements:
 * - No alerts/confirm() - uses proper dialogs
 * - Clear preset application with visual feedback
 * - Enhanced single day scheduling
 * - Simpler, cleaner UI
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Loader2, Save, Trash2, Copy, Calendar, Clock, Plus, X,
    Briefcase, Sun, Moon, Stethoscope, Check, ChevronDown
} from 'lucide-react';
import { updateAvailability, updateSlotConfiguration } from '@/app/actions/schedule';
import { SlotEditorDialog, SlotData } from './SlotEditorDialog';
import { useUndoRedo } from './useUndoRedo';
import { useSlotConfiguration } from './hooks/useSlotConfiguration';
import { WeeklyTemplateEditor } from './components/WeeklyTemplateEditor';
import { applyPresetToEvents, PRESET_CONFIG, PresetKey } from './components/SchedulePresets';
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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface ScheduleSettingsPanelProps {
    initialWorkingDays?: WorkingDay[];
    initialSlotConfig?: any | null;
    userId: string;
}

// ─── Preset definitions ─────────────────────────────────────────────────────
const PRESETS = [
    { key: 'business' as const, label: 'Standard Hours', sub: '9 AM – 5 PM', days: 'Mon–Fri' },
    { key: 'morning' as const, label: 'Morning Clinic', sub: '7 AM – 1 PM', days: 'Mon–Fri' },
    { key: 'split' as const, label: 'Split Shift', sub: '8–12 PM & 4–8 PM', days: 'Mon–Fri' },
    { key: 'night' as const, label: 'Evening', sub: '6 PM – 12 AM', days: 'Mon–Fri' },
];

// ─── Confirmation Dialog Component ──────────────────────────────────────────
function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    onConfirm,
    variant = 'default'
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive';
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button 
                        variant={variant === 'destructive' ? 'destructive' : 'default'}
                        onClick={() => { onConfirm(); onOpenChange(false); }}
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Single Day Editor Dialog ───────────────────────────────────────────────
function SingleDayEditorDialog({
    open,
    onOpenChange,
    dayOfWeek,
    existingSlots,
    onSave
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dayOfWeek: number;
    existingSlots: CalendarAvailabilitySlot[];
    onSave: (slots: { start: string; end: string; type: SlotType }[]) => void;
}) {
    const [slots, setSlots] = useState<{ start: string; end: string; type: SlotType }[]>(() => {
        if (existingSlots.length > 0) {
            return existingSlots.map(s => ({
                start: format(s.start, 'HH:mm'),
                end: format(s.end, 'HH:mm'),
                type: s.type
            }));
        }
        return [{ start: '09:00', end: '17:00', type: 'CLINIC' }];
    });

    const addSlot = () => {
        setSlots([...slots, { start: '09:00', end: '17:00', type: 'CLINIC' }]);
    };

    const removeSlot = (index: number) => {
        setSlots(slots.filter((_, i) => i !== index));
    };

    const updateSlot = (index: number, field: 'start' | 'end' | 'type', value: string) => {
        setSlots(slots.map((s, i) => i === index ? { ...s, [field]: value } : s));
    };

    const handleSave = () => {
        onSave(slots);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit {DAY_NAMES[dayOfWeek]} Schedule</DialogTitle>
                    <DialogDescription>
                        Add time blocks for this day. You can add multiple blocks (e.g., morning and evening).
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 max-h-[400px] overflow-y-auto py-2">
                    {slots.map((slot, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-3 rounded-lg border bg-slate-50">
                            <div className="flex-1 grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-xs">Start</Label>
                                    <Input 
                                        type="time" 
                                        value={slot.start}
                                        onChange={(e) => updateSlot(idx, 'start', e.target.value)}
                                        className="h-9"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">End</Label>
                                    <Input 
                                        type="time" 
                                        value={slot.end}
                                        onChange={(e) => updateSlot(idx, 'end', e.target.value)}
                                        className="h-9"
                                    />
                                </div>
                            </div>
                            <select
                                value={slot.type}
                                onChange={(e) => updateSlot(idx, 'type', e.target.value)}
                                className="h-9 rounded-md border bg-white px-2 text-sm"
                            >
                                <option value="CLINIC">Clinic</option>
                                <option value="SURGERY">Surgery</option>
                                <option value="ADMIN">Admin</option>
                            </select>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => removeSlot(idx)}
                                disabled={slots.length === 1}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addSlot} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Time Block
                    </Button>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave}>
                        <Check className="h-4 w-4 mr-2" />
                        Save {DAY_NAMES[dayOfWeek]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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

    // Dialog states
    const [isSlotDialogOpen, setIsSlotDialogOpen] = useState(false);
    const [dialogSlot, setDialogSlot] = useState<SlotData | null>(null);
    
    // Confirmation dialogs
    const [confirmClearOpen, setConfirmClearOpen] = useState(false);
    const [confirmPresetOpen, setConfirmPresetOpen] = useState(false);
    const [pendingPreset, setPendingPreset] = useState<PresetKey | null>(null);
    
    // Single day editor
    const [singleDayEditorOpen, setSingleDayEditorOpen] = useState(false);
    const [selectedDayForEdit, setSelectedDayForEdit] = useState<number>(1);

    // ── Calculate weekly summary ───────────────────────────────────────────────
    const weekSummary = useMemo(() => {
        const summary: Record<number, CalendarAvailabilitySlot[]> = {};
        for (let i = 0; i < 7; i++) summary[i] = [];
        
        events.forEach(ev => {
            const day = ev.start.getDay();
            summary[day].push(ev);
        });
        
        const totalHours = events.reduce((acc, ev) => 
            acc + (ev.end.getTime() - ev.start.getTime()) / 3600000, 0
        );
        
        return { slots: summary, totalHours };
    }, [events]);

    // ── Slot handlers ──────────────────────────────────────────────────────────
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

    // ── Preset handlers ────────────────────────────────────────────────────────
    const handleApplyPreset = (preset: PresetKey) => {
        setPendingPreset(preset);
        setConfirmPresetOpen(true);
    };

    const confirmApplyPreset = () => {
        if (!pendingPreset) return;
        const newEvents = applyPresetToEvents(pendingPreset);
        setEvents(newEvents);
        const presetLabel = PRESETS.find(p => p.key === pendingPreset)?.label || pendingPreset;
        toast.success(`${presetLabel} schedule applied`);
        setConfirmPresetOpen(false);
        setPendingPreset(null);
    };

    // ── Clear handler ────────────────────────────────────────────────────────
    const handleClearAll = () => {
        setEvents([]);
        toast.success('All slots cleared');
        setConfirmClearOpen(false);
    };

    // ── Single day edit ────────────────────────────────────────────────────────
    const handleOpenSingleDayEditor = (day: number) => {
        setSelectedDayForEdit(day);
        setSingleDayEditorOpen(true);
    };

    const handleSaveSingleDay = (slots: { start: string; end: string; type: SlotType }[]) => {
        // Remove existing slots for this day
        const filtered = events.filter(e => e.start.getDay() !== selectedDayForEdit);
        
        // Add new slots
        const baseDate = new Date(2000, 0, 2 + selectedDayForEdit);
        const newSlots = slots.map((slot, idx) => {
            const [sh, sm] = slot.start.split(':').map(Number);
            const [eh, em] = slot.end.split(':').map(Number);
            const start = new Date(baseDate);
            start.setHours(sh, sm, 0, 0);
            const end = new Date(baseDate);
            end.setHours(eh, em, 0, 0);
            
            return {
                id: `slot-${selectedDayForEdit}-${idx}`,
                title: slot.type,
                start,
                end,
                type: slot.type as SlotType,
            };
        });
        
        setEvents([...filtered, ...newSlots]);
        toast.success(`${DAY_NAMES[selectedDayForEdit]} schedule updated`);
    };

    // ── Save handlers ─────────────────────────────────────────────────────────
    const handleSave = async () => {
        try {
            setSaving(true);
            const workingDays: WorkingDay[] = events.map(mapCalendarToWorkingDay);
            const result = await updateAvailability({
                doctorId: userId,
                templateName: 'Standard Week',
                slots: workingDays.map(wd => ({ dayOfWeek: wd.dayOfWeek, startTime: wd.startTime, endTime: wd.endTime, type: wd.type })),
            });
            if (result.success) toast.success('Schedule saved');
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
            if (result.success) toast.success('Timing saved');
            else toast.error('Failed to save');
        } catch (e: any) { toast.error(e?.message || 'An error occurred'); }
        finally { setSavingConfig(false); }
    };

    const initialEvents = mapWorkingDaysToCalendar(initialWorkingDays);
    const hasChanges = JSON.stringify(events) !== JSON.stringify(initialEvents);

    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">Weekly Availability</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Set your working hours for each day of the week
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={undo} disabled={!canUndo}>
                        Undo
                    </Button>
                    <Button variant="outline" size="sm" onClick={redo} disabled={!canRedo}>
                        Redo
                    </Button>
                </div>
            </div>

            {/* ── Quick Presets ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PRESETS.map(({ key, label, sub }) => (
                    <button
                        key={key}
                        onClick={() => handleApplyPreset(key)}
                        className="flex flex-col items-start p-4 rounded-lg border bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-left"
                    >
                        <span className="font-medium text-sm text-slate-900">{label}</span>
                        <span className="text-xs text-slate-500 mt-1">{sub}</span>
                    </button>
                ))}
            </div>

            {/* ── Day-by-Day Summary ── */}
            <div className="rounded-lg border bg-white overflow-hidden">
                <div className="grid grid-cols-7 border-b">
                    {DAY_NAMES_SHORT.map((day, idx) => {
                        const slots = weekSummary.slots[idx] || [];
                        const hasSlots = slots.length > 0;
                        return (
                            <button
                                key={idx}
                                onClick={() => handleOpenSingleDayEditor(idx)}
                                className={cn(
                                    "flex flex-col items-center py-3 px-2 transition-colors hover:bg-slate-50",
                                    idx < 6 && "border-r"
                                )}
                            >
                                <span className={cn(
                                    "text-xs font-medium",
                                    hasSlots ? "text-slate-900" : "text-slate-400"
                                )}>
                                    {day}
                                </span>
                                <span className={cn(
                                    "text-lg font-bold mt-1",
                                    hasSlots ? "text-emerald-600" : "text-slate-300"
                                )}>
                                    {hasSlots ? slots.length : '—'}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    {hasSlots ? `${slots.length} block${slots.length > 1 ? 's' : ''}` : 'Set'}
                                </span>
                            </button>
                        );
                    })}
                </div>
                
                {/* Total hours */}
                <div className="px-4 py-2 bg-slate-50 flex items-center justify-between">
                    <span className="text-sm text-slate-600">Total weekly hours</span>
                    <span className="font-semibold text-slate-900">{weekSummary.totalHours.toFixed(1)}h</span>
                </div>
            </div>

            {/* ── Calendar Editor ── */}
            <div className="rounded-lg border bg-white p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-slate-700">Detailed Schedule</h3>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setConfirmClearOpen(true)}
                    >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Clear All
                    </Button>
                </div>
                <WeeklyTemplateEditor
                    events={events}
                    onEventDrop={onEventDrop}
                    onEventResize={onEventResize}
                    onSelectSlot={handleSelectSlot}
                    onSelectEvent={handleSelectEvent}
                />
            </div>

            {/* ── Timing Settings ── */}
            <div className="rounded-lg border bg-white p-4">
                <h3 className="font-medium text-slate-700 mb-4">Appointment Timing</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <TimingSlider
                        label="Appointment Length"
                        value={slotConfig.config.defaultDuration}
                        min={15} max={120} step={5}
                        suffix="min"
                        onChange={(v) => slotConfig.updateConfig({ defaultDuration: v })}
                    />
                    <TimingSlider
                        label="New Slot Every"
                        value={slotConfig.config.slotInterval}
                        min={5} max={60} step={5}
                        suffix="min"
                        onChange={(v) => slotConfig.updateConfig({ slotInterval: v })}
                    />
                    <TimingSlider
                        label="Break Between"
                        value={slotConfig.config.bufferTime}
                        min={0} max={30} step={5}
                        suffix="min"
                        onChange={(v) => slotConfig.updateConfig({ bufferTime: v })}
                    />
                </div>
                <div className="mt-4 flex justify-end">
                    <Button 
                        onClick={handleSaveSlotConfig} 
                        disabled={savingConfig || !slotConfig.hasChanges}
                        size="sm"
                    >
                        {savingConfig ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Timing
                    </Button>
                </div>
            </div>

            {/* ── Save Button ── */}
            <div className="flex justify-end pt-2">
                <Button 
                    onClick={handleSave} 
                    disabled={saving || !hasChanges}
                    size="lg"
                    className="min-w-[200px]"
                >
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                    {hasChanges ? 'Save Schedule' : 'Saved'}
                </Button>
            </div>

            {/* ── Dialogs ── */}
            <SlotEditorDialog
                isOpen={isSlotDialogOpen}
                onClose={() => setIsSlotDialogOpen(false)}
                onSave={handleSaveSlot}
                onDelete={handleDeleteSlot}
                initialData={dialogSlot}
            />

            {/* Clear Confirmation */}
            <ConfirmDialog
                open={confirmClearOpen}
                onOpenChange={setConfirmClearOpen}
                title="Clear All Availability?"
                description="This will remove all your scheduled time blocks. This action cannot be undone."
                confirmLabel="Clear All"
                onConfirm={handleClearAll}
                variant="destructive"
            />

            {/* Preset Confirmation */}
            <ConfirmDialog
                open={confirmPresetOpen}
                onOpenChange={setConfirmPresetOpen}
                title="Apply Preset Schedule?"
                description="This will replace your current schedule with the selected preset. You can still customize it after."
                confirmLabel="Apply Preset"
                onConfirm={confirmApplyPreset}
            />

            {/* Single Day Editor */}
            <SingleDayEditorDialog
                open={singleDayEditorOpen}
                onOpenChange={setSingleDayEditorOpen}
                dayOfWeek={selectedDayForEdit}
                existingSlots={weekSummary.slots[selectedDayForEdit] || []}
                onSave={handleSaveSingleDay}
            />
        </div>
    );
}

// ─── Timing Slider Component ───────────────────────────────────────────────
function TimingSlider({
    label,
    value,
    min,
    max,
    step,
    suffix,
    onChange
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    suffix: string;
    onChange: (v: number) => void;
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label className="text-sm text-slate-600">{label}</Label>
                <span className="text-sm font-semibold">{value} {suffix}</span>
            </div>
            <Slider
                value={[value]}
                onValueChange={([v]) => onChange(v)}
                min={min} max={max} step={step}
            />
        </div>
    );
}
