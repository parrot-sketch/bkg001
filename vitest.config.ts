/**
 * Default vitest config — delegates to the UNIT config so a bare `vitest run`
 * never picks up the DB-backed suites that wipe the dev database.
 *
 *   pnpm test                → unit tests (vitest.config.unit.ts)
 *   pnpm test:integration    → integration tests (vitest.config.integration.ts)
 *
 * See TESTING.md for the full testing strategy.
 */
export { default } from './vitest.config.unit';
