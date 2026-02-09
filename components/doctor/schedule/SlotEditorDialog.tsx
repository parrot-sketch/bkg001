'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Trash2, Clock, Stethoscope, Scissors, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SlotData {
    id?: string;
    start: Date;
    end: Date;
    type: string;
}

const SLOT_TYPES = [
    { value: 'CLINIC', label: 'General Clinic', icon: Stethoscope, color: '#059669', description: 'Regular patient consultations' },
    { value: 'SURGERY', label: 'Surgery', icon: Scissors, color: '#3b82f6', description: 'Surgical procedures' },
    { value: 'ADMIN', label: 'Admin / Other', icon: Briefcase, color: '#6b7280', description: 'Administrative tasks, meetings' },
];

interface SlotEditorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (slot: SlotData) => void;
    onDelete: (id: string) => void;
    initialData?: SlotData | null;
}

export function SlotEditorDialog({ isOpen, onClose, onSave, onDelete, initialData }: SlotEditorDialogProps) {
    const [type, setType] = useState('CLINIC');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');

    useEffect(() => {
        if (isOpen && initialData) {
            setType(initialData.type || 'CLINIC');
            setStartTime(format(initialData.start, 'HH:mm'));
            setEndTime(format(initialData.end, 'HH:mm'));
        } else if (isOpen) {
            setType('CLINIC');
            setStartTime('09:00');
            setEndTime('17:00');
        }
    }, [isOpen, initialData]);

    const handleSave = () => {
        if (!initialData) return;

        // Validate times
        if (startTime >= endTime) {
            return; // Could show error, but simple guard for now
        }

        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);

        const newStart = new Date(initialData.start);
        newStart.setHours(startH, startM, 0, 0);

        const newEnd = new Date(initialData.end);
        newEnd.setHours(endH, endM, 0, 0);

        onSave({
            ...initialData,
            start: newStart,
            end: newEnd,
            type
        });
        onClose();
    };

    const isEditing = !!initialData?.id;
    const selectedType = SLOT_TYPES.find(t => t.value === type);
    const dayLabel = initialData ? format(initialData.start, 'EEEE') : '';

    // Duration calculation
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const durationMins = (endH * 60 + endM) - (startH * 60 + startM);
    const durationLabel = durationMins > 0
        ? `${Math.floor(durationMins / 60)}h ${durationMins % 60 > 0 ? `${durationMins % 60}m` : ''}`
        : 'Invalid';

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {isEditing ? 'Edit Availability Slot' : 'Add Availability Slot'}
                    </DialogTitle>
                    <DialogDescription>
                        {dayLabel ? `${dayLabel} — ` : ''}Set the time window and type for this availability block.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Slot Type */}
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Slot Type
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                            {SLOT_TYPES.map(st => {
                                const Icon = st.icon;
                                const isSelected = type === st.value;
                                return (
                                    <button
                                        key={st.value}
                                        type="button"
                                        onClick={() => setType(st.value)}
                                        className={cn(
                                            "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-center",
                                            isSelected
                                                ? "border-current shadow-sm"
                                                : "border-transparent bg-muted/40 hover:bg-muted/60"
                                        )}
                                        style={isSelected ? { borderColor: st.color, backgroundColor: `${st.color}10` } : {}}
                                    >
                                        <Icon
                                            className="h-5 w-5"
                                            style={{ color: isSelected ? st.color : undefined }}
                                        />
                                        <span className={cn(
                                            "text-xs font-medium",
                                            isSelected ? "text-foreground" : "text-muted-foreground"
                                        )}>
                                            {st.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        {selectedType && (
                            <p className="text-[0.65rem] text-muted-foreground pl-1">
                                {selectedType.description}
                            </p>
                        )}
                    </div>

                    {/* Time Range */}
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Time Range
                        </Label>
                        <div className="flex items-center gap-3">
                            <div className="flex-1">
                                <Input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="h-10 text-center font-mono"
                                />
                                <span className="text-[0.6rem] text-muted-foreground mt-1 block text-center">Start</span>
                            </div>
                            <span className="text-muted-foreground text-sm font-medium pb-4">→</span>
                            <div className="flex-1">
                                <Input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="h-10 text-center font-mono"
                                />
                                <span className="text-[0.6rem] text-muted-foreground mt-1 block text-center">End</span>
                            </div>
                        </div>
                        {durationMins > 0 && (
                            <p className="text-xs text-muted-foreground text-center">
                                Duration: <span className="font-medium text-foreground">{durationLabel}</span>
                            </p>
                        )}
                        {durationMins <= 0 && (
                            <p className="text-xs text-destructive text-center">
                                End time must be after start time
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter className="flex justify-between sm:justify-between pt-2">
                    {isEditing ? (
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 border-destructive/30"
                            onClick={() => {
                                onDelete(initialData!.id!);
                                onClose();
                            }}
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Delete
                        </Button>
                    ) : (
                        <div />
                    )}
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={durationMins <= 0}
                        >
                            {isEditing ? 'Update' : 'Add Slot'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
