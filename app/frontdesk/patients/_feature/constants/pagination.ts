/**
 * Pagination & layout constants for the patient registry page.
 * Centralised here so every consumer reads from a single source of truth.
 */

/** Number of patients fetched per page in browse (infinite-scroll) mode. */
export const BATCH_SIZE = 50;

/** Number of patients fetched per page in search / filter mode. */
export const SEARCH_BATCH_SIZE = 12;

/** Tailwind class applied to the scrollable patient list container. */
export const LIST_MAX_HEIGHT = 'max-h-[60vh]';
