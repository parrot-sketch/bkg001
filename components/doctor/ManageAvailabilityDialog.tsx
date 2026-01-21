'use client';

/**
 * Manage Availability Dialog
 * 
 * Allows doctors to set their working days and availability schedule.
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { doctorApi } from '@/lib/api/doctor';
import { Clock } from 'lucide-react';
import type { SetDoctorAvailabilityDto } from '@/application/dtos/SetDoctorAvailabilityDto';

interface ManageAvailabilityDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  doctorId: string;
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export function ManageAvailabilityDialog({
  open,
  onClose,
  onSuccess,
  doctorId,
}: ManageAvailabilityDialogProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [workingDays, setWorkingDays] = useState<SetDoctorAvailabilityDto['workingDays']>([]);
  const [slotConfig, setSlotConfig] = useState({
    defaultDuration: 30,
    bufferTime: 0,
    slotInterval: 15,
  });

  useEffect(() => {
    if (open) {
      loadAvailability();
    }
  }, [open, doctorId]);

  const loadAvailability = async () => {
    setFetching(true);
    try {
      const response = await doctorApi.getMyAvailability();
      if (response.success && response.data) {
        // Initialize working days
        const existingDays: SetDoctorAvailabilityDto['workingDays'] = response.data.workingDays || [];
        const daysMap = new Map<string, SetDoctorAvailabilityDto['workingDays'][0]>(
          existingDays.map((d: SetDoctorAvailabilityDto['workingDays'][0]) => [d.day, d])
        );
        
        const allDays: SetDoctorAvailabilityDto['workingDays'] = DAYS_OF_WEEK.map(day => {
          const existing = daysMap.get(day);
          if (existing) {
            return existing;
          }
          return {
            day,
            startTime: '09:00',
            endTime: '17:00',
            isAvailable: false,
            breaks: [],
          };
        });
        
        setWorkingDays(allDays);
        
        if (response.data.slotConfiguration) {
          setSlotConfig({
            defaultDuration: response.data.slotConfiguration.defaultDuration || 30,
            bufferTime: response.data.slotConfiguration.bufferTime || 0,
            slotInterval: response.data.slotConfiguration.slotInterval || 15,
          });
        }
      }
    } catch (error) {
      console.error('Error loading availability:', error);
    } finally {
      setFetching(false);
    }
  };

  const updateWorkingDay = (day: string, field: string, value: any) => {
    setWorkingDays(prev => {
      const updated = prev.map(wd => {
        // Match by day name (case-insensitive)
        if (wd.day?.toLowerCase() === day.toLowerCase()) {
          return { ...wd, [field]: value };
        }
        return wd;
      });
      
      // If day not found, add it (shouldn't happen, but safety check)
      const dayExists = updated.some(wd => wd.day?.toLowerCase() === day.toLowerCase());
      if (!dayExists) {
        updated.push({
          day,
          startTime: '09:00',
          endTime: '17:00',
          isAvailable: field === 'isAvailable' ? value : false,
          breaks: [],
          [field]: value,
        });
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dto: SetDoctorAvailabilityDto = {
        doctorId,
        workingDays: workingDays.filter(wd => wd.isAvailable),
        slotConfiguration: slotConfig,
      };

      const response = await doctorApi.setMyAvailability(dto);

      if (response.success) {
        toast.success('Availability updated successfully');
        onSuccess();
        onClose();
      } else {
        toast.error(response.error || 'Failed to update availability');
      }
    } catch (error) {
      toast.error('An error occurred while updating availability');
      console.error('Error updating availability:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Availability</DialogTitle>
          <DialogDescription>
            Set your working days and hours. Only enabled days will be available for appointments.
          </DialogDescription>
        </DialogHeader>

        {fetching ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading availability...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Working Days */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Working Days</Label>
              <div className="space-y-3">
                {DAYS_OF_WEEK.map(day => {
                  const workingDay = workingDays.find(wd => wd.day?.toLowerCase() === day.toLowerCase());
                  const isAvailable = workingDay?.isAvailable || false;
                  
                  return (
                    <div
                      key={day}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          id={`day-${day}`}
                          checked={isAvailable}
                          onCheckedChange={(checked) => {
                            updateWorkingDay(day, 'isAvailable', checked === true);
                          }}
                        />
                        <Label 
                          htmlFor={`day-${day}`} 
                          className="font-medium min-w-[100px] cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            updateWorkingDay(day, 'isAvailable', !isAvailable);
                          }}
                        >
                          {day}
                        </Label>
                      </div>
                      
                      {isAvailable && (
                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <Input
                              type="time"
                              value={workingDay?.startTime || '09:00'}
                              onChange={(e) => updateWorkingDay(day, 'startTime', e.target.value)}
                              className="w-32"
                            />
                          </div>
                          <span className="text-muted-foreground">to</span>
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={workingDay?.endTime || '17:00'}
                              onChange={(e) => updateWorkingDay(day, 'endTime', e.target.value)}
                              className="w-32"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Slot Configuration */}
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base font-semibold">Slot Configuration</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultDuration">Default Duration (minutes)</Label>
                  <Input
                    id="defaultDuration"
                    type="number"
                    min="15"
                    max="120"
                    step="15"
                    value={slotConfig.defaultDuration}
                    onChange={(e) => setSlotConfig({ ...slotConfig, defaultDuration: parseInt(e.target.value) || 30 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bufferTime">Buffer Time (minutes)</Label>
                  <Input
                    id="bufferTime"
                    type="number"
                    min="0"
                    max="30"
                    step="5"
                    value={slotConfig.bufferTime}
                    onChange={(e) => setSlotConfig({ ...slotConfig, bufferTime: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slotInterval">Slot Interval (minutes)</Label>
                  <Input
                    id="slotInterval"
                    type="number"
                    min="5"
                    max="30"
                    step="5"
                    value={slotConfig.slotInterval}
                    onChange={(e) => setSlotConfig({ ...slotConfig, slotInterval: parseInt(e.target.value) || 15 })}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Availability'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
