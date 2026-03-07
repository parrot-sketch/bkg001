/**
 * TemplateEventComponent
 *
 * Rich availability slot display in the weekly template editor.
 * Shows session type, time range, and duration in a clean card layout.
 */

'use client';

import { format } from 'date-fns';
import { CalendarAvailabilitySlot } from '@/domain/types/schedule';
import { SLOT_TYPE_CONFIG } from '../constants';

interface TemplateEventComponentProps {
    event: CalendarAvailabilitySlot;
    [key: string]: any; // react-big-calendar passes extra props
}

export function TemplateEventComponent({ event }: TemplateEventComponentProps) {
    const config = SLOT_TYPE_CONFIG[event.type] || SLOT_TYPE_CONFIG.CLINIC;
    const Icon = config.icon;

    const durationMins = Math.round(
        (event.end.getTime() - event.start.getTime()) / 60000
    );
    const hrs = Math.floor(durationMins / 60);
    const mins = durationMins % 60;
    const durationLabel = hrs > 0
        ? `${hrs}h${mins > 0 ? ` ${mins}m` : ''}`
        : `${mins}m`;

    const startLabel = format(event.start, 'h:mm a');
    const endLabel = format(event.end, 'h:mm a');

    // Compact view for short blocks (< 45 min)
    if (durationMins < 45) {
        return (
            <div className="flex items-center gap-1.5 overflow-hidden h-full px-0.5">
                <Icon className="h-3 w-3 flex-shrink-0 opacity-90" />
                <span className="text-[0.68rem] font-semibold leading-none truncate">
                    {config.label}
                </span>
                <span className="text-[0.6rem] opacity-75 leading-none ml-auto whitespace-nowrap hidden sm:block">
                    {startLabel}
                </span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-0.5 overflow-hidden h-full px-0.5 py-0.5">
            {/* Type badge row */}
            <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-[0.72rem] font-bold leading-tight truncate">
                    {config.label}
                </span>
            </div>
            {/* Time range */}
            <span className="text-[0.62rem] opacity-85 leading-tight">
                {startLabel} – {endLabel}
            </span>
            {/* Duration pill — only when tall enough */}
            {durationMins >= 90 && (
                <span className="text-[0.58rem] opacity-70 leading-tight mt-auto">
                    {durationLabel}
                </span>
            )}
        </div>
    );
}
