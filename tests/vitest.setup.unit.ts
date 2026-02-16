/**
 * Vitest Setup — UNIT tests
 *
 * Lightweight setup: custom matchers only.
 * NO database connection, NO afterEach DB reset.
 */

import { setupCustomMatchers } from './utils/matchers';

setupCustomMatchers();
