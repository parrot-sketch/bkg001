# Staff Credential Containment — Phase 3.1

**Executed:** 2026-11-02T11:47:11Z – 2026-11-02T11:47:45Z (UTC)  
**Authority:** Phase 3.1 owner authorization (staff accounts + sessions only)  
**Secrets in this document:** none

---

## 1. Affected account list (confirmed)

Matched published demo catalogue emails to production `User` rows. **No patient records were read.**

| Email | Role | Status at remediation | User ID |
|-------|------|----------------------|---------|
| `admin@nairobisculpt.com` | ADMIN | ACTIVE | `89d08e34-3ac1-4c43-a38e-79c34c4c9827` |
| `angela@nairobisculpt.com` | DOCTOR | ACTIVE | `66e9a3e2-4fb8-4692-b29a-8721c038aee1` |
| `mukami@nairobisculpt.com` | DOCTOR | ACTIVE | `eebb4027-86a2-4c9e-95e9-439662ad79f8` |
| `dorsi@nairobisculpt.com` | DOCTOR | ACTIVE | `ec00f9c0-5eb9-420b-ba69-73181793d458` |
| `ken@nairobisculpt.com` | DOCTOR | ACTIVE | `a959727a-83e5-4e51-af1b-e1b75e8a55ef` |
| `ogalo@nairobisculpt.com` | DOCTOR | ACTIVE | `72de3b90-6f18-4e08-b41e-3b6c53f02649` |
| `reception@nairobisculpt.com` | FRONTDESK | ACTIVE | `e96256ab-b9f3-44b4-8bca-f628bd328ffc` |
| `theater@nairobisculpt.com` | THEATER_TECHNICIAN | ACTIVE | `efb0a713-03ea-4cc2-8343-e3c398f4f7d1` |
| `stores@nairobisculpt.com` | STORES | INACTIVE | `1182d26c-ce39-49ee-9a86-ec47b640eb1c` |

**Counts by role remediated:** ADMIN 1 · DOCTOR 5 · FRONTDESK 1 · THEATER_TECHNICIAN 1 · STORES 1 (**9 total**).

Published doc aliases that were **not** present as exact emails (no remediation): dotted-name variants and other seed aliases from Phase 2 (e.g. `jane@…`, `mukami.gathariki@…`).

---

## 2. Authentication implementation (pre-change evidence)

| Capability | Finding | Evidence |
|------------|---------|----------|
| Password change (self-service) | Requires **current** password via `UpdatePasswordUseCase` / `PUT /api/account/password` | `application/use-cases/UpdatePasswordUseCase.ts` |
| Admin password set | Admin staff PATCH can set `password_hash` but **does not** revoke refresh tokens | `app/api/admin/staff/[id]/route.ts` |
| Email / token password reset for staff | **Not implemented** (interface stub only; patient forgot-password link present, no staff flow) | `AuthEnhancements.ts` `IPasswordResetService`; no staff reset route |
| Refresh token storage | Rows in `RefreshToken` with `revoked` / `revoked_at` | `JwtAuthService.logout` / `refreshToken` |
| Refresh revocation effect | **Immediate** for refresh path (DB `revoked` check) | `JwtAuthService.refreshToken` |
| Access token revocation | Access JWT verified by signature/expiry only; **`token_version` is incremented on password change but not checked on `verifyAccessToken`** | `JwtAuthService.verifyAccessToken` |
| Forced password-change flag | **Not supported** in schema/login | — |
| MFA | Schema flags + future stub only — **not enforceable in login** | See `MFA-IMPLEMENTATION-ASSESSMENT.md` |

**Containment method chosen:** direct production DB transaction per affected user (bcrypt hash replace + `refreshToken.updateMany` revoke + `token_version` increment). This matches the security intent of `UpdatePasswordUseCase` without needing the published current password.

**Recovery delivery:** cryptographically generated temporary passwords written **only** to an offline escrow file outside the repository (`~/.tibaflow-phase31-escrow/…`, mode `0600`). Not printed to terminal reports, chat, or git.

---

## 3. Containment actions completed

For each of the 9 accounts above:

1. Generated a unique strong temporary password (not logged).  
2. Stored bcrypt hash (`cost 10`) on `User.password_hash`.  
3. Set `failed_login_attempts = 0`, cleared `locked_until`.  
4. Incremented `token_version`.  
5. Revoked all non-revoked `RefreshToken` rows for that `user_id`.  
6. Verified none of the six published demo password classes match the new hash (`demoPasswordClassesRejected: true` for all nine).

**Unaffected ACTIVE users left untouched:** **864** (count of `status=ACTIVE` with email not in the published list).

---

## 4. Recovery continuity

| Step | Status |
|------|--------|
| Escrow file created for owner out-of-band distribution | Done — path recorded in completion report (filename only in public docs) |
| Staff self-service reset | Unavailable (product gap) |
| Login verified with new temporary passwords | **Not performed** (would require handling secrets in this channel) — **owner must verify after secure delivery** |
| MFA enrolment | Not enabled (not operational) |

---

## 5. Residual risk after this phase

- Access JWTs issued before remediation may remain valid until natural expiry (**default ~15 minutes**).  
- Public repository still publishes old demo passwords (invalid for these accounts now, but still a disclosure issue → Phase: private repo).  
- JWT signing secrets still shared across Vercel environments (unchanged — out of scope).  
- Escrow file on the operator workstation must be distributed then securely deleted.
