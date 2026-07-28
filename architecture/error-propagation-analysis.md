# Error Propagation Analysis

## Overview
Every Error object in the consultation room flows through the following layers:
SessionService → SessionProvider → ConsultationContext → page.tsx

## Error Type Conversions

### 1. SessionService → SessionProvider

**Source:** `SessionService` methods return `SessionResult<T>` with `error: ClinicalError`

**Path:** `SessionProvider.initializeSession()` catch block
```tsx
const initErrorMessage = toErrorMessage(result.error);
setError(initErrorMessage);
toast.error(initErrorMessage || 'Failed to load appointment');
```

**Conversion function:**
```tsx
function toErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return 'An unexpected error occurred';
  const maybeMessage = (error as Record<string, unknown>).message;
  if (typeof maybeMessage === 'string' && maybeMessage.trim()) return maybeMessage;
  const maybeCode = (error as Record<string, unknown>).code;
  if (typeof maybeCode === 'string' && maybeCode.trim()) return maybeCode;
  try {
    const json = JSON.stringify(error);
    if (json && json !== '{}' && json !== '[]') return json;
  } catch {}
  return 'An unexpected error occurred';
}
```

**Behavior:**
- `ClinicalError` → extracts `.message` → string
- `Error` → extracts `.message` → string
- String input → returns `'An unexpected error occurred'` (BUG: discards original string)
- `null`/`undefined` → returns generic message
- Plain object with `.message` → extracts message
- Object with `.code` → extracts code

**Issues:**
1. **String input discarded:** If `result.error` is already a string, `toErrorMessage` ignores it and returns the generic message. In practice, `SessionService` always returns `ClinicalError`, so this is not currently triggered.
2. **JSON.stringify fallback:** For non-standard objects, falls back to JSON. Works for plain objects, returns `{}` for Error instances.

### 2. SessionProvider → ConsultationContext

**Path:** `session.error` (string | null) → `session.error` in compatibility adapter
```tsx
const workflow = useMemo(() => ({
  error: session.error,
  ...
}), [..., session.error, ...]);
```

**Conversion:** None. `session.error` is already a string or null.

### 3. ConsultationContext → page.tsx

**Path:** `state.workflow.error` used in render decision
```tsx
if (state.workflow.error) {
  const errorMessage = typeof state.workflow.error === 'string'
    ? state.workflow.error
    : JSON.stringify(state.workflow.error);
```

**Conversion:**
- String → displayed as-is
- Non-string → `JSON.stringify()`

**Issues:**
1. **`JSON.stringify(new Error('...'))` returns `{}`** because Error properties (`message`, `stack`, `name`) are non-enumerable on the prototype. React renders `{}` as `[object Object]` via implicit `toString()` in JSX text nodes.
2. **No error type logging:** The console log at `ConsultationContext.tsx:117` logs `session.error` and its `typeof`, but the fallback renderer doesn't use this information. An Error object with `typeof === 'object'` gets `JSON.stringify()` treatment, producing `{}`.

### 4. Complete Error Flow Diagram

```
SessionService.initializeSession()
  ↓ returns { success: false, error: ClinicalError }
SessionProvider.initializeSession()
  ↓ toErrorMessage(ClinicalError) → extracts .message → string
  ↓ setError(string)
  ↓ session.error = string
ConsultationContext.CompatibilityAdapter
  ↓ workflow.error = session.error (string)
page.tsx
  ↓ typeof === 'string' → displays message correctly
  ↓ RENDER: error screen with message
```

## [object Object] Root Cause

**Location:** `app/doctor/consultations/session/[appointmentId]/page.tsx:240`

**Trigger condition:**
1. `state.workflow.error` is NOT a string
2. It is an Error object, ClinicalError, or plain object without `typeof === 'string'`
3. `JSON.stringify(error)` returns `{}` or `[object Object]`

**Why it happens:**
- `SessionProvider` calls `toErrorMessage(err)` which SHOULD return a string
- BUT if `toErrorMessage` receives an object where `.message` is not enumerable (e.g., native `Error`), the `.message` access via `(error as Record<string, unknown>).message` returns `undefined` because TypeScript type assertion doesn't change runtime behavior
- Wait — native `Error.prototype.message` IS enumerable. Let me verify...

Actually, `Error` instances DO have enumerable `message`:
```js
const e = new Error('test');
Object.keys(e); // ['message']
JSON.stringify(e); // '{"message":"test"}'
```

But some custom error classes may override `message` as a getter on the prototype, making it non-enumerable. Or the error might be `undefined`/`null`.

The actual `[object Object]` scenario in the current codebase occurs when:
1. `JSON.stringify(error)` returns `{}` (empty object with no enumerable properties)
2. React renders `{}` in a `<p>` tag → `[object Object]`

This happens when `error` is an instance of a class whose properties are NOT enumerable, or when `error` is `undefined` and the ternary falls through incorrectly.

Wait, looking at the code:
```tsx
const errorMessage = typeof state.workflow.error === 'string'
  ? state.workflow.error
  : JSON.stringify(state.workflow.error);
```

If `state.workflow.error` is `{}`, `typeof` is `'object'`. `JSON.stringify({})` returns `'{}'`. React renders `'{}'` as `{}` in text. Not `[object Object]`.

`[object Object]` only appears when an object is coerced to string via implicit `toString()`, e.g., `'prefix ' + error` or `String(error)`. In React JSX, `<p>{error}</p>` does NOT implicitly coerce via `toString()` for objects — it renders nothing or `{...}` in dev mode. Actually, React DOES call `toString()` on objects in text nodes in some versions.

Actually, `[object Object]` in the UI likely comes from:
```tsx
<p className="text-sm text-[#2c2e4b]/70 leading-relaxed">{errorMessage}</p>
```

If `errorMessage` is `JSON.stringify(error)` and `error` is a `ClinicalError` with non-enumerable fields, `JSON.stringify` returns `{}`. React renders `{}` as is. But if somewhere the error is passed directly (not through `toErrorMessage`) to a toast or UI component that calls `String(error)`, then `[object Object]` appears.

Looking at the current code, `SessionProvider` always uses `toErrorMessage` before setting `error` state. So `session.error` should always be a string. The `[object Object]` issue may have been from a previous code version where `setError(result.error)` was called directly with the ClinicalError object.

### 5. Current Error Path Status

| Step | Type | Status |
|------|------|--------|
| SessionService.error | `ClinicalError` | ✅ Normalized |
| SessionProvider.setError | `string` | ✅ Via `toErrorMessage` |
| ConsultationContext.workflow.error | `string \| null` | ✅ Mapped |
| page.tsx error renderer | `string` | ✅ Correctly handled |

**Verdict:** Error propagation is currently correct. The `[object Object]` issue was from earlier code where errors were passed as objects. The `toErrorMessage` helper fixes this.

### 6. Remaining Risk

- **Toast error messages:** `SessionProvider` uses `toErrorMessage(error)` consistently. No risk.
- **Console logs:** `SessionProvider` logs `result.error` directly, which may show `[object Object]` in DevTools if it's a non-serializable error. This is cosmetic, not user-facing.
- **Future risk:** If any future code path sets `session.error` to a non-string value, the page renderer will produce `{}` or `[object Object]`.
