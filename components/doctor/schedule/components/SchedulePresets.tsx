/**
 * SchedulePresets Component
 * 
 * Quick preset buttons for common schedule patterns.
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, Sun, Clock, Moon } from 'lucide-react';
import { CalendarAvailabilitySlot, SlotType } from '@/domain/types/schedule';
import { BASE_DATE } from '../constants';

type PresetKey = 'business' | 'morning' | 'split' | 'night';

interface PresetConfig {
  label: string;
  days: number[];
  blocks: { start: number; end: number; type: SlotType }[];
}

const PRESET_CONFIG: Record<PresetKey, PresetConfig> = {
  business: { 
    label: '9 am – 5 pm Mon–Fri', 
    days: [1,2,3,4,5], 
    blocks: [{ start: 9, end: 17, type: 'CLINIC' }] 
  },
  morning: { 
    label: '7 am – 1 pm Mon–Fri', 
    days: [1,2,3,4,5], 
    blocks: [{ start: 7, end: 13, type: 'CLINIC' }] 
  },
  split: { 
    label: '8 am – 12 pm + 4 pm – 8 pm Mon–Fri', 
    days: [1,2,3,4,5], 
    blocks: [{ start: 8, end: 12, type: 'CLINIC' }, { start: 16, end: 20, type: 'CLINIC' }] 
  },
  night: { 
    label: '6 pm – 12 am Mon–Fri', 
    days: [1,2,3,4,5], 
    blocks: [{ start: 18, end: 24, type: 'CLINIC' }] 
  },
};

interface SchedulePresetsProps {
  onApplyPreset: (preset: PresetKey) => void;
}

export function SchedulePresets({ onApplyPreset }: SchedulePresetsProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Quick Presets</CardTitle>
        <CardDescription className="text-xs">
          One-click schedule templates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs h-9"
          onClick={() => onApplyPreset('business')}
        >
          <Briefcase className="mr-2 h-3.5 w-3.5 text-blue-600" />
          9 AM – 5 PM Mon–Fri
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs h-9"
          onClick={() => onApplyPreset('morning')}
        >
          <Sun className="mr-2 h-3.5 w-3.5 text-amber-500" />
          Morning 7 AM – 1 PM
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs h-9"
          onClick={() => onApplyPreset('split')}
        >
          <Clock className="mr-2 h-3.5 w-3.5 text-teal-600" />
          Split Shift
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs h-9"
          onClick={() => onApplyPreset('night')}
        >
          <Moon className="mr-2 h-3.5 w-3.5 text-indigo-600" />
          Night Shift 6 PM – 12 AM
        </Button>
      </CardContent>
    </Card>
  );
}

export function applyPresetToEvents(preset: PresetKey): CalendarAvailabilitySlot[] {
  const config = PRESET_CONFIG[preset];
  const newEvents: CalendarAvailabilitySlot[] = [];
  let counter = 0;
  
  for (const dayOfWeek of config.days) {
    const date = new Date(BASE_DATE);
    date.setDate(BASE_DATE.getDate() + dayOfWeek);

    for (const block of config.blocks) {
      counter++;
      const start = new Date(date);
      start.setHours(block.start, 0, 0, 0);

      // Handle midnight (24:00) as 23:59 for same-day scheduling
      let endHour = block.end <= block.start ? 23 : block.end;
      let endMin = block.end <= block.start ? 59 : 0;
      
      // If end is 24 (midnight), use 23:59 instead
      if (endHour === 24) {
        endHour = 23;
        endMin = 59;
      }

      const end = new Date(date);
      end.setHours(endHour, endMin, 0, 0);

      newEvents.push({
        id: `preset-${counter}`,
        title: block.type,
        start,
        end,
        type: block.type,
      });
    }
  }
  
  return newEvents;
}
