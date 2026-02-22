/**
 * ScheduleSettingsPanelV2 Component
 * 
 * Main component for managing doctor schedule settings.
 * Refactored to use domain types, hooks, and smaller focused components.
 */

'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, Undo2, Redo2, CalendarDays, Info, Settings2 } from 'lucide-react';
import { updateAvailability, updateSlotConfiguration } from '@/app/actions/schedule';
import { SlotEditorDialog, SlotData } from './SlotEditorDialog';
import { SlotConfigurationPanel } from './SlotConfigurationPanel';
import type { SlotConfiguration } from '@/lib/validation/slotConfigValidation';
import { BulkOperationsPanel } from './BulkOperationsPanel';
import { useUndoRedo } from './useUndoRedo';
import { useScheduleTemplate } from './hooks/useScheduleTemplate';
import { useSlotConfiguration } from './hooks/useSlotConfiguration';
import { WeeklyTemplateEditor } from './components/WeeklyTemplateEditor';
import { WeeklySummary } from './components/WeeklySummary';
import { SchedulePresets, applyPresetToEvents } from './components/SchedulePresets';
import { CalendarAvailabilitySlot, WorkingDay, SlotType } from '@/domain/types/schedule';
import { mapWorkingDaysToCalendar, mapCalendarToWorkingDay } from '@/infrastructure/mappers/ScheduleMapper';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ScheduleSettingsPanelProps {
  initialWorkingDays?: WorkingDay[];
  initialSlotConfig?: SlotConfiguration | null;
  userId: string;
}

