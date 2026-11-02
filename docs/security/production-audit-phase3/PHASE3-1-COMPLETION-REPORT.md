# Phase 3.1 Completion Report — Exposed Staff Credential Containment

**Date:** 2026-11-02  
**Production domain:** https://nsac.co.ke  
**Remediation window (UTC):** 2026-11-02T11:47:11Z – 2026-11-02T11:47:45Z

---

## 1. Initial production state

- Public GitHub repo published shared demo password classes for named staff emails.  
- Phase 2 confirmed those emails existed in production (8 ACTIVE + 1 INACTIVE STORES), MFA off.  
- Password match to demo classes was **not** tested (policy). Accounts treated as compromised.  
- Auth stack: bcrypt passwords; DB-backed refresh tokens; access JWTs ~15m; no staff forgot-password; MFA stub only.

---

## 2. Number of affected accounts by role

| Role | Remediated |
|------|------------|
| ADMIN | 1 |
| DOCTOR | 5 |
| FRONTDESK | 1 |
| THEATER_TECHNICIAN | 1 |
| STORES (INACTIVE) | 1 |
| **Total** | **9** |

---

## 3. Exact containment actions completed

For each of the 9 accounts:

- Replaced `password_hash` with bcrypt of a newly generated unique temporary password.  
- Revoked all active refresh tokens.  
- Incremented `token_version`.  
- Cleared lockout counters.  
- Wrote temporary passwords **only** to offline escrow:  
  `~/.tibaflow-phase31-escrow/staff-recovery-2026-11-02T11-47-11-961Z.json` (mode `0600`).  
- Did **not** print passwords to chat, reports, or git.

---

## 4. Session revocation evidence

- **11** refresh tokens revoked (`reception` 9, `ogalo` 2); all nine users have **0** active refresh tokens after.  
- See `SESSION-REVOCATION-REPORT.md`.  
- Access JWT kill-switch incomplete (`token_version` unused in verify) — residual ≤ ~15 minutes for preexisting access cookies/headers.

---

## 5. Password-reset verification evidence

| Check | Result |
|-------|--------|
| Demo password classes vs new hashes | **Rejected for all 9** (`demoPasswordClassesRejected: true`) |
| Login attempted with published passwords | **Not performed** (forbidden) |
| Login attempted with escrow temporary passwords | **Not performed** in this agent channel (secret-handling boundary) |
| In-app email reset | Unavailable — escrow is the approved recovery mechanism |

**Verified:** published demo password classes no longer match stored hashes.  
**Not verified here:** interactive login success with temporary passwords (owner verification after secure distribution).

---

## 6. MFA implementation findings

MFA is **not** end-to-end operational. Flags were **not** enabled. See `MFA-IMPLEMENTATION-ASSESSMENT.md`.

---

## 7. Staff access continuity results

| Item | Result |
|------|--------|
| Other ACTIVE staff untouched | **864** accounts |
| Affected staff temporary credentials | In escrow for owner out-of-band delivery |
| Self-service recovery | Not available |
| Continuity after distribution | **Pending owner action** — distribute escrow secrets via approved channel, confirm each role can log in, then shred escrow |

---

## 8. Accounts that could not be safely remediated

**None** of the nine confirmed published-email matches failed remediation.  

Out of scope / not remediated: other staff who may use unpublished emails, and published aliases that do not exist as exact production emails.

---

## 9. Confirmation — no other credentials or production settings changed

| In scope for Phase 3.1? | Item | Changed? |
|-------------------------|------|----------|
| No | JWT secrets | **No** |
| No | Aiven credentials / allowlist | **No** |
| No | Cloudinary / OpenAI | **No** |
| No | Vercel env vars | **No** |
| No | Unrelated user passwords | **No** |
| No | Application source (runtime) | **No** |
| No | Git commit / push | **No** |
| Docs only | `docs/security/production-audit-phase3/*` | Added (uncommitted) |
| Yes | 9 staff password hashes + their refresh tokens / token_version | **Yes** |

Phase 1 and Phase 2 audit documents preserved.

---

## 10. Remaining risks and recommended next phase

**Remaining risks**

1. Escrow file still on operator disk until distributed and shredded.  
2. Access JWTs for affected users may linger ~15m.  
3. Public repo still exposes old demo password text (now invalid for these accounts).  
4. Shared Vercel JWT/DB secrets across Preview/Dev (Phase 2 R-CRIT-3).  
5. Workstation `PROD_DIRECT_URL` still present (Phase 2 R-CRIT-4).  
6. No MFA; no staff self-service reset.  
7. `token_version` not enforced on access-token verify (harderning backlog).

**Recommended next phase**

1. Owner distributes escrow credentials; confirm logins; delete escrow.  
2. Make repository private; purge demo password docs from default branch.  
3. Phase: Vercel environment isolation + JWT rotation.  
4. Phase: DB credential rotation / least privilege + remove laptop prod URL.  
5. Product: staff password reset + real MFA before claiming stronger identity controls.

---

## Success claims (strict)

| Claim | Status |
|-------|--------|
| Published demo password classes invalidated for the 9 accounts | **Verified** |
| Refresh tokens for those accounts revoked | **Verified** (counts) |
| MFA enforced | **Not claimed** |
| Staff successfully logged in with new passwords | **Not claimed** |
| Instant access-token invalidation | **Not claimed** |
