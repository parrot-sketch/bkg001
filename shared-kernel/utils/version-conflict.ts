/**
 * Shared Kernel — Version Conflict Detection
 *
 * Pure utility for detecting version conflict markers in API error messages.
 */

const VERSION_CONFLICT_MARKERS = [
  'updated by another session',
  'VERSION_CONFLICT',
];

export function isVersionConflict(errorMessage: string | undefined): boolean {
  if (!errorMessage) return false;
  const lower = errorMessage.toLowerCase();
  return VERSION_CONFLICT_MARKERS.some((marker) => lower.includes(marker.toLowerCase()));
}
