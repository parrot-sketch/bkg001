# Session Revocation Report — Phase 3.1

**Window:** 2026-11-02T11:47:11Z – 2026-11-02T11:47:45Z (UTC)

---

## Mechanism used

Per affected `user_id`, inside the same DB transaction as the password hash update:

```text
RefreshToken.updateMany({ user_id, revoked: false } → { revoked: true, revoked_at: now })
User.token_version += 1
```

Aligned with `UpdatePasswordUseCase` session-fixation fix (P0-2), without requiring the old password.

---

## Per-account refresh-token evidence

| Email | Role | Active refresh tokens before | Active after | `token_version` before → after |
|-------|------|------------------------------|--------------|--------------------------------|
| `admin@nairobisculpt.com` | ADMIN | 0 | 0 | 0 → 1 |
| `angela@nairobisculpt.com` | DOCTOR | 0 | 0 | 0 → 1 |
| `mukami@nairobisculpt.com` | DOCTOR | 0 | 0 | 0 → 1 |
| `dorsi@nairobisculpt.com` | DOCTOR | 0 | 0 | 1 → 2 |
| `ken@nairobisculpt.com` | DOCTOR | 0 | 0 | 0 → 1 |
| `ogalo@nairobisculpt.com` | DOCTOR | **2** | **0** | 0 → 1 |
| `reception@nairobisculpt.com` | FRONTDESK | **9** | **0** | 0 → 1 |
| `theater@nairobisculpt.com` | THEATER_TECHNICIAN | 0 | 0 | 0 → 1 |
| `stores@nairobisculpt.com` | STORES (INACTIVE) | 0 | 0 | 0 → 1 |

**Total refresh tokens revoked in this operation:** **11** (2 + 9).

---

## Immediate vs delayed effect

| Token type | Effect of this remediation | Verified? |
|------------|----------------------------|-----------|
| Refresh tokens (HttpOnly cookie / DB-backed) | **Immediate** rejection on `/api/authentication/refresh` when `revoked=true` | Logic verified in source; DB counts show 0 active after |
| Access tokens (JWT) | Remain acceptable until **exp** (~15 minutes default). `token_version` is **not** consulted in `verifyAccessToken` | Source-verified limitation |
| Browser localStorage legacy tokens | Client may still hold stale material; API auth for cookie session depends on refresh after access expiry | Not browser-tested in this phase |

**Claim boundary:** Refresh-session continuity for affected accounts is contained. **Full instantaneous kill of in-flight access JWTs was not achieved** by the current application design.

---

## What was not changed

- JWT signing secrets  
- Cookie attribute configuration  
- Unrelated users’ refresh tokens  
- Vercel / Aiven network settings  
