/**
 * Unit Tests: Database Client Singleton
 *
 * Verifies that the Prisma client exported from lib/db.ts is a true
 * singleton — repeated imports always return the same object reference.
 *
 * Regression guard for the production incident:
 *   "FATAL: remaining connection slots are reserved for roles with the SUPERUSER attribute"
 *
 * Root cause was: each import of the DB module used to create a new
 * PrismaClient instance in production, exhausting the connection pool.
 */

import { describe, it, expect } from 'vitest';

describe('PrismaClient Singleton', () => {
  it('default export and named export should be the same instance', async () => {
    // Two separate dynamic imports to simulate two different consumer modules
    const mod1 = await import('../../lib/db');
    const mod2 = await import('../../lib/db');

    // Both the default and named export must resolve to the exact same object
    expect(mod1.default).toBe(mod2.default);
    expect(mod1.db).toBe(mod2.db);
    expect(mod1.default).toBe(mod1.db);
  });

  it('should be cached on globalThis to survive HMR and serverless reuse', async () => {
    const { default: db } = await import('../../lib/db');

    // After the module is loaded, globalThis.prismaGlobal must point to the
    // same instance.  Cast to any because the type augmentation is scoped
    // to the db module.
    expect((globalThis as any).prismaGlobal).toBe(db);
  });

  it('should not be null or undefined', async () => {
    const { default: db } = await import('../../lib/db');

    expect(db).toBeDefined();
    expect(db).not.toBeNull();
  });

  it('should expose standard PrismaClient properties', async () => {
    const { default: db } = await import('../../lib/db');

    // Smoke-check that the exported object is actually a PrismaClient
    expect(typeof db.$connect).toBe('function');
    expect(typeof db.$disconnect).toBe('function');
    expect(typeof db.$queryRaw).toBe('function');
  });
});
