/**
 * Shared calendar configuration
 *
 * Single source of truth for react-big-calendar localizer and CSS imports.
 * Both ScheduleCalendarView and ScheduleSettingsPanel consume this
 * instead of each creating their own instance (DRY).
 */

import { dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';

const locales = { 'en-US': enUS };

export const calendarLocalizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});
