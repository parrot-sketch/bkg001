/**
 * Ensure doctor names render with a single "Dr." prefix.
 *
 * Data in the DB may already include "Dr" or "Dr." in the stored name.
 * UIs should call this helper instead of blindly prefixing.
 */
export function formatDoctorName(name: string | null | undefined): string {
  if (!name) return '';

  const trimmed = name.trim();
  if (!trimmed) return '';

  // Remove repeated leading prefixes like:
  // "Dr", "Dr.", "DR", "Dr Dr", "Dr. Dr. ", etc.
  const withoutPrefix = trimmed.replace(/^(dr\.?\s*)+/i, '').trim();
  if (!withoutPrefix) return 'Dr.';

  return `Dr. ${withoutPrefix}`;
}

