'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Copy, Calendar, Trash2, ChevronRight, Clock, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CalendarAvailabilitySlot } from '@/domain/types/schedule';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

interface BulkOperationsPanelProps {
  events: CalendarAvailabilitySlot[];
  onCopyDay: (sourceDay: number, targetDays: number[]) => void;
  onSetAllWeekdays: (startTime: string, endTime: string, type: string) => void;
  onClearAll: () => void;
  className?: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS = [1, 2, 3, 4, 5]; // Mon-Fri

export function BulkOperationsPanel({
  events,
  onCopyDay,
  onSetAllWeekdays,
  onClearAll,
  className,
}: BulkOperationsPanelProps) {
  // Copy Day Dialog State
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [selectedSourceDay, setSelectedSourceDay] = useState<number | null>(null);
  const [selectedTargetDays, setSelectedTargetDays] = useState<number[]>([]);

  // Set All Weekdays Dialog State
  const [weekdaysDialogOpen, setWeekdaysDialogOpen] = useState(false);
  const [weekdaysStartTime, setWeekdaysStartTime] = useState('09:00');
  const [weekdaysEndTime, setWeekdaysEndTime] = useState('17:00');
  const [weekdaysType, setWeekdaysType] = useState<'CLINIC' | 'SURGERY' | 'ADMIN'>('CLINIC');

  // Get slots count for a day
  const getDaySlotCount = (dayIndex: number) => {
    return events.filter(e => e.start.getDay() === dayIndex).length;
  };

  // Open copy dialog
  const handleOpenCopyDialog = () => {
    setSelectedSourceDay(null);
    setSelectedTargetDays([]);
    setCopyDialogOpen(true);
  };

  // Handle source day selection
  const handleSourceDayChange = (dayIndex: number | string) => {
    if (dayIndex === '' || dayIndex === -1) {
      setSelectedSourceDay(null);
      setSelectedTargetDays([]);
      return;
    }
    const day = typeof dayIndex === 'string' ? parseInt(dayIndex) : dayIndex;
    setSelectedSourceDay(day);
    // Auto-select all other days as targets
    const otherDays = [0, 1, 2, 3, 4, 5, 6].filter(d => d !== day);
    setSelectedTargetDays(otherDays);
  };

  // Toggle target day selection
  const toggleTargetDay = (dayIndex: number) => {
    if (selectedTargetDays.includes(dayIndex)) {
      setSelectedTargetDays(selectedTargetDays.filter(d => d !== dayIndex));
    } else {
      setSelectedTargetDays([...selectedTargetDays, dayIndex]);
    }
  };

  // Execute copy operation
  const handleExecuteCopy = () => {
    if (selectedSourceDay === null || selectedTargetDays.length === 0) return;
    
    const sourceSlots = events.filter(e => e.start.getDay() === selectedSourceDay);
    if (sourceSlots.length === 0) {
      alert('No availability slots found for the selected source day.');
      return;
    }

    onCopyDay(selectedSourceDay, selectedTargetDays);
    setCopyDialogOpen(false);
    setSelectedSourceDay(null);
    setSelectedTargetDays([]);
  };

  // Execute set all weekdays
  const handleExecuteSetWeekdays = () => {
    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(weekdaysStartTime) || !timeRegex.test(weekdaysEndTime)) {
      alert('Please enter valid time in HH:MM format (e.g., 09:00)');
      return;
    }

    // Validate start < end
    const [startH, startM] = weekdaysStartTime.split(':').map(Number);
    const [endH, endM] = weekdaysEndTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes >= endMinutes) {
      alert('End time must be after start time');
      return;
    }

