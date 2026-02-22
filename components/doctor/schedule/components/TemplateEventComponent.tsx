/**
 * TemplateEventComponent
 * 
 * Custom event component for the calendar view.
 */

import { CalendarAvailabilitySlot } from '@/domain/types/schedule';
import { SLOT_TYPE_CONFIG } from '../constants';

interface TemplateEventComponentProps {
  event: CalendarAvailabilitySlot;
}

export function TemplateEventComponent({ event }: TemplateEventComponentProps) {
  const config = SLOT_TYPE_CONFIG[event.type] || SLOT_TYPE_CONFIG.CLINIC;
  const Icon = config.icon;
  
  return (
    <div className="flex items-center gap-1.5 overflow-hidden">
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="text-[0.7rem] font-medium truncate">{config.label}</span>
    </div>
  );
}
