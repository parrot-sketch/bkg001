/**
 * Shared surgical-case status labels and badge styles.
 *
 * READY_FOR_WARD_PREP means the case is queued for the nurse checklist
 * ("Awaiting Ward Prep"), not that ward prep is complete.
 * SCHEDULED means a theater slot is booked ("Theater Scheduled"),
 * distinct from the "Schedule Procedure" create action.
 */

export type SurgicalCaseStatusDisplay = {
  label: string;
  /** Badge classes including border (theater-tech / frontdesk style) */
  className: string;
  /** Pill classes with ring (nurse dashboard / list style) */
  pill: string;
};

const FALLBACK: SurgicalCaseStatusDisplay = {
  label: 'Unknown',
  className: 'border border-slate-300 bg-slate-100 text-slate-700',
  pill: 'border border-slate-200 bg-slate-100 text-slate-600 ring-slate-200',
};

export const SURGICAL_CASE_STATUS_DISPLAY: Record<string, SurgicalCaseStatusDisplay> = {
  DRAFT: {
    label: 'Draft',
    className: 'border border-slate-300 bg-slate-100 text-slate-700',
    pill: 'border border-slate-200 bg-slate-100 text-slate-600 ring-slate-200',
  },
  PLANNING: {
    label: 'Planning',
    className: 'border border-amber-300 bg-amber-100 text-amber-800',
    pill: 'border border-amber-200 bg-amber-50 text-amber-700 ring-amber-200',
  },
  READY_FOR_SCHEDULING: {
    label: 'Ready for Scheduling',
    className: 'border border-blue-300 bg-blue-100 text-blue-800',
    pill: 'border border-blue-200 bg-blue-50 text-blue-700 ring-blue-200',
  },
  READY_FOR_WARD_PREP: {
    label: 'Awaiting Ward Prep',
    className: 'border border-amber-300 bg-amber-100 text-amber-800',
    pill: 'border border-amber-200 bg-amber-50 text-amber-700 ring-amber-200',
  },
  IN_WARD_PREP: {
    label: 'In Ward Prep',
    className: 'border border-amber-300 bg-amber-100 text-amber-800',
    pill: 'border border-amber-200 bg-amber-50 text-amber-700 ring-amber-200',
  },
  READY_FOR_THEATER_BOOKING: {
    label: 'Ready for Booking',
    className: 'border border-slate-300 bg-slate-100 text-slate-700',
    pill: 'border border-slate-300 bg-slate-100 text-slate-700 ring-slate-300',
  },
  READY_FOR_THEATER_PREP: {
    label: 'Ready for Theater Prep',
    className: 'border border-blue-300 bg-blue-100 text-blue-800',
    pill: 'border border-blue-200 bg-blue-50 text-blue-700 ring-blue-200',
  },
  SCHEDULED: {
    label: 'Theater Scheduled',
    className: 'border border-indigo-300 bg-indigo-100 text-indigo-800',
    pill: 'border border-indigo-200 bg-indigo-50 text-indigo-700 ring-indigo-200',
  },
  IN_PREP: {
    label: 'In Prep',
    className: 'border border-amber-300 bg-amber-100 text-amber-800',
    pill: 'border border-amber-200 bg-amber-50 text-amber-700 ring-amber-200',
  },
  IN_THEATER: {
    label: 'In Theater',
    className: 'border border-red-300 bg-red-100 text-red-800',
    pill: 'border border-red-200 bg-red-50 text-red-700 ring-red-200',
  },
  RECOVERY: {
    label: 'Recovery',
    className: 'border border-emerald-300 bg-emerald-100 text-emerald-800',
    pill: 'border border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'border border-emerald-300 bg-emerald-100 text-emerald-800',
    pill: 'border border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'border border-red-300 bg-red-100 text-red-800',
    pill: 'border border-red-200 bg-red-50 text-red-700 ring-red-200',
  },
};

export function getSurgicalCaseStatusDisplay(status: string): SurgicalCaseStatusDisplay {
  return SURGICAL_CASE_STATUS_DISPLAY[status] ?? { ...FALLBACK, label: status || FALLBACK.label };
}
