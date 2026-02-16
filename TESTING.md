# Testing Guide

## Testing Pyramid

```
                ┌───────────────┐
                │   E2E Tests   │  ← Playwright (manual / nightly)
                │  (Playwright) │
                └───────┬───────┘
               ┌────────┴────────┐
               │  Integration    │  ← Docker Postgres (CI + local)
               │  (real Prisma)  │
               └────────┬────────┘
          ┌──────────────┴──────────────┐
          │        Unit Tests           │  ← Every push / PR
          │  (mocked repos, vi.fn())    │
          └─────────────────────────────┘
```

## Quick Reference

| Command | What it runs | DB required? | When |
|---|---|---|---|
| `pnpm test` | Unit tests only | No | Every push |
| `pnpm test:unit` | Unit tests only (alias) | No | Every push |
| `pnpm test:unit:watch` | Unit tests in watch mode | No | Local dev |
| `pnpm test:integration` | Integration tests | Docker Postgres | CI + manual |
| `pnpm test:all` | Unit + Integration | Docker Postgres | Pre-release |
| `pnpm test:coverage` | Unit tests + coverage | No | On demand |
| `pnpm test:e2e` | Playwright E2E | Running app | Manual / nightly |

## Tier 1: Unit Tests

**769 tests · ~7s · zero external dependencies**

Unit tests run against fully mocked dependencies. No database, no network, no Docker.

### What's included

- `tests/unit/**/*.test.ts` — Use case tests, domain entity tests, service tests, mapper tests
- `tests/infrastructure/**/*.test.ts` — Repository tests with mocked Prisma
- `tests/integration/appointment-scheduling.test.ts` — Uses `FakeAppointmentRepository` (in-memory)

### Configuration

- **Vitest config**: `vitest.config.unit.ts`
- **Setup file**: `tests/vitest.setup.unit.ts` — No DB reset, no real connections

### Running locally

```bash
pnpm test              # single run
pnpm test:unit:watch   # watch mode for TDD
pnpm test:coverage     # with coverage report
```

### Key patterns

- All database calls are mocked via `vi.fn()` on repository interfaces
- Use cases that directly import `@/lib/db` are mocked at module level:
  ```ts
  vi.mock('@/lib/db', () => ({ default: { ... } }));
  ```
- `PrismaClientKnownRequestError` must be constructed with `new Prisma.PrismaClientKnownRequestError(...)` for `instanceof` checks to work

## Tier 2: Integration Tests

**Real Postgres · Docker Compose · deterministic**

Integration tests run against a real (but ephemeral) Postgres database. No Prisma Accelerate dependency.

### What's included

- `tests/integration/**/*.test.ts` (excluding the in-memory scheduling test)

### Configuration

- **Vitest config**: `vitest.config.integration.ts`
- **Setup file**: `tests/vitest.setup.integration.ts` — Includes `afterEach` DB reset
- **Docker**: `docker-compose.test.yml` — Postgres 16 on port 5434, RAM-backed (`tmpfs`)

### Running locally

```bash
# Automatic: starts Docker Postgres, runs tests, tears down
pnpm test:integration

# Manual Docker management:
docker compose -f docker-compose.test.yml up -d
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/test_db" pnpm prisma db push --skip-generate --accept-data-loss
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/test_db" pnpm vitest run --config vitest.config.integration.ts
docker compose -f docker-compose.test.yml down --volumes
```

### CI

Integration tests run automatically in GitHub Actions CI. The workflow uses a `services.postgres` container — no Docker-in-Docker needed.

## Tier 3: E2E Tests

**Playwright · full browser · manual/nightly**

E2E tests exercise the complete stack (browser → Next.js → API → DB).

```bash
pnpm test:e2e          # headless
pnpm test:e2e:headed   # with browser UI
pnpm test:e2e:debug    # step-through debugger
pnpm test:e2e:report   # view last report
```

## Architecture Decision: No Prisma Accelerate in Tests

Previous test failures (`P6003: plan limit reached`) were caused by the global test setup attempting real database resets through Prisma Accelerate on every test — including pure unit tests.

**Solution:**
1. **Split configs** — Unit tests get `vitest.config.unit.ts` with no DB setup
2. **Docker Postgres** — Integration tests use local Postgres, no Accelerate
3. **Module mocks** — Use cases importing `@/lib/db` directly are mocked at module level

This makes the test suite:
- **Deterministic** — No quota limits, no network dependencies
- **Fast** — Unit tests run in ~7s with zero I/O
- **CI-friendly** — Docker Postgres is standard infrastructure

## Writing New Tests

### Adding a unit test

1. Create file in `tests/unit/` matching the module structure
2. Mock all repository/service dependencies with `vi.fn()`
3. If the SUT imports `@/lib/db` directly, add `vi.mock('@/lib/db', ...)`
4. Run: `pnpm test`

### Adding an integration test

1. Create file in `tests/integration/`
2. Use real Prisma client (comes from `tests/setup/test-database.ts`)
3. The `afterEach` hook in the integration setup will clean the DB between tests
4. Run: `pnpm test:integration`

### Prisma error mocking

Always construct proper error instances:

```ts
import { Prisma } from '@prisma/client';

// ✅ Correct — instanceof check works
const error = new Prisma.PrismaClientKnownRequestError(
  'Unique constraint failed',
  { code: 'P2002', clientVersion: '5.0.0' }
);

// ❌ Wrong — plain object fails instanceof check
const error = { code: 'P2002', message: 'Unique constraint failed' };
```
