/**
 * Frontend Test Setup — Global Configuration
 *
 * This file is the single entry point for all frontend test setup.
 * It configures jest-dom matchers, browser API mocks, and RTL cleanup.
 */

import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { setupCustomMatchers } from '../../utils/matchers';
import { setupJestDOM } from './jest-dom-setup';
import { mockBrowserGlobals } from './browser-mocks';

setupCustomMatchers();
setupJestDOM();
mockBrowserGlobals();

afterEach(() => {
  cleanup();
});
