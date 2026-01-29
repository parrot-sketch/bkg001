'use client';

/**
 * Enhanced Schedule Manager
 * 
 * Enterprise-grade schedule management for doctors:
 * - Multiple sessions per day
 * - Schedule blocks (leave, surgery, admin)
 * - Date-specific overrides
 * - Comprehensive day-by-day scheduling
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { doctorApi } from '@/lib/api/doctor';
import { Clock, Plus, Trash2, Calendar, X, CalendarX } from 'lucide-react';
import type { SetDoctorAvailabilityDto, ScheduleSessionDto } from '@/application/dtos/SetDoctorAvailabilityDto';
import type { CreateScheduleBlockDto } from '@/application/dtos/ScheduleBlockDto';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/patient/useAuth';

interface EnhancedScheduleManagerProps {
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

const BLOCK_TYPES = [
  { label: 'Leave', value: 'LEAVE' },
  { label: 'Surgery', value: 'SURGERY' },
  { label: 'Admin Time', value: 'ADMIN' },
  { label: 'Emergency', value: 'EMERGENCY' },
  { label: 'Conference', value: 'CONFERENCE' },
  { label: 'Training', value: 'TRAINING' },
  { label: 'Other', value: 'OTHER' },
];

const SESSION_TYPES = [
  { label: 'Clinic', value: 'Clinic' },
  { label: 'Consultations', value: 'Consultations' },
  { label: 'Ward Rounds', value: 'Ward Rounds' },
  { label: 'Teleconsult', value: 'Teleconsult' },
  { label: 'Surgery', value: 'Surgery' },
  { label: 'Other', value: 'Other' },
];

export function EnhancedScheduleManager({
  open,
  onClose,
  onSuccess,
  doctorId,
}: EnhancedScheduleManagerProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'weekly' | 'blocks'>('weekly');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [workingDays, setWorkingDays] = useState<SetDoctorAvailabilityDto['workingDays']>([]);
  const [slotConfig, setSlotConfig] = useState({
    defaultDuration: 30,
    bufferTime: 0,
    slotInterval: 15,
  });
  const [blocks, setBlocks] = useState<Array<CreateScheduleBlockDto & { id?: string }>>([]);
  const [newBlock, setNewBlock] = useState<Partial<CreateScheduleBlockDto>>({
    startDate: new Date(),
    endDate: new Date(),
    blockType: 'LEAVE',
  });

  useEffect(() => {
    if (open) {
      loadAvailability();
      loadBlocks();
    }
  }, [open, doctorId]);

  const loadAvailability = async () => {
    setFetching(true);
    try {
      const response = await doctorApi.getMyAvailability();
      if (response.success && response.data) {
        const existingDays: SetDoctorAvailabilityDto['workingDays'] = response.data.workingDays || [];
        const sessions = response.data.sessions || [];

        // Create a map of sessions by day name for easy lookup
        const sessionsByDay = new Map<string, ScheduleSessionDto[]>();
        sessions.forEach((session: any) => {
          const day = session.day;
          if (!sessionsByDay.has(day)) {
            sessionsByDay.set(day, []);
          }
          sessionsByDay.get(day)!.push({
            startTime: session.startTime,
            endTime: session.endTime,
            sessionType: session.sessionType,
            maxPatients: session.maxPatients,
            notes: session.notes,
          });
        });

        const daysMap = new Map<string, SetDoctorAvailabilityDto['workingDays'][0]>(
          existingDays.map((d) => [d.day, d])
        );

        // Map all days and attach sessions
        const allDays: SetDoctorAvailabilityDto['workingDays'] = DAYS_OF_WEEK.map(day => {
          const existing = daysMap.get(day);
          const daySessions = sessionsByDay.get(day) || [];

          if (existing) {
            return {
              ...existing,
              sessions: daySessions, // Attach sessions to working day
            };
          }
          return {
            day,
            startTime: '09:00',
            endTime: '17:00',
            isAvailable: false,
            breaks: [],
            sessions: daySessions, // Even if day not enabled, preserve sessions
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

  const loadBlocks = async () => {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1); // Load blocks from last month
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3); // To 3 months ahead

      const response = await doctorApi.getScheduleBlocks(startDate, endDate);
      if (response.success && response.data) {
        setBlocks(response.data.map((block: any) => ({
          ...block,
          startDate: new Date(block.startDate),
          endDate: new Date(block.endDate),
        })));
      }
    } catch (error) {
      console.error('Error loading blocks:', error);
    }
  };

  const updateWorkingDay = (day: string, field: string, value: any) => {
    setWorkingDays(prev => {
      return prev.map(wd => {
        if (wd.day?.toLowerCase() === day.toLowerCase()) {
          return { ...wd, [field]: value };
        }
        return wd;
      });
    });
  };

  const addSession = (day: string) => {
    setWorkingDays(prev => {
      return prev.map(wd => {
        if (wd.day?.toLowerCase() === day.toLowerCase()) {
          const sessions = wd.sessions || [];
          return {
            ...wd,
            sessions: [
              ...sessions,
              {
                startTime: '09:00',
                endTime: '12:00',
                sessionType: 'Clinic',
              },
            ],
          };
        }
        return wd;
      });
    });
  };

  const removeSession = (day: string, index: number) => {
    setWorkingDays(prev => {
      return prev.map(wd => {
        if (wd.day?.toLowerCase() === day.toLowerCase()) {
          const sessions = wd.sessions || [];
          return {
            ...wd,
            sessions: sessions.filter((_, i) => i !== index),
          };
        }
        return wd;
      });
    });
  };

  const updateSession = (day: string, index: number, field: string, value: any) => {
    setWorkingDays(prev => {
      return prev.map(wd => {
        if (wd.day?.toLowerCase() === day.toLowerCase()) {
          const sessions = wd.sessions || [];
          return {
            ...wd,
            sessions: sessions.map((s, i) => {
              if (i === index) {
                return { ...s, [field]: value };
              }
              return s;
            }),
          };
        }
        return wd;
      });
    });
  };

  const handleSaveWeekly = async () => {
    setLoading(true);
    try {
      // Include days that are marked available OR have sessions configured
      const activeDays = workingDays
        .filter(wd => wd.isAvailable || (wd.sessions && wd.sessions.length > 0))
        .map(wd => ({
          ...wd,
          // Auto-enable days with sessions, ensuring it's always a boolean
          isAvailable: !!(wd.isAvailable || (wd.sessions && wd.sessions.length > 0)),
        }));

      const dto: SetDoctorAvailabilityDto = {
        doctorId,
        workingDays: activeDays,
        slotConfiguration: slotConfig,
      };

      const response = await doctorApi.setMyAvailability(dto);

      if (response.success) {
        toast.success('Weekly schedule updated successfully');
        // Reload availability to get updated data including sessions
        await loadAvailability();
        // Call success callback and close dialog
        onSuccess();
        onClose();
      } else {
        toast.error(response.error || 'Failed to update schedule');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred while updating schedule');
      console.error('Error updating schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlock = async () => {
    if (!newBlock.startDate || !newBlock.endDate || !newBlock.blockType) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const blockDto: CreateScheduleBlockDto = {
        doctorId,
        startDate: newBlock.startDate!,
        endDate: newBlock.endDate!,
        startTime: newBlock.startTime,
        endTime: newBlock.endTime,
        blockType: newBlock.blockType,
        reason: newBlock.reason,
        createdBy: user?.id || doctorId, // Use authenticated user ID
      };

      const response = await doctorApi.createScheduleBlock(blockDto);

      if (response.success) {
        toast.success('Block created successfully');
        setNewBlock({
          startDate: new Date(),
          endDate: new Date(),
          blockType: 'LEAVE',
        });
        loadBlocks();
      } else {
        toast.error(response.error || 'Failed to create block');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred while creating block');
      console.error('Error creating block:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm('Are you sure you want to delete this block?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await doctorApi.deleteScheduleBlock(blockId);

      if (response.success) {
        toast.success('Block deleted successfully');
        loadBlocks();
      } else {
        toast.error(response.error || 'Failed to delete block');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred while deleting block');
      console.error('Error deleting block:', error);
    } finally {
      setLoading(false);
    }
  };

  const isFullDayBlock = !newBlock.startTime || !newBlock.endTime;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Schedule</DialogTitle>
          <DialogDescription>
            Set your weekly schedule with multiple sessions per day, and manage blocks for leave, surgery, and other unavailable periods.
          </DialogDescription>
        </DialogHeader>

        {fetching ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading schedule...</p>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'weekly' | 'blocks')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="weekly">Weekly Schedule</TabsTrigger>
              <TabsTrigger value="blocks">Blocks & Leave</TabsTrigger>
            </TabsList>

            <TabsContent value="weekly" className="space-y-6 mt-6">
              {/* Working Days with Multiple Sessions */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Working Days & Sessions</Label>
                <p className="text-sm text-muted-foreground">
                  Enable days you work and add multiple time sessions per day (e.g., Morning Clinic, Afternoon Consultations).
                </p>
                <div className="space-y-4">
                  {DAYS_OF_WEEK.map(day => {
                    const workingDay = workingDays.find(wd => wd.day?.toLowerCase() === day.toLowerCase());
                    const isAvailable = workingDay?.isAvailable || false;
                    const sessions = workingDay?.sessions || [];

                    return (
                      <div
                        key={day}
                        className="p-4 border rounded-lg space-y-4"
                      >
                        <div className="flex items-center gap-3">
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
                          >
                            {day}
                          </Label>
                        </div>

                        {isAvailable && (
                          <div className="ml-8 space-y-3">
                            {sessions.length === 0 ? (
                              <div className="text-sm text-muted-foreground italic">
                                No sessions configured. Add a session or use default start/end time.
                              </div>
                            ) : (
                              sessions.map((session, index) => (
                                <div key={index} className="flex items-center gap-3 p-3 bg-accent rounded-lg">
                                  <div className="flex-1 grid grid-cols-4 gap-3">
                                    <div>
                                      <Label className="text-xs">Start Time</Label>
                                      <Input
                                        type="time"
                                        value={session.startTime}
                                        onChange={(e) => updateSession(day, index, 'startTime', e.target.value)}
                                        className="w-full"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">End Time</Label>
                                      <Input
                                        type="time"
                                        value={session.endTime}
                                        onChange={(e) => updateSession(day, index, 'endTime', e.target.value)}
                                        className="w-full"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Session Type</Label>
                                      <Select
                                        value={session.sessionType || 'Clinic'}
                                        onValueChange={(value) => updateSession(day, index, 'sessionType', value)}
                                      >
                                        <SelectTrigger className="w-full">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {SESSION_TYPES.map(type => (
                                            <SelectItem key={type.value} value={type.value}>
                                              {type.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="flex items-end">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeSession(day, index)}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addSession(day)}
                              className="ml-0"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Session
                            </Button>

                            {/* Backward Compatibility: Show start/end time if no sessions */}
                            {sessions.length === 0 && (
                              <div className="flex items-center gap-2 pt-2 border-t">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="time"
                                    value={workingDay?.startTime || '09:00'}
                                    onChange={(e) => updateWorkingDay(day, 'startTime', e.target.value)}
                                    className="w-32"
                                    placeholder="Start"
                                  />
                                  <span className="text-muted-foreground">to</span>
                                  <Input
                                    type="time"
                                    value={workingDay?.endTime || '17:00'}
                                    onChange={(e) => updateWorkingDay(day, 'endTime', e.target.value)}
                                    className="w-32"
                                    placeholder="End"
                                  />
                                  <span className="text-xs text-muted-foreground ml-2">
                                    (Used if no sessions)
                                  </span>
                                </div>
                              </div>
                            )}
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

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleSaveWeekly} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Weekly Schedule'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="blocks" className="space-y-6 mt-6">
              {/* Create New Block */}
              <div className="space-y-4 p-4 border rounded-lg">
                <Label className="text-base font-semibold">Create Block</Label>
                <p className="text-sm text-muted-foreground">
                  Block time periods for leave, surgery, admin work, or other unavailability.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !newBlock.startDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {newBlock.startDate ? format(newBlock.startDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={newBlock.startDate}
                          onSelect={(date) => setNewBlock({ ...newBlock, startDate: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !newBlock.endDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {newBlock.endDate ? format(newBlock.endDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={newBlock.endDate}
                          onSelect={(date) => setNewBlock({ ...newBlock, endDate: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Block Type</Label>
                  <Select
                    value={newBlock.blockType}
                    onValueChange={(value) => setNewBlock({ ...newBlock, blockType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select block type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOCK_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="fullDay"
                      checked={isFullDayBlock}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewBlock({ ...newBlock, startTime: undefined, endTime: undefined });
                        } else {
                          setNewBlock({ ...newBlock, startTime: '09:00', endTime: '17:00' });
                        }
                      }}
                    />
                    <Label htmlFor="fullDay" className="cursor-pointer">Full Day Block</Label>
                  </div>
                </div>

                {!isFullDayBlock && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={newBlock.startTime || ''}
                        onChange={(e) => setNewBlock({ ...newBlock, startTime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={newBlock.endTime || ''}
                        onChange={(e) => setNewBlock({ ...newBlock, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Reason (Optional)</Label>
                  <Input
                    placeholder="e.g., Annual leave, Surgery schedule"
                    value={newBlock.reason || ''}
                    onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })}
                  />
                </div>

                <Button
                  type="button"
                  onClick={handleAddBlock}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Creating...' : 'Create Block'}
                </Button>
              </div>

              {/* Existing Blocks */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Existing Blocks</Label>
                {blocks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarX className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No blocks created yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {blocks.map((block, index) => (
                      <div key={block.id || index} className="p-4 border rounded-lg flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {format(new Date(block.startDate), 'MMM d')} - {format(new Date(block.endDate), 'MMM d, yyyy')}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({BLOCK_TYPES.find(t => t.value === block.blockType)?.label || block.blockType})
                            </span>
                          </div>
                          {block.startTime && block.endTime && (
                            <p className="text-sm text-muted-foreground">
                              {block.startTime} - {block.endTime}
                            </p>
                          )}
                          {block.reason && (
                            <p className="text-sm text-muted-foreground mt-1">{block.reason}</p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => block.id && handleDeleteBlock(block.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