    onSetAllWeekdays(weekdaysStartTime, weekdaysEndTime, weekdaysType);
    setWeekdaysDialogOpen(false);
  };

  // Get summary of what will be copied
  const getCopySummary = () => {
    if (selectedSourceDay === null) return null;
    const sourceSlots = events.filter(e => e.start.getDay() === selectedSourceDay);
    return {
      sourceDay: DAY_NAMES[selectedSourceDay],
      slotCount: sourceSlots.length,
      targetCount: selectedTargetDays.length,
    };
  };

  const copySummary = getCopySummary();

  return (
    <>
      <Card className={cn('shadow-sm', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Copy className="h-4 w-4 text-muted-foreground" />
            Bulk Operations
          </CardTitle>
          <CardDescription className="text-xs">
            Quickly apply changes to multiple days at once
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Copy Day Operation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-foreground">Copy Day Schedule</p>
              {selectedSourceDay !== null && (
                <Badge variant="secondary" className="text-[0.65rem]">
                  {getDaySlotCount(selectedSourceDay)} slots
                </Badge>
              )}
            </div>
            <p className="text-[0.65rem] text-muted-foreground leading-relaxed">
              Copy all availability slots from one day to other selected days. Useful for setting up consistent schedules.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start h-9 text-xs"
              onClick={handleOpenCopyDialog}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copy Day Schedule
            </Button>
          </div>

          {/* Set All Weekdays Operation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-foreground">Set All Weekdays</p>
              <Badge variant="secondary" className="text-[0.65rem]">
                Mon-Fri
              </Badge>
            </div>
            <p className="text-[0.65rem] text-muted-foreground leading-relaxed">
              Set the same time range for all weekdays (Monday through Friday). Existing slots will be replaced.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start h-9 text-xs"
              onClick={() => setWeekdaysDialogOpen(true)}
            >
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Set All Weekdays
            </Button>
          </div>

          {/* Clear All Operation */}
          <div className="pt-2 border-t space-y-2">
            <p className="text-xs font-medium text-foreground">Clear All</p>
            <p className="text-[0.65rem] text-muted-foreground leading-relaxed">
              Remove all availability slots from your weekly schedule. This action cannot be undone.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start h-9 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={() => {
                if (confirm('Are you sure you want to clear all availability slots? This cannot be undone.')) {
                  onClearAll();
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear All Slots
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Copy Day Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Copy Day Schedule
            </DialogTitle>
            <DialogDescription>
              Select a source day and target days to copy availability slots. All slots from the source day will be copied to each selected target day.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Source Day Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Source Day (Copy From)</Label>
              <select
                value={selectedSourceDay ?? ''}
                onChange={(e) => handleSourceDayChange(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select a day to copy from...</option>
                {DAY_NAMES.map((name, idx) => {
                  const slotCount = getDaySlotCount(idx);
                  return (
                    <option key={idx} value={idx}>
                      {name} {slotCount > 0 && `(${slotCount} slot${slotCount !== 1 ? 's' : ''})`}
                    </option>
                  );
                })}
              </select>
              {selectedSourceDay !== null && copySummary && (
                <Alert className="mt-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Found <strong>{copySummary.slotCount}</strong> slot{copySummary.slotCount !== 1 ? 's' : ''} on {copySummary.sourceDay}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Target Days Selection */}
            {selectedSourceDay !== null && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Target Days (Copy To)</Label>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-md bg-muted/30">
                  {DAY_NAMES.map((name, idx) => {
                    if (idx === selectedSourceDay) return null; // Don't show source day
                    const isSelected = selectedTargetDays.includes(idx);
                    return (
                      <div key={idx} className="flex items-center space-x-2">
                        <Checkbox
                          id={`target-day-${idx}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleTargetDay(idx)}
                        />
                        <label
                          htmlFor={`target-day-${idx}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {name}
                        </label>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {selectedTargetDays.length} day{selectedTargetDays.length !== 1 ? 's' : ''} selected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      const otherDays = [0, 1, 2, 3, 4, 5, 6].filter(d => d !== selectedSourceDay);
                      setSelectedTargetDays(otherDays);
                    }}
                  >
                    Select All
                  </Button>
                </div>
              </div>
            )}

            {/* Preview Summary */}
            {selectedSourceDay !== null && selectedTargetDays.length > 0 && copySummary && (
              <Alert>
                <AlertDescription className="text-xs">
                  <strong>Preview:</strong> {copySummary.slotCount} slot{copySummary.slotCount !== 1 ? 's' : ''} from{' '}
                  <strong>{copySummary.sourceDay}</strong> will be copied to{' '}
                  <strong>{selectedTargetDays.length}</strong> day{selectedTargetDays.length !== 1 ? 's' : ''} (
                  {selectedTargetDays.map(d => DAY_NAMES[d]).join(', ')}).
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExecuteCopy}
              disabled={selectedSourceDay === null || selectedTargetDays.length === 0}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set All Weekdays Dialog */}
      <Dialog open={weekdaysDialogOpen} onOpenChange={setWeekdaysDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Set All Weekdays Schedule
            </DialogTitle>
            <DialogDescription>
              Configure a single time range that will be applied to all weekdays (Monday through Friday). Existing slots on these days will be replaced.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time" className="text-sm font-medium">
                  Start Time
                </Label>
                <Input
                  id="start-time"
                  type="time"
                  value={weekdaysStartTime}
                  onChange={(e) => setWeekdaysStartTime(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time" className="text-sm font-medium">
                  End Time
                </Label>
                <Input
                  id="end-time"
                  type="time"
                  value={weekdaysEndTime}
                  onChange={(e) => setWeekdaysEndTime(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>

            {/* Slot Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Slot Type</Label>
              <select
                value={weekdaysType}
                onChange={(e) => setWeekdaysType(e.target.value as 'CLINIC' | 'SURGERY' | 'ADMIN')}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="CLINIC">Clinic</option>
                <option value="SURGERY">Surgery</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            {/* Preview */}
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription className="text-xs">
                This will create availability from <strong>{weekdaysStartTime}</strong> to{' '}
                <strong>{weekdaysEndTime}</strong> for all weekdays (Monday - Friday) as{' '}
                <strong>{weekdaysType}</strong> slots.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWeekdaysDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExecuteSetWeekdays}>
              <Calendar className="h-4 w-4 mr-2" />
              Apply to Weekdays
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
