'use client';

import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { updateAvailability, updateSlotConfiguration } from '@/app/actions/schedule';
import { WorkingDay, DayOfWeek, SlotType } from '@/domain/types/schedule';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SlotConfigurationPanel } from './SlotConfigurationPanel';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface AvailabilitySettingsProps {
    initialWorkingDays?: WorkingDay[];
    initialSlotConfig?: any | null;
    userId: string;
    onSaved?: () => Promise<void> | void;
    onDirtyChange?: (isDirty: boolean) => void;
}

// ── Default settings
const DEFAULT_SLOT_CONFIG = {
    defaultDuration: 30,
    slotInterval: 30,
    bufferTime: 5,
};

// ── State shape for days
type DaySettings = {
    active: boolean;
    slots: { startTime: string; endTime: string; type: SlotType }[];
};

type AvailabilityPreset = {
    id: string;
    name: string;
    active: boolean;
    slots: { startTime: string; endTime: string; type: SlotType }[];
};

const BUILTIN_PRESETS: AvailabilityPreset[] = [
    {
        id: 'clinic_standard',
        name: 'Clinic 09:00–17:00',
        active: true,
        slots: [{ startTime: '09:00', endTime: '17:00', type: 'CLINIC' }],
    },
    {
        id: 'clinic_split_day',
        name: 'Clinic split 09:00–13:00 + 14:00–17:00',
        active: true,
        slots: [
            { startTime: '09:00', endTime: '13:00', type: 'CLINIC' },
            { startTime: '14:00', endTime: '17:00', type: 'CLINIC' },
        ],
    },
    {
        id: 'clinic_morning',
        name: 'Clinic morning 09:00–13:00',
        active: true,
        slots: [{ startTime: '09:00', endTime: '13:00', type: 'CLINIC' }],
    },
    {
        id: 'clinic_afternoon',
        name: 'Clinic afternoon 13:00–17:00',
        active: true,
        slots: [{ startTime: '13:00', endTime: '17:00', type: 'CLINIC' }],
    },
    {
        id: 'clinic_evening',
        name: 'Clinic evening 17:00–20:00',
        active: true,
        slots: [{ startTime: '17:00', endTime: '20:00', type: 'CLINIC' }],
    },
    {
        id: 'surgery_standard',
        name: 'Surgery 09:00–17:00',
        active: true,
        slots: [{ startTime: '09:00', endTime: '17:00', type: 'SURGERY' }],
    },
    {
        id: 'surgery_morning',
        name: 'Surgery morning 08:00–12:00',
        active: true,
        slots: [{ startTime: '08:00', endTime: '12:00', type: 'SURGERY' }],
    },
    {
        id: 'admin_half_day',
        name: 'Admin block 13:00–17:00',
        active: true,
        slots: [{ startTime: '13:00', endTime: '17:00', type: 'ADMIN' }],
    },
    {
        id: 'off',
        name: 'Off',
        active: false,
        slots: [],
    },
];

