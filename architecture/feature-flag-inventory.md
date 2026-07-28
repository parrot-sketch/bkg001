# Feature Flag Inventory

## Executive Summary

This document provides the final feature flag inventory after PR-A07-01 cleanup.

**Audit Date:** 2026-07-24  
**Status:** All migration-era flags removed. Zero active flags.

---

## 1. Final Feature Flag Registry

### Active Production Flags

| Flag | Env Variable | Status | Owner | Description |
|------|-------------|--------|-------|-------------|
| *None* | — | — | — | — |

**Count:** 0

### Temporary Migration Flags (Removed)

| Flag | Env Variable | Status | Removed In | Reason |
|------|-------------|--------|------------|--------|
| `USE_SESSION_SERVICE` | `NEXT_PUBLIC_USE_SESSION_SERVICE` | REMOVED | PR-A07-01 | SessionProvider calls SessionService directly |
| `USE_DRAFT_SERVICE` | `NEXT_PUBLIC_USE_DRAFT_SERVICE` | REMOVED | PR-A07-01 | DraftService is sole draft owner |
| `USE_QUEUE_SERVICE` | `NEXT_PUBLIC_USE_QUEUE_SERVICE` | REMOVED | PR-A07-01 | QueueProvider is sole queue owner |
| `USE_PATIENT_CONTEXT` | `NEXT_PUBLIC_USE_PATIENT_CONTEXT` | REMOVED | PR-A07-01 | PatientProvider is sole patient owner |
| `USE_DOCUMENTATION_PROVIDER` | `NEXT_PUBLIC_USE_DOCUMENTATION_PROVIDER` | REMOVED | PR-A07-01 | DocumentationProvider is sole documentation owner |
| `USE_BILLING_PROVIDER` | `NEXT_PUBLIC_USE_BILLING_PROVIDER` | REMOVED | PR-A07-01 | BillingProvider is sole billing owner |
| `USE_SESSION_PROVIDER` | `NEXT_PUBLIC_USE_SESSION_PROVIDER` | REMOVED | PR-A07-01 | SessionProvider is production orchestrator |
| `USE_QUEUE_PROVIDER` | `NEXT_PUBLIC_USE_QUEUE_PROVIDER` | REMOVED | PR-A07-01 | QueueProvider is production provider |
| `USE_NOTIFICATION_PROVIDER` | `NEXT_PUBLIC_USE_NOTIFICATION_PROVIDER` | REMOVED | PR-A07-01 | NotificationProvider never implemented |

**Count:** 9 removed

### Future Flags

| Flag | Env Variable | Status | Planned | Description |
|------|-------------|--------|---------|-------------|
| *None* | — | — | — | — |

**Count:** 0

---

## 2. Feature Flag Infrastructure

### Removed

| Component | File | Status |
|-----------|------|--------|
| `FEATURE_FLAGS` constant | `shared-kernel/feature-flags.ts` | REMOVED |
| `isFeatureEnabled` function | `shared-kernel/feature-flags.ts` | REMOVED |
| `getAllFlags` function | `shared-kernel/feature-flags.ts` | REMOVED |
| `useFeatureFlag` hook | `shared-kernel/flags/useFeatureFlag.ts` | REMOVED |
| Feature flag tests | `tests/unit/lib/feature-flags.test.ts` | REMOVED |
| Hook tests | `tests/unit/lib/useFeatureFlag.test.ts` | REMOVED |

### Preserved (Core Infrastructure)

The feature flag infrastructure was entirely removed. If future feature flags are needed, they should be reintroduced using a modern feature flag system (e.g., LaunchDarkly, Split.io, or a simple internal toggles registry).

---

## 3. Verification

### 3.1 Zero Dead Flag Reads

```bash
grep -rn "isFeatureEnabled\|useFeatureFlag\|FEATURE_FLAGS" \
  --include="*.ts" --include="*.tsx" \
  app/ components/ providers/ contexts/ lib/
# Result: No matches
```

### 3.2 Zero Environment Variables

```bash
grep -i "NEXT_PUBLIC_USE_" .env .env.example
# Result: No matches
```

### 3.3 All Tests Pass

```bash
npx vitest run --config vitest.config.unit.ts
# Result: 1665 passed

npx vitest run --config vitest.config.frontend.ts
# Result: 69 passed
```

---

## 4. Recommendations

1. **Future feature flags:** If feature flags are needed again, introduce them with a proper external service rather than environment variables.
2. **Gradual rollout:** Use percentage rollouts and user targeting instead of boolean flags.
3. **Flag cleanup policy:** Any new feature flag must have an expiration date and owner.

---

## 5. Summary

| Category | Count |
|----------|-------|
| Active production flags | 0 |
| Temporary migration flags removed | 9 |
| Future flags planned | 0 |
| Dead flag infrastructure files removed | 6 |
| Dead test files removed | 2 |
| **Total legacy flag artifacts removed** | **17** |

**Feature flag system status:** Fully decommissioned. No dead flags remain.
