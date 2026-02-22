/**
 * WeeklySummary Component
 * 
 * Displays a summary of the weekly schedule.
 */

'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { CalendarAvailabilitySlot } from '@/domain/types/schedule';
import { SLOT_TYPE_CONFIG, DAY_NAMES_SHORT } from '../constants';
import { cn } from '@/lib/utils';

interface WeeklySummaryProps {
  events: CalendarAvailabilitySlot[];
}

export function WeeklySummary({ events }: WeeklySummaryProps) {
  const weekSummary = useMemo(() => {
    const summary: Record<number, { slots: CalendarAvailabilitySlot[]; totalMinutes: number }> = {};
    for (let i = 0; i < 7; i++) {
      summary[i] = { slots: [], totalMinutes: 0 };
    }
    for (const ev of events) {
      const day = ev.start.getDay();
      summary[day].slots.push(ev);
      summary[day].totalMinutes += (ev.end.getTime() - ev.start.getTime()) / 60000;
    }
    return summary;
  }, [events]);

  const totalWeeklyHours = useMemo(() => {
    return Object.values(weekSummary).reduce((acc, day) => acc + day.totalMinutes, 0) / 60;
  }, [weekSummary]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Weekly Summary</CardTitle>
          <Badge variant="secondary" className="text-xs font-semibold">
            <Clock className="h-3 w-3 mr-1" />
            {totalWeeklyHours.toFixed(1)}h
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 0].map(day => {
            const { slots, totalMinutes } = weekSummary[day];
            const hours = Math.floor(totalMinutes / 60);
            const mins = totalMinutes % 60;

            return (
              <div
                key={day}
                className={cn(
                  "flex items-center justify-between py-2 px-3 rounded-lg transition-all",
                  slots.length > 0 
                    ? "bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-950/20 dark:to-blue-950/20 border border-teal-100 dark:border-teal-900" 
                    : "bg-muted/30 opacity-60"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-10">
                    {DAY_NAMES_SHORT[day]}
                  </span>
                  {slots.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {slots
                        .sort((a, b) => a.start.getTime() - b.start.getTime())
                        .map(ev => {
                          const config = SLOT_TYPE_CONFIG[ev.type] || SLOT_TYPE_CONFIG.CLINIC;
                          return (
                            <span key={ev.id} className="text-xs text-muted-foreground">
                              {format(ev.start, 'h:mm a')} – {format(ev.end, 'h:mm a')}
                              <span
                                className="ml-2 inline-block px-1.5 py-0.5 rounded text-[0.6rem] font-medium text-white shadow-sm"
                                style={{ backgroundColor: config.color }}
                              >
                                {config.label}
                              </span>
                            </span>
                          );
                        })}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Off</span>
                  )}
                </div>
                {slots.length > 0 && (
                  <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                    {hours > 0 ? `${hours}h` : ''}{mins > 0 ? `${mins}m` : ''}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