export function AvailabilitySettings({
    initialWorkingDays = [],
    initialSlotConfig,
    userId,
    onSaved,
    onDirtyChange,
}: AvailabilitySettingsProps) {
    const [saving, setSaving] = useState(false);

    const buildDaysConfig = (workingDays: WorkingDay[]): Record<number, DaySettings> => {
        const config: Record<number, DaySettings> = {};
        for (let i = 0; i < 7; i++) {
            config[i] = { active: false, slots: [] };
        }
        workingDays.forEach(wd => {
            config[wd.dayOfWeek].active = true;
            config[wd.dayOfWeek].slots.push({
                startTime: wd.startTime,
                endTime: wd.endTime,
                type: wd.type || 'CLINIC',
            });
        });
        // Sort slots by start time
        for (let i = 0; i < 7; i++) {
            if (config[i].slots.length === 0) {
                // Default slot when toggled on
                config[i].slots = [{ startTime: '09:00', endTime: '17:00', type: 'CLINIC' }];
            } else {
                config[i].slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
            }
        }
        return config;
    };

    const buildSlotConfig = (config?: any | null) => ({
        defaultDuration: config?.defaultDuration || DEFAULT_SLOT_CONFIG.defaultDuration,
        slotInterval: config?.slotInterval || DEFAULT_SLOT_CONFIG.slotInterval,
        bufferTime: config?.bufferTime || DEFAULT_SLOT_CONFIG.bufferTime,
    });

    // ── Build initial state from working days
    const [daysConfig, setDaysConfig] = useState<Record<number, DaySettings>>(() =>
        buildDaysConfig(initialWorkingDays)
    );

    const [slotConfig, setSlotConfig] = useState(() =>
        buildSlotConfig(initialSlotConfig)
    );

    const presetsStorageKey = useMemo(() => `ns_availability_presets_v1:${userId}`, [userId]);
    const [customPresets, setCustomPresets] = useState<AvailabilityPreset[]>([]);
    const allPresets = useMemo(
        () => [...BUILTIN_PRESETS, ...customPresets],
        [customPresets],
    );
    const [presetId, setPresetId] = useState<string>(BUILTIN_PRESETS[0]?.id ?? 'clinic_standard');
    const [selectedDays, setSelectedDays] = useState<Record<number, boolean>>(() => {
        const initial: Record<number, boolean> = {};
        for (let i = 0; i < 7; i++) initial[i] = false;
        return initial;
    });
    const selectedDayCount = useMemo(
        () => Object.values(selectedDays).filter(Boolean).length,
        [selectedDays],
    );

    const [showCreatePreset, setShowCreatePreset] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const [newPresetSlots, setNewPresetSlots] = useState<
        { startTime: string; endTime: string; type: SlotType }[]
    >([{ startTime: '09:00', endTime: '17:00', type: 'CLINIC' }]);

    useEffect(() => {
        setDaysConfig(buildDaysConfig(initialWorkingDays));
    }, [initialWorkingDays]);

    useEffect(() => {
        setSlotConfig(buildSlotConfig(initialSlotConfig));
    }, [initialSlotConfig]);

    const isDirty = useMemo(() => {
        const initialDays = buildDaysConfig(initialWorkingDays);
        const initialSlot = buildSlotConfig(initialSlotConfig);

        // Compare slotConfig
        if (
            slotConfig.defaultDuration !== initialSlot.defaultDuration ||
            slotConfig.slotInterval !== initialSlot.slotInterval ||
            slotConfig.bufferTime !== initialSlot.bufferTime
        ) {
            return true;
        }

        // Compare daysConfig
        for (let i = 0; i < 7; i++) {
            const currentDay = daysConfig[i];
            const initialDay = initialDays[i];

            if (!currentDay || !initialDay) continue;

            if (currentDay.active !== initialDay.active) {
                return true;
            }

            if (currentDay.active) {
                if (currentDay.slots.length !== initialDay.slots.length) {
                    return true;
                }
                for (let j = 0; j < currentDay.slots.length; j++) {
                    const cSlot = currentDay.slots[j];
                    const iSlot = initialDay.slots[j];
                    if (!iSlot) return true;
                    if (
                        cSlot.startTime !== iSlot.startTime ||
                        cSlot.endTime !== iSlot.endTime ||
                        cSlot.type !== iSlot.type
                    ) {
                        return true;
                    }
                }
            }
        }

        return false;
    }, [daysConfig, slotConfig, initialWorkingDays, initialSlotConfig]);

    useEffect(() => {
        onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    useEffect(() => {
        if (!isDirty) return;
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return e.returnValue;
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(presetsStorageKey);
            if (!raw) {
                setCustomPresets([]);
                return;
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                setCustomPresets([]);
                return;
            }
            const cleaned: AvailabilityPreset[] = parsed
                .filter((p: any) => p && typeof p.id === 'string' && typeof p.name === 'string')
                .map((p: any) => ({
                    id: String(p.id),
                    name: String(p.name),
                    active: Boolean(p.active),
                    slots: Array.isArray(p.slots)
                        ? p.slots
                            .filter((s: any) => s && typeof s.startTime === 'string' && typeof s.endTime === 'string')
                            .map((s: any) => ({
                                startTime: String(s.startTime),
                                endTime: String(s.endTime),
                                type: (s.type === 'SURGERY' || s.type === 'ADMIN' ? s.type : 'CLINIC') as SlotType,
                            }))
                        : [],
                }));
            setCustomPresets(cleaned);
        } catch {
            setCustomPresets([]);
        }
    }, [presetsStorageKey]);

    // ── Handlers
    const toggleDay = (dayIndex: number) => {
        setDaysConfig(prev => ({
            ...prev,
            [dayIndex]: { ...prev[dayIndex], active: !prev[dayIndex].active }
        }));
    };

    const addSlot = (dayIndex: number) => {
        setDaysConfig(prev => ({
            ...prev,
            [dayIndex]: {
                ...prev[dayIndex],
                slots: [...prev[dayIndex].slots, { startTime: '09:00', endTime: '17:00', type: 'CLINIC' }]
            }
        }));
    };

    const removeSlot = (dayIndex: number, slotIndex: number) => {
        setDaysConfig(prev => {
            const newSlots = prev[dayIndex].slots.filter((_, i) => i !== slotIndex);
            if (newSlots.length === 0) {
                return { ...prev, [dayIndex]: { active: false, slots: [{ startTime: '09:00', endTime: '17:00', type: 'CLINIC' }] } };
            }
            return { ...prev, [dayIndex]: { ...prev[dayIndex], slots: newSlots } };
        });
    };

    const updateSlot = (dayIndex: number, slotIndex: number, field: string, value: string) => {
        setDaysConfig(prev => {
            const newSlots = [...prev[dayIndex].slots];
            newSlots[slotIndex] = { ...newSlots[slotIndex], [field]: value };
            return { ...prev, [dayIndex]: { ...prev[dayIndex], slots: newSlots } };
        });
    };

    const setSelectedDay = (dayIndex: number, checked: boolean) => {
        setSelectedDays(prev => ({ ...prev, [dayIndex]: checked }));
    };

    const clearSelectedDays = () => {
        setSelectedDays(() => {
            const cleared: Record<number, boolean> = {};
            for (let i = 0; i < 7; i++) cleared[i] = false;
            return cleared;
        });
    };

    const selectAllActiveDays = () => {
        setSelectedDays(() => {
            const next: Record<number, boolean> = {};
            for (let i = 0; i < 7; i++) next[i] = Boolean(daysConfig[i]?.active);
            return next;
        });
    };

    const applyPresetToDay = (dayIndex: number, preset: AvailabilityPreset) => {
        setDaysConfig(prev => {
            const next = { ...prev };
            if (!preset.active) {
                next[dayIndex] = {
                    active: false,
                    slots: [{ startTime: '09:00', endTime: '17:00', type: 'CLINIC' }],
                };
                return next;
            }

            const presetSlots =
                preset.slots.length > 0
                    ? [...preset.slots].sort((a, b) => a.startTime.localeCompare(b.startTime))
                    : [{ startTime: '09:00', endTime: '17:00', type: 'CLINIC' as SlotType }];

            next[dayIndex] = { active: true, slots: presetSlots };
            return next;
        });
    };

    const applyPresetToSelectedDays = () => {
        const preset = allPresets.find(p => p.id === presetId);
        if (!preset) return;
        const indices = Object.entries(selectedDays)
            .filter(([, v]) => v)
            .map(([k]) => Number(k))
            .filter(n => Number.isFinite(n) && n >= 0 && n <= 6);
        if (indices.length === 0) {
            toast.message('Select one or more days to apply a preset');
            return;
        }

        setDaysConfig(prev => {
            const next = { ...prev };
            indices.forEach(dayIndex => {
                if (!preset.active) {
                    next[dayIndex] = {
                        active: false,
                        slots: [{ startTime: '09:00', endTime: '17:00', type: 'CLINIC' }],
                    };
                    return;
                }

                const presetSlots =
                    preset.slots.length > 0
                        ? [...preset.slots].sort((a, b) => a.startTime.localeCompare(b.startTime))
                        : [{ startTime: '09:00', endTime: '17:00', type: 'CLINIC' as SlotType }];

                next[dayIndex] = { active: true, slots: presetSlots };
            });
            return next;
        });

        toast.success(`Applied "${preset.name}"`);
        clearSelectedDays();
    };

    const addNewPresetSlot = () => {
        setNewPresetSlots(prev => [...prev, { startTime: '09:00', endTime: '17:00', type: 'CLINIC' }]);
    };

    const removeNewPresetSlot = (slotIndex: number) => {
        setNewPresetSlots(prev => prev.filter((_, i) => i !== slotIndex));
    };

    const updateNewPresetSlot = (
        slotIndex: number,
        field: 'startTime' | 'endTime' | 'type',
        value: string,
    ) => {
        setNewPresetSlots(prev => {
            const next = [...prev];
            const slot = next[slotIndex];
            if (!slot) return prev;
            if (field === 'type') {
                next[slotIndex] = { ...slot, type: (value === 'SURGERY' || value === 'ADMIN' ? value : 'CLINIC') as SlotType };
            } else {
                next[slotIndex] = { ...slot, [field]: value };
            }
            return next;
        });
    };

    const saveNewPreset = () => {
        const name = newPresetName.trim();
        if (!name) {
            toast.error('Preset name is required');
            return;
        }
        const normalizedSlots = newPresetSlots
            .filter(s => s.startTime && s.endTime)
            .map(s => ({
                startTime: s.startTime,
                endTime: s.endTime,
                type: s.type,
            }))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

        if (normalizedSlots.length === 0) {
            toast.error('Add at least one time range');
            return;
        }

        const id = `custom_${Math.random().toString(36).slice(2, 10)}`;
        const preset: AvailabilityPreset = {
            id,
            name,
            active: true,
            slots: normalizedSlots,
        };

        setCustomPresets(prev => {
            const next = [...prev, preset];
            try {
                localStorage.setItem(presetsStorageKey, JSON.stringify(next));
            } catch {
                // ignore persistence errors
            }
            return next;
        });

        setPresetId(id);
        setNewPresetName('');
        setNewPresetSlots([{ startTime: '09:00', endTime: '17:00', type: 'CLINIC' }]);
        setShowCreatePreset(false);
        toast.success('Preset saved');
    };

    // ── Save
    const handleSave = async () => {
        try {
            setSaving(true);
            
            // 1. Prepare working days
            const workingDays: WorkingDay[] = [];
            for (let i = 0; i < 7; i++) {
                if (daysConfig[i].active) {
                    daysConfig[i].slots.forEach(slot => {
                        workingDays.push({
                            dayOfWeek: i as DayOfWeek,
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            type: slot.type,
                        });
                    });
                }
            }

            // 2. Save Availability
            const availResult = await updateAvailability({
                doctorId: userId,
                templateName: 'Standard Week',
                slots: workingDays.map(wd => ({ dayOfWeek: wd.dayOfWeek, startTime: wd.startTime, endTime: wd.endTime, type: wd.type })),
            });
            
            if (!availResult.success) throw new Error('Failed to save working hours');

            // 3. Save Timing Config
            const configResult = await updateSlotConfiguration({
                doctorId: userId,
                defaultDuration: slotConfig.defaultDuration,
                slotInterval: slotConfig.slotInterval,
                bufferTime: slotConfig.bufferTime,
            });

            if (!configResult.success) throw new Error('Failed to save timing rules');

            toast.success('Availability settings saved successfully');
            await onSaved?.();
        } catch (error: any) {
            toast.error(error.message || 'An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    // Calculate total hours
    const totalHours = useMemo(() => {
        let total = 0;
        for (let i = 0; i < 7; i++) {
            if (daysConfig[i].active) {
                daysConfig[i].slots.forEach(slot => {
                    const [sh, sm] = slot.startTime.split(':').map(Number);
                    const [eh, em] = slot.endTime.split(':').map(Number);
                    let diff = (eh + em / 60) - (sh + sm / 60);
                    if (diff > 0) total += diff;
                });
            }
        }
        return total;
    }, [daysConfig]);

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Availability */}
            <div className="space-y-3" id="tour-weekly-hours">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold tracking-tight text-foreground">Availability</h2>
                        <div className="text-xs text-muted-foreground">
                            Total: <span className="font-medium text-foreground">{totalHours.toFixed(1)}h</span>
                        </div>
                    </div>

                    {/* Presets bar */}
                    <div className="border border-border bg-background px-4 py-3 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-foreground">Presets</div>
                            <div className="text-xs text-muted-foreground">
                                Selected days: <span className="font-medium text-foreground">{selectedDayCount}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                            <Select value={presetId} onValueChange={setPresetId}>
                                <SelectTrigger className="h-9 w-full rounded-none">
                                    <SelectValue placeholder="Select preset" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel className="text-xs text-muted-foreground">Presets</SelectLabel>
                                        {BUILTIN_PRESETS.map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                    {customPresets.length > 0 && (
                                        <>
                                            <SelectSeparator />
                                            <SelectGroup>
                                                <SelectLabel className="text-xs text-muted-foreground">Custom</SelectLabel>
                                                {customPresets.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>

                            <Button
                                type="button"
                                variant="outline"
                                className="h-9 rounded-none w-full sm:w-auto"
                                onClick={applyPresetToSelectedDays}
                                disabled={selectedDayCount === 0}
                            >
                                Apply preset
                            </Button>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-none"
                                onClick={selectAllActiveDays}
                            >
                                Select active
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-none"
                                onClick={clearSelectedDays}
                                disabled={selectedDayCount === 0}
                            >
                                Clear selection
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-none"
                                onClick={() => setShowCreatePreset(v => !v)}
                            >
                                {showCreatePreset ? 'Close preset editor' : 'New preset'}
                            </Button>
                        </div>
                    </div>
                </div>

                {showCreatePreset && (
                    <div className="border border-border bg-background p-4 space-y-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
                            <div className="sm:col-span-2 space-y-2">
                                <Label className="text-sm">Preset name</Label>
                                <Input
                                    value={newPresetName}
                                    onChange={(e) => setNewPresetName(e.target.value)}
                                    placeholder="e.g., Clinic morning + buffer"
                                    className="h-9 rounded-none"
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-9 rounded-none"
                                onClick={saveNewPreset}
                            >
                                Save preset
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-medium text-foreground">Time ranges</div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-9 rounded-none"
                                    onClick={addNewPresetSlot}
                                >
                                    Add range
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {newPresetSlots.map((slot, slotIndex) => (
                                    <div key={slotIndex} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="time"
                                                className="h-9 w-[118px] border border-input bg-background px-2 text-sm outline-none ring-0 focus:ring-0 rounded-none"
                                                value={slot.startTime}
                                                onChange={(e) => updateNewPresetSlot(slotIndex, 'startTime', e.target.value)}
                                            />
                                            <span className="text-muted-foreground">–</span>
                                            <input
                                                type="time"
                                                className="h-9 w-[118px] border border-input bg-background px-2 text-sm outline-none ring-0 focus:ring-0 rounded-none"
                                                value={slot.endTime}
                                                onChange={(e) => updateNewPresetSlot(slotIndex, 'endTime', e.target.value)}
                                            />
                                        </div>

                                        <Select value={slot.type} onValueChange={(v) => updateNewPresetSlot(slotIndex, 'type', v)}>
                                            <SelectTrigger className="h-9 w-full sm:w-[140px] rounded-none">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="CLINIC">Clinic</SelectItem>
                                                <SelectItem value="SURGERY">Surgery</SelectItem>
                                                <SelectItem value="ADMIN">Admin</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <div className="sm:ml-auto">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-9 rounded-none"
                                                onClick={() => removeNewPresetSlot(slotIndex)}
                                                disabled={newPresetSlots.length <= 1}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="border border-border bg-background divide-y">
                {DAY_NAMES.map((dayName, dayIndex) => {
                    const { active, slots } = daysConfig[dayIndex];
                    
                    return (
                        <div key={dayIndex} className="px-4 py-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                            <div className="flex items-center gap-3 sm:w-44">
                                <Checkbox
                                    checked={selectedDays[dayIndex]}
                                    onCheckedChange={(checked) => setSelectedDay(dayIndex, checked === true)}
                                    aria-label={`Select ${dayName}`}
                                    className={cn(
                                        'rounded-none border-border data-[state=checked]:bg-foreground data-[state=checked]:text-background',
                                    )}
                                />
                                <Switch 
                                    checked={active} 
                                    onCheckedChange={() => toggleDay(dayIndex)}
                                />
                                <Label className={cn('text-sm font-medium', !active && 'text-muted-foreground')}>
                                    {dayName}
                                </Label>
                                {!active && <span className="text-xs text-muted-foreground">Off</span>}
                            </div>
                            
                            <div className="flex-1">
                                {active && (
                                    <div className="space-y-2">
                                        {slots.map((slot, slotIndex) => (
                                            <div key={slotIndex} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="time" 
                                                        className="h-9 w-[118px] border border-input bg-background px-2 text-sm outline-none ring-0 focus:ring-0 rounded-none"
                                                        value={slot.startTime}
                                                        onChange={(e) => updateSlot(dayIndex, slotIndex, 'startTime', e.target.value)}
                                                    />
                                                    <span className="text-muted-foreground">–</span>
                                                    <input 
                                                        type="time" 
                                                        className="h-9 w-[118px] border border-input bg-background px-2 text-sm outline-none ring-0 focus:ring-0 rounded-none"
                                                        value={slot.endTime}
                                                        onChange={(e) => updateSlot(dayIndex, slotIndex, 'endTime', e.target.value)}
                                                    />
                                                </div>
                                                
                                                <Select value={slot.type} onValueChange={(v) => updateSlot(dayIndex, slotIndex, 'type', v)}>
                                                    <SelectTrigger className="h-9 w-full sm:w-[140px] rounded-none">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="CLINIC">Clinic</SelectItem>
                                                        <SelectItem value="SURGERY">Surgery</SelectItem>
                                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>

                                                <div className="flex items-center gap-2 sm:ml-auto">
                                                    {slotIndex === slots.length - 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-9 rounded-none"
                                                            onClick={() => addSlot(dayIndex)}
                                                        >
                                                            Add
                                                        </Button>
                                                    )}
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-9 rounded-none"
                                                        onClick={() => removeSlot(dayIndex, slotIndex)}
                                                    >
                                                        Remove
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            </div>
                        </div>
                    );
                })}
                </div>
            </div>
            
            {/* Timing Rules */}
            <div className="space-y-3" id="tour-slot-config">
                <div>
                    <h2 className="text-base font-semibold tracking-tight text-foreground">Slot rules (appointment timing)</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        These rules control how bookable slots are generated from your working hours (duration, interval, and buffer).
                    </p>
                </div>
                <SlotConfigurationPanel
                    config={slotConfig}
                    onChange={setSlotConfig}
                />
            </div>

            {/* Sticky Save Footer */}
            <div className="sticky bottom-0 mt-8 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <div className="flex items-center justify-end gap-3 px-4 py-3">
                    {isDirty && (
                        <span className="text-xs text-amber-600 font-medium animate-pulse flex items-center mr-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 mr-1.5 inline-block" />
                            Unsaved changes
                        </span>
                    )}
                    <Button 
                        onClick={handleSave} 
                        disabled={saving || !isDirty}
                        className={cn(
                            "h-10 rounded-none px-6 font-semibold transition-all text-sm",
                            isDirty 
                                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md border-0" 
                                : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed hover:bg-slate-100 hover:text-slate-400"
                        )}
                    >
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
}
