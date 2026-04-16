'use client';

import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, Plus, Trash2, Check, Clock } from 'lucide-react';
import { updateAvailability, updateSlotConfiguration } from '@/app/actions/schedule';
import { WorkingDay, DayOfWeek, SlotType } from '@/domain/types/schedule';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface AvailabilitySettingsProps {
    initialWorkingDays?: WorkingDay[];
    initialSlotConfig?: any | null;
    userId: string;
    onSaved?: () => Promise<void> | void;
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

export function AvailabilitySettings({
    initialWorkingDays = [],
    initialSlotConfig,
    userId,
    onSaved,
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

    useEffect(() => {
        setDaysConfig(buildDaysConfig(initialWorkingDays));
    }, [initialWorkingDays]);

    useEffect(() => {
        setSlotConfig(buildSlotConfig(initialSlotConfig));
    }, [initialSlotConfig]);

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

    const updateTiming = (field: string, value: string) => {
        setSlotConfig(prev => ({ ...prev, [field]: parseInt(value, 10) }));
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
            {/* Header */}
            <div>
                <h2 className="text-xl font-semibold text-foreground tracking-tight">Weekly Hours</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Set the times you are available for appointments each week.
                </p>
            </div>

            {/* Days List */}
            <div className="space-y-4">
                {DAY_NAMES.map((dayName, dayIndex) => {
                    const { active, slots } = daysConfig[dayIndex];
                    
                    return (
                        <div key={dayIndex} className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
                            {/* Toggle & Day Name */}
                            <div className="flex items-center gap-3 sm:w-40 sm:pt-2">
                                <Switch 
                                    checked={active} 
                                    onCheckedChange={() => toggleDay(dayIndex)}
                                />
                                <Label className={cn('text-base font-medium', !active && 'text-muted-foreground')}>
                                    {dayName}
                                </Label>
                            </div>
                            
                            {/* Time Slots Area */}
                            <div className="flex-1 space-y-3">
                                {!active ? (
                                    <div className="sm:pt-2 text-sm text-muted-foreground">Unavailable</div>
                                ) : (
                                    <div className="space-y-3">
                                        {slots.map((slot, slotIndex) => (
                                            <div key={slotIndex} className="flex flex-wrap items-center gap-2">
                                                <div className="flex items-center border rounded-md px-3 bg-background">
                                                    <input 
                                                        type="time" 
                                                        className="w-[100px] h-9 bg-transparent border-0 ring-0 focus:ring-0 text-sm outline-none"
                                                        value={slot.startTime}
                                                        onChange={(e) => updateSlot(dayIndex, slotIndex, 'startTime', e.target.value)}
                                                    />
                                                    <span className="text-muted-foreground mx-2">-</span>
                                                    <input 
                                                        type="time" 
                                                        className="w-[100px] h-9 bg-transparent border-0 ring-0 focus:ring-0 text-sm outline-none"
                                                        value={slot.endTime}
                                                        onChange={(e) => updateSlot(dayIndex, slotIndex, 'endTime', e.target.value)}
                                                    />
                                                </div>
                                                
                                                <Select value={slot.type} onValueChange={(v) => updateSlot(dayIndex, slotIndex, 'type', v)}>
                                                    <SelectTrigger className="w-[120px] h-9">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="CLINIC">Clinic</SelectItem>
                                                        <SelectItem value="SURGERY">Surgery</SelectItem>
                                                    </SelectContent>
                                                </Select>

                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                                                    onClick={() => removeSlot(dayIndex, slotIndex)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                                
                                                {slotIndex === slots.length - 1 && (
                                                    <Button variant="ghost" size="sm" className="h-9 text-muted-foreground ml-auto sm:ml-0" onClick={() => addSlot(dayIndex)}>
                                                        <Plus className="h-4 w-4 mr-1" />
                                                        Add hours
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div className="text-right text-sm text-muted-foreground px-2">
                    Total weekly availability: <span className="font-medium text-foreground">{totalHours.toFixed(1)}h</span>
                </div>
            </div>

            <Separator />
            
            {/* Timing Rules */}
            <div className="space-y-6">
                <div>
                    <h2 className="text-xl font-semibold text-foreground tracking-tight">Appointment Rules</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Configure how booking slots are generated within your working hours.
                    </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-6 rounded-xl border bg-card shadow-sm">
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary/70" />
                            Duration
                        </Label>
                        <Select value={slotConfig.defaultDuration.toString()} onValueChange={(v) => updateTiming('defaultDuration', v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[15, 20, 30, 45, 60, 90, 120].map(v => (
                                    <SelectItem key={v} value={v.toString()}>{v} minutes</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Length of standard appointments.</p>
                    </div>

                    <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary/70" />
                            Interval
                        </Label>
                        <Select value={slotConfig.slotInterval.toString()} onValueChange={(v) => updateTiming('slotInterval', v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[10, 15, 20, 30, 60].map(v => (
                                    <SelectItem key={v} value={v.toString()}>Every {v} mins</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Start times (e.g., 9:00, 9:30).</p>
                    </div>

                    <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary/70" />
                            Buffer
                        </Label>
                        <Select value={slotConfig.bufferTime.toString()} onValueChange={(v) => updateTiming('bufferTime', v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[0, 5, 10, 15, 20, 30].map(v => (
                                    <SelectItem key={v} value={v.toString()}>{v} mins break</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Time reserved between slots.</p>
                    </div>
                </div>
            </div>

            {/* Sticky Save Footer */}
            <div className="sticky bottom-6 mt-8 p-4 bg-background/80 backdrop-blur-md border rounded-xl shadow-lg flex items-center justify-between z-10">
                <p className="text-sm font-medium text-muted-foreground hidden sm:block">
                    Remember to save your changes
                </p>
                <Button 
                    onClick={handleSave} 
                    disabled={saving}
                    size="lg"
                    className="w-full sm:w-auto min-w-[200px]"
                >
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                    Save Availability
                </Button>
            </div>
        </div>
    );
}
