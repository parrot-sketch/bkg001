/**
 * Accessibility Helpers
 *
 * Provides utilities for asserting component accessibility in tests.
 */

export function getAccessibleName(element: Element): string {
  return element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '';
}
