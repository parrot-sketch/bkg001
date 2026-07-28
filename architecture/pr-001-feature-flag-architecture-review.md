# PR-001 Architecture Review: Feature Flag Infrastructure

## 1. Architecture Review

### Overall Assessment

The PR-001 implementation establishes a **functionally correct** feature flag foundation. The core registry (`lib/feature-flags.ts`) is clean, type-safe, and pure. However, the implementation includes a **React Context that is premature, architecturally misplaced, and creates unnecessary coupling** before any consumer has been introduced.

**Verdict: Approved with Minor Improvements**

The implementation should become the permanent foundation **after removing the React Context layer** and making two small API refinements. The registry and hook are sound. The Context is not.

---

## 2. Layer Compliance Matrix

| Artifact | Layer | Expected | Actual | Compliant |
|----------|-------|----------|--------|-----------|
| `lib/feature-flags.ts` | Shared Kernel / Utility | Pure TS, no framework | Pure TS, no framework | **Yes** |
| `lib/flags/useFeatureFlag.ts` | Presentation | Depends on Shared Kernel | Depends on `lib/feature-flags.ts` + Context | **Partial** |
| `lib/contexts/FeatureFlagProvider.tsx` | Presentation | Presentation Layer | Located in `lib/` (Infrastructure area) | **No** |
| `app/providers.tsx` | Presentation | Presentation Layer | Presentation Layer | **Yes** |

### ADR-001 (Frontend Clean Architecture)
- **Compliant:** `lib/feature-flags.ts` has zero React/Next.js dependencies and can be imported by any layer.
- **Violation:** `lib/contexts/FeatureFlagProvider.tsx` is in `lib/` but imports React (`createContext`, `useState`, `useEffect`). The `lib/` directory is used for infrastructure utilities (seen in `lib/auth/`, `lib/api/`, `lib/storage/`, `lib/db.ts`). Placing React Context in the infrastructure area violates the rule that Infrastructure must not depend on Presentation.

### ADR-002 (Provider Boundaries)
- Not applicable. No consultation providers are involved in PR-001.

### ADR-003 (State Ownership)
- Not applicable. Feature flags are configuration, not clinical or session state.

### Architecture Baseline v1
- **Compliant:** Single source of truth for env var access (`FEATURE_FLAGS` constant).
- **Compliant:** Safe defaults (all flags default to `false`).
- **Compliant:** No scattered `process.env` usage outside the registry.

### Layered Architecture
- `lib/feature-flags.ts` operates as a Shared Kernel / utility. ✅
- `lib/contexts/FeatureFlagProvider.tsx` introduces a Presentation Layer concept (React Context) in the Infrastructure area. ⚠️

---

## 3. React Context Assessment

### Question: Should FeatureFlagProvider remain?

**Answer: No. The React Context is unnecessary and should be removed before PR-002.**

### Evidence

1. **No consumers exist.** The implementation has zero production usages. Adding a provider creates coupling without delivering value.
2. **No dynamic mutation is planned in Phase 2.** All flags are `NEXT_PUBLIC_*` environment variables, which are baked at build time. The Context adds a `useState` + `useEffect` indirection layer for values that never change at runtime (except when a developer manually edits `localStorage` for testing).
3. **The hook is sufficient.** `useFeatureFlag()` can read from `localStorage` directly without a provider. This is simpler, has fewer render dependencies, and works in any Client Component.
4. **Server Components cannot use Context anyway.** Any Server Component that needs a feature flag must read `lib/feature-flags.ts` directly. The Context provides zero value for SSR.
5. **The execution plan requirement was over-specified.** The PM document states: *"useFeatureFlag hook reads from Context and falls back to localStorage."* This was a premature design choice. The user requirement only asks for a minimal public API where consumers never read `process.env` directly.

### When Context Would Be Justified

Context becomes necessary only when:
- An admin UI can toggle flags at runtime without `localStorage`
- A remote configuration service pushes flag changes to clients
- Multiple unrelated parts of the app need to react to flag changes reactively

None of these are in the Phase 2 roadmap. They can be added in Phase 7 (Extension Framework) without breaking the current API.

---

## 4. Public API Assessment

| API | Rating | Assessment | Recommendation |
|-----|--------|------------|----------------|
| `FEATURE_FLAGS` | ✅ Good | Typed constant enables discoverability | Keep |
| `FeatureFlagKey` | ✅ Good | Derived type prevents invalid keys | Keep |
| `isFeatureEnabled(key)` | ✅ Good | Clean, conventional, typed | Keep as primary consumer API |
| `getFeatureFlag(key)` | ⚠️ Minor | Redundant with `isFeatureEnabled`; name suggests it could mutate state | Rename to `getFeatureFlagFromEnv` or make private. Not needed in public API since `isFeatureEnabled` is the typed wrapper. |
| `getAllFlags()` | ✅ Good | Useful for debugging/admin UIs | Keep |
| `useFeatureFlag(key)` | ✅ Good | React convention, falls back safely | Keep |
| `readFlagFromLocalStorage(key)` | ❌ Remove | Internal implementation detail that is exported | Make this a non-exported function inside `useFeatureFlag.ts`. Exporting it creates a parallel public path that bypasses the registry. |
| `FeatureFlagProvider` | ❌ Remove | Premature; no consumers; creates app-tree coupling | Remove until runtime mutation is required. |
| `FeatureFlagContext` | ❌ Remove | Created solely for the premature provider | Remove with FeatureFlagProvider. |

### Type Duplication
`FeatureFlags` type is defined in both `lib/feature-flags.ts` and `lib/contexts/FeatureFlagProvider.tsx`. This should be a single definition in the registry module.

