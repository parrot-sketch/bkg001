/**
 * Generates a condensed page-number sequence for the pagination bar.
 *
 * For small totals (≤ 7 pages) every page is shown.
 * For larger totals a sliding window around the current page is shown
 * with ellipsis placeholders on either side.
 *
 * @example
 * generatePageNumbers(5, 12)
 * // → [1, '...', 4, 5, 6, '...', 12]
 */
export function generatePageNumbers(
  current: number,
  total: number,
): ReadonlyArray<number | '...'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [1];

  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push('...');
  pages.push(total);

  return pages;
}
