/**
 * jest-dom Setup
 *
 * Registers Jest-compatible DOM matchers with Vitest.
 * Provides matchers like: toBeInTheDocument, toHaveTextContent, toHaveAttribute, etc.
 */

import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

export function setupJestDOM(): void {
  for (const [name, fn] of Object.entries(matchers)) {
    if (typeof fn === 'function') {
      expect.extend({ [name]: fn });
    }
  }
}

setupJestDOM();
