# 2. Demo Account Assessment

**Date:** 2026-11-02  
**Method:**  
- Inventory from public seed/docs.  
- **Read-only** production query of `User` rows by email list + aggregate `patient` count.  
- **No** login attempts, **no** password guessing, **no** patient row contents retrieved.

---

## Summary

Several emails published as “demo/test” accounts **exist as ACTIVE users in production**, with **MFA disabled**, and most show **prior successful logins** (`has_last_login: true`).  

Whether their passwords still equal the publicly documented demo passwords is **NOT VERIFIED**.

Production holds a non-trivial patient population (**1192** patients counted). Any ACTIVE `ADMIN` or clinical role that authenticated successfully would be able to reach real patient workflows per application RBAC design.

---

## Documented credential catalogue (public)

| Source | Notes |
|--------|-------|
| `TEST_CREDENTIALS.md` | Role table + per-role shared passwords |
| `docs/QUICK_DEMO_REFERENCE.md` | Quick login card (some emails differ from seed) |
| `SEED_FILE_SAFETY.md` | Lists admin/doctor/nurse/frontdesk examples |
| `scripts/seed-users.ts` | Canonical seed emails/passwords |
| `prisma/seed.ts` | Hashes `admin123` / `doctor123` / `nurse123` etc. at seed time |

Published shared password classes (values are public in Git; repeated here only as **class names** already in the public repo): `admin123`, `doctor123`, `nurse123`, `frontdesk123`, `theatertech123`, `stores123`.

---

## Production existence results

### Present in production

| Email | Role | Status | MFA | Failed attempts | Locked | Last login observed |
|-------|------|--------|-----|-----------------|--------|---------------------|
| `admin@nairobisculpt.com` | ADMIN | ACTIVE | false | 3 | false | yes |
| `angela@nairobisculpt.com` | DOCTOR | ACTIVE | false | 0 | false | yes |
| `mukami@nairobisculpt.com` | DOCTOR | ACTIVE | false | 0 | false | yes |
| `dorsi@nairobisculpt.com` | DOCTOR | ACTIVE | false | 0 | false | yes |
| `ken@nairobisculpt.com` | DOCTOR | ACTIVE | false | 0 | false | yes |
| `ogalo@nairobisculpt.com` | DOCTOR | ACTIVE | false | 0 | false | yes |
| `reception@nairobisculpt.com` | FRONTDESK | ACTIVE | false | 0 | false | yes |
| `theater@nairobisculpt.com` | THEATER_TECHNICIAN | ACTIVE | false | 0 | false | yes |
| `stores@nairobisculpt.com` | STORES | INACTIVE | false | 0 | false | no |

### Documented in repo but not found under those exact emails

Examples: `jane@nairobisculpt.com`, `lucy@nairobisculpt.com`, dotted-name variants (`mukami.gathariki@…`, `jane.wambui@…`, `david.omondi@…`, `receptionist@…`, etc.).  

**Interpretation:** Seed docs and live emails are **not 1:1**. Absence of an email does **not** prove the human is absent under another address.

---

## Privilege / patient-data impact (design-level)

| Role | Admin permissions | Patient-record access (application design) |
|------|-------------------|----------------------------------------------|
| ADMIN | Full administrative APIs | Effectively clinic-wide |
| DOCTOR | Clinical documentation, charges, cases | Patient charts for care pathways |
| FRONTDESK | Scheduling, intake, billing desk | Patient demographics / visits / billing |
| THEATER_TECHNICIAN | Theatre / case operations | Surgical case patient context |
| STORES | Inventory (account INACTIVE) | Typically not clinical charting |

**Patient population exposure if credentials work:** **1192 patients** (count only).

---

## Credential validity

| Question | Result |
|----------|--------|
| Do published passwords still authenticate? | **NOT VERIFIED** (intentionally not tested) |
| Could they still be valid? | **Yes, plausible** — accounts exist, MFA off, passwords were seeded as those strings historically |
| Evidence of interactive use | `has_last_login: true` on admin + doctors + frontdesk + theater |
| Admin anomaly | `failed_login_attempts = 3` on admin (possible probing or typos; not conclusive) |

---

## Credential invalidation plan (planning only)

### Priority 0 — assume compromise until proven otherwise

Because passwords are public and accounts are live:

1. **Owner approval window** for forced password reset of all listed ACTIVE accounts (and any other staff).  
2. **Invalidate refresh tokens** / bump `token_version` for those users.  
3. **Force logout** via cookie/session invalidation after JWT rotation (coordinate with Environment Isolation Plan).  
4. **Require password change** on next login; prohibit the published demo password classes in policy.  
5. **Enable MFA** for ADMIN and clinical roles before announcing “contained”.  
6. **Audit** `LoginAttempt` / audit tables for suspicious success from unexpected IPs (**owner executes**; do not dump PHI into tickets).  
7. **Remove or privatise** `TEST_CREDENTIALS.md` / demo password docs after repo visibility change.

### Verification procedure (post-approval)

- Confirm users cannot authenticate with published demo password classes (controlled test accounts only, or admin reset confirmation).  
- Confirm MFA enrolment flags true for privileged roles.  
- Confirm old refresh tokens rejected.

### Rollback / recovery

- Break-glass admin account credentials stored offline before mass reset.  
- Aiven/console access independent of app login for recovery.

### Operational impact

- All staff must set new passwords (and MFA). Brief inability to log in during cutover.  
- Communication plan required for clinic hours.

---

## Findings

| ID | Severity | Statement |
|----|----------|-----------|
| DA-01 | Critical | Demo-named staff accounts exist ACTIVE in production with MFA off |
| DA-02 | Critical (conditional) | If passwords match public docs, internet attackers can access real patient systems — validity NOT VERIFIED but must be treated as urgent |
| DA-03 | High | Admin account shows failed login attempts > 0 |
| DA-04 | Medium | Doc/seed email aliases diverge from production emails — inventory incomplete without full staff roster |
| DA-05 | Informational | `stores@…` exists but INACTIVE |
