'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';

export interface SlotData {
    id?: string;
    start: Date;
    end: Date;
    type: string;
}

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
            // Defaults for new slot
            setType('CLINIC');
            // If we could pass in the clicked slot time, that would be better.
            // But for now, if initialData is null (which shouldn't happen for "add" if we pass the range), we stick to defaults.
            // Actually, for "Add", we should pass the clicked range as initialData with no ID.
        }
    }, [isOpen, initialData]);

    const handleSave = () => {
        if (!initialData) return;

        // Construct Date objects based on the *original* date but new times
        // We assume the slot stays on the same day for this simple editor
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);

        const newStart = new Date(initialData.start);
        newStart.setHours(startH, startM, 0, 0);

        const newEnd = new Date(initialData.end);
        newEnd.setHours(endH, endM, 0, 0);

        onSave({
            ...initialData, // keep ID if exists
            start: newStart,
            end: newEnd,
            type
        });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{initialData?.id ? 'Edit Availability Slot' : 'Add Availability Slot'}</DialogTitle>
                    <DialogDescription>
                        Set the time and type for this availability window.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                            Type
                        </Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CLINIC">General Clinic</SelectItem>
                                <SelectItem value="SURGERY">Surgery</SelectItem>
                                <SelectItem value="ADMIN">Admin / Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="start" className="text-right">
                            Map
                        </Label>
                        <div className="col-span-3 flex items-center gap-2">
                            <Input
                                id="start"
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-32"
                            />
                            <span>to</span>
                            <Input
                                id="end"
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-32"
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter className="flex justify-between sm:justify-between">
                    {initialData?.id ? (
                        <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => {
                                onDelete(initialData.id!);
                                onClose();
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    ) : (
                        <div></div> // Spacer
                    )}
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSave}>Save</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