export function ScheduleSettingsPanelV2({ 
  initialWorkingDays = [], 
  initialSlotConfig,
  userId 
}: ScheduleSettingsPanelProps) {
  const [saving, setSaving] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [activeTab, setActiveTab] = useState<'template' | 'config'>('template');

  // Initialize template hook
  const template = useScheduleTemplate({ initialWorkingDays });
  
  // Initialize slot configuration hook
  const slotConfig = useSlotConfiguration({ initialConfig: initialSlotConfig });

  // Undo/Redo functionality for template
  const { state: events, setState: setEvents, undo, redo, canUndo, canRedo } = useUndoRedo<CalendarAvailabilitySlot[]>(
    mapWorkingDaysToCalendar(initialWorkingDays)
  );

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogSlot, setDialogSlot] = useState<SlotData | null>(null);

  // Event handlers
  const onEventResize = useCallback((event: CalendarAvailabilitySlot, start: Date, end: Date) => {
    const newEvents = events.map((ev) => 
      ev.id === event.id ? { ...ev, start, end } : ev
    );
    setEvents(newEvents);
  }, [events, setEvents]);

  const onEventDrop = useCallback((event: CalendarAvailabilitySlot, start: Date, end: Date) => {
    const newEvents = events.map((ev) => 
      ev.id === event.id ? { ...ev, start, end } : ev
    );
    setEvents(newEvents);
  }, [events, setEvents]);

  const handleSelectSlot = useCallback((start: Date, end: Date) => {
    setDialogSlot({ start, end, type: 'CLINIC' });
    setIsDialogOpen(true);
  }, []);

  const handleSelectEvent = useCallback((event: CalendarAvailabilitySlot) => {
    setDialogSlot({ 
      id: event.id, 
      start: event.start, 
      end: event.end, 
      type: event.type 
    });
    setIsDialogOpen(true);
  }, []);

  const handleSaveSlot = useCallback((slotData: SlotData) => {
    let newEvents: CalendarAvailabilitySlot[];
    if (slotData.id) {
      newEvents = events.map(e => 
        e.id === slotData.id 
          ? { ...e, start: slotData.start, end: slotData.end, type: slotData.type as SlotType, title: slotData.type }
          : e
      );
    } else {
      const newEvent: CalendarAvailabilitySlot = {
        id: Math.random().toString(36).substr(2, 9),
        title: slotData.type,
        start: slotData.start,
        end: slotData.end,
        type: slotData.type as SlotType
      };
      newEvents = [...events, newEvent];
    }
    setEvents(newEvents);
  }, [events, setEvents]);

  const handleDeleteSlot = useCallback((id: string) => {
    const newEvents = events.filter((e) => e.id !== id);
    setEvents(newEvents);
  }, [events, setEvents]);

  // Bulk operations
  const handleCopyDay = useCallback((sourceDay: number, targetDays: number[]) => {
    const sourceSlots = events.filter(e => e.start.getDay() === sourceDay);
    if (sourceSlots.length === 0) {
      toast.error('No slots found for selected day');
      return;
    }

    const newEvents = [...events];
    targetDays.forEach(targetDay => {
      const filtered = newEvents.filter(e => e.start.getDay() !== targetDay);
      
      sourceSlots.forEach(slot => {
        const date = new Date(2000, 0, 2);
        date.setDate(date.getDate() + targetDay);
        const timeDiff = slot.end.getTime() - slot.start.getTime();
        
        const newStart = new Date(date);
        newStart.setHours(slot.start.getHours(), slot.start.getMinutes(), 0, 0);
        
        const newEnd = new Date(newStart.getTime() + timeDiff);
        
        filtered.push({
          ...slot,
          id: Math.random().toString(36).substr(2, 9),
          start: newStart,
          end: newEnd,
        });
      });
      
      newEvents.length = 0;
      newEvents.push(...filtered);
    });
    
    setEvents(newEvents);
    toast.success(`Copied ${sourceSlots.length} slot(s) to ${targetDays.length} day(s)`);
  }, [events, setEvents]);

  const handleSetAllWeekdays = useCallback((startTime: string, endTime: string, type: string) => {
    const weekdays = [1, 2, 3, 4, 5];
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const newEvents = events.filter(e => !weekdays.includes(e.start.getDay()));
    
    weekdays.forEach(day => {
      const date = new Date(2000, 0, 2);
      date.setDate(date.getDate() + day);
      
      const start = new Date(date);
      start.setHours(startH, startM, 0, 0);
      
      const end = new Date(date);
      end.setHours(endH, endM, 0, 0);
      
      newEvents.push({
        id: Math.random().toString(36).substr(2, 9),
        title: type,
        start,
        end,
        type: type as SlotType,
      });
    });
    
    setEvents(newEvents);
    toast.success('Set all weekdays to ' + startTime + ' - ' + endTime);
  }, [events, setEvents]);

  const handleClearAll = useCallback(() => {
    setEvents([]);
    toast.success('All slots cleared');
  }, [setEvents]);

  const handleApplyPreset = useCallback((preset: 'business' | 'morning' | 'split' | 'night') => {
    if (!confirm(`Replace all current slots with ${preset} preset?`)) return;
    const newEvents = applyPresetToEvents(preset);
    setEvents(newEvents);
  }, [setEvents]);

  // Save template to server
  const handleSave = async () => {
    try {
      setSaving(true);

      const workingDays: WorkingDay[] = events.map(mapCalendarToWorkingDay);

      const result = await updateAvailability({
        doctorId: userId,
        templateName: 'Standard Week',
        slots: workingDays.map(wd => ({
          dayOfWeek: wd.dayOfWeek,
          startTime: wd.startTime,
          endTime: wd.endTime,
          type: wd.type,
        }))
      });

      if (result.success) {
        toast.success('Weekly schedule saved successfully');
      } else {
        toast.error('Failed to save schedule');
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  // Save slot configuration to server
  const handleSaveSlotConfig = async () => {
    try {
      setSavingConfig(true);

      const { validateSlotConfig } = await import('@/lib/validation/slotConfigValidation');
      const validation = validateSlotConfig(slotConfig.config);
      
      if (!validation.isValid) {
        const errors = validation.issues.filter(i => i.severity === 'error');
        if (errors.length > 0) {
          toast.error('Cannot save configuration', {
            description: errors[0].message + (errors[0].suggestion ? ` ${errors[0].suggestion}` : ''),
            duration: 5000,
          });
          return;
        }
      }

      const result = await updateSlotConfiguration({
        doctorId: userId,
        defaultDuration: slotConfig.config.defaultDuration,
        slotInterval: slotConfig.config.slotInterval,
        bufferTime: slotConfig.config.bufferTime,
      });

      if (result.success) {
        toast.success('Slot configuration saved successfully');
      } else {
        toast.error('Failed to save slot configuration');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'An error occurred while saving slot configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  // Check for changes
  const initialEvents = mapWorkingDaysToCalendar(initialWorkingDays);
  const hasChanges = JSON.stringify(events) !== JSON.stringify(initialEvents);

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Schedule Configuration</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your weekly availability template and slot settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Undo/Redo (only for template tab) */}
          {activeTab === 'template' && (
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={undo}
                disabled={!canUndo}
                className="h-8 w-8 p-0"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={redo}
                disabled={!canRedo}
                className="h-8 w-8 p-0"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </div>
          )}
          {/* Save Button */}
          {activeTab === 'template' ? (
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              size="lg"
              className={cn(
                "min-w-[140px]",
                hasChanges && !saving && "bg-teal-600 hover:bg-teal-700 shadow-md"
              )}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {hasChanges ? 'Save Changes' : 'Saved'}
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleSaveSlotConfig}
              disabled={savingConfig || !slotConfig.hasChanges}
              size="lg"
              className={cn(
                "min-w-[140px]",
                slotConfig.hasChanges && !savingConfig && "bg-teal-600 hover:bg-teal-700 shadow-md"
              )}
            >
              {savingConfig ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {slotConfig.hasChanges ? 'Save Config' : 'Saved'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'template' | 'config')}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="template" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Weekly Template
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Slot Settings
          </TabsTrigger>
        </TabsList>

        {/* Template Tab */}
        <TabsContent value="template" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Editor */}
            <div className="lg:col-span-2 space-y-4">
              {/* Info Banner */}
              <div className="bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-950/30 dark:to-blue-950/30 border border-teal-200 dark:border-teal-800 rounded-xl p-4 flex items-start gap-3">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/50 rounded-lg">
                  <Info className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-teal-900 dark:text-teal-100">
                    Weekly Recurring Schedule
                  </p>
                  <p className="text-xs text-teal-700 dark:text-teal-300 mt-1.5 leading-relaxed">
                    This defines your repeating weekly pattern. Click and drag on the calendar to create availability windows.
                    Changes are saved when you click "Save Changes".
                  </p>
                </div>
              </div>

              <WeeklyTemplateEditor
                events={events}
                onEventDrop={onEventDrop}
                onEventResize={onEventResize}
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <BulkOperationsPanel
                events={events}
                onCopyDay={handleCopyDay}
                onSetAllWeekdays={handleSetAllWeekdays}
                onClearAll={handleClearAll}
              />

              <SchedulePresets onApplyPreset={handleApplyPreset} />

              <WeeklySummary events={events} />
            </div>
          </div>
        </TabsContent>

        {/* Slot Configuration Tab */}
        <TabsContent value="config" className="mt-4">
          <div className="max-w-2xl space-y-4">
            <SlotConfigurationPanel
              config={slotConfig.config}
              onChange={slotConfig.updateConfig}
            />
            {slotConfig.hasChanges && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  You have unsaved slot configuration changes. Click "Save Config" to apply them.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Slot Editor Dialog */}
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