---

## 5. Simplification Opportunities

### 5.1 Remove the React Context (High Value)

**Current:** Three files (`registry`, `hook`, `provider`) + Context wiring in `app/providers.tsx`
**Simplified:** Two files (`registry`, `hook`) + zero wiring

`lib/flags/useFeatureFlag.ts` can be simplified to:

```typescript
export function useFeatureFlag(key: FeatureFlagKey): boolean {
  return readFlagFromLocalStorage(key);
}
```

No provider needed. No context needed. No app-tree modification needed.

### 5.2 Move Registry to Shared Kernel (Medium Value)

**Current:** `lib/feature-flags.ts` (in `lib/` — infrastructure area)
**Recommended:** `shared-kernel/feature-flags.ts` (true Shared Kernel)

Rationale: Feature flags are configuration consumed by every layer. The Shared Kernel is the only layer all other layers may depend on. `lib/` contains infrastructure code (`lib/api/`, `lib/auth/`, `lib/db.ts`). The registry has zero framework dependencies and belongs in `shared-kernel/` alongside `shared-kernel/errors/`, `shared-kernel/types/`, etc.

**Mitigation:** The execution plan approved `lib/feature-flags.ts`. If the team prefers to keep it in `lib/` for consistency with existing utilities, that is acceptable for Phase 2. Moving to `shared-kernel/` should happen when the Domain Layer needs to import feature flags.

### 5.3 Make localStorage Helper Internal (Low Value)

`readFlagFromLocalStorage` in `lib/flags/useFeatureFlag.ts` is exported but used only by the hook itself. It should be module-private.

### 5.4 Remove Redundant `getFeatureFlag` Export (Low Value)

`getFeatureFlag` is an internal env reader. `isFeatureEnabled` is the public typed API. Keeping both creates confusion about which to use.

---

## 6. Future Readiness

### DraftService (PR-002)

Application Service can safely import `isFeatureEnabled` from `lib/feature-flags.ts`. ✅

**Caveat:** If `lib/` is treated as Infrastructure, Application Layer importing it violates ADR-001. Moving the registry to `shared-kernel/` resolves this permanently.

### SessionService

Same as DraftService. ✅

### Provider Extraction

Providers (React Contexts) will use `useFeatureFlag()` hook. This works with the simplified hook (no Context required). ✅

### Background Workers

Workers can import `lib/feature-flags.ts` directly. They cannot use hooks or Context. The pure registry supports this. ✅

### Server Actions

Server Actions can import `lib/feature-flags.ts` directly. They cannot use `useFeatureFlag` or Context. The pure registry supports this. ✅

### Testing

Registry tests are comprehensive (22 tests covering defaults, parsing, case insensitivity, invalid values, `getAllFlags`). ✅

Hook fallback tests cover localStorage behavior, error handling, and env fallback. ✅

No frontend tests exist for the Context (which is fine since it should be removed). If Context were kept, it would need frontend tests in the `jsdom` environment.

### Remote Feature Flags / Admin-Controlled Flags

**Not supported without architectural redesign.** Current implementation reads only from `process.env` and `localStorage`. There is no interface for a remote configuration provider.

**Impact:** Low. Phase 2 rollout requires only per-developer toggling (via `localStorage`) or build-time flags (via env vars). Production gradual rollout (10% → 25% → 50% → 100%) cannot be achieved with the current system.

**Recommendation:** If production gradual rollout is required before Phase 7, replace `getFeatureFlag` with a provider interface:

```typescript
interface FeatureFlagProvider {
  getFlag(key: FeatureFlagKey): boolean;
}

class EnvFeatureFlagProvider implements FeatureFlagProvider { ... }
class RemoteFeatureFlagProvider implements FeatureFlagProvider { ... }
```

This is not needed now and can be added without breaking the public API (`isFeatureEnabled` and `useFeatureFlag` remain unchanged).

---

## 7. Final Verdict

### Approved with Minor Improvements

The registry and hook are sound and may serve as the permanent foundation. The React Context should be removed before any consumers are introduced.

### Required Improvements Before PR-002

1. **Remove `lib/contexts/FeatureFlagProvider.tsx`** — Delete the file entirely.
2. **Remove wrapper from `app/providers.tsx`** — Delete the `<FeatureFlagProvider>` JSX and its import. Restore the original provider nesting.
3. **Make `readFlagFromLocalStorage` internal** — Remove it from the exports of `lib/flags/useFeatureFlag.ts`.
4. **Make `getFeatureFlag` internal or remove it** — `isFeatureEnabled` is the public API. Either rename `getFeatureFlag` to `_getFeatureFlagFromEnv` or remove the export.

### Optional Improvement

5. **Move `lib/feature-flags.ts` to `shared-kernel/feature-flags.ts`** — Not required for PR-002, but recommended as part of Phase 2 cleanup to match Clean Architecture boundaries.

### What Should NOT Change

- The `FEATURE_FLAGS` constant and typed keys. These are excellent.
- The boolean parsing logic (`true`, `1`, `yes`, case-insensitive).
- The safe defaults (all `false`).
- The unit test coverage and approach.

### Rollback Compatibility

If improvements 1–4 are applied, the only public API change is removal of:
- `FeatureFlagProvider` (a component that has zero consumers)
- `FeatureFlagContext` (a context that has zero consumers)
- `readFlagFromLocalStorage` (an exported helper used only in tests)
- `getFeatureFlag` (an internal env reader)

No production code calls any of these. Removing them is a breaking change with **zero migration impact**.
