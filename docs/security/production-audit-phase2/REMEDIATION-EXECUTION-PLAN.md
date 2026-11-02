# 6. Remediation Execution Plan

**Status:** PLAN ONLY — no remediations executed  
**Date:** 2026-11-02  
**Objective:** Contain credential exposure without disrupting live care, under explicit owner approval gates.

---

## Executive summary — most urgent exposures

### Confirmed

1. **Public repository** publishes shared demo passwords for named staff emails.  
2. **Those emails exist as ACTIVE production users** (ADMIN/DOCTOR/FRONTDESK/THEATER), MFA off, most previously logged in. Password match **NOT VERIFIED**, but impact if matched is full clinic access over **1192** patients.  
3. **Workstation** holds production **`avnadmin`** `PROD_DIRECT_URL` while DB allowlist is reported open.  
4. **Vercel** shares JWT, `DIRECT_URL`, Cloudinary, and OpenAI across Production/Preview/Development.  
5. **No branch protection** on `main`; GitHub Production environment has empty protection rules; Vercel auto-deploys Production from `main`.  
6. Collaborators with **push** (non-admin): `geogrey12muiruri`, `BKG-Consulting`.

### Suspected / latent

- Preview `DATABASE_URL` may equal Production (separate Sensitive slot; value unknown).  
- Doc JWT example strings could collide with old production secrets (NOT VERIFIED).  
- Historical public Aiven hostname may still be an active unrelated instance.  
- OIDC token may remain valid server-side until expiry (likely low impact vs DB/JWT).

### Immediate invalidation candidates (approval required before action)

| Credential | Why | Blocking risk if done blindly |
|------------|-----|--------------------------------|
| Staff passwords for ACTIVE demo-named accounts | Public password classes | Locks staff out mid-clinic |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Shared across envs | Forces global re-login |
| Aiven `avnadmin` password | On laptop; admin-level | Breaks Vercel + scripts until env updated |
| Cloudinary API secret / OpenAI key | Shared across envs | Breaks uploads/dictation until updated |

---

## Investigation F — Repository access and deployment integrity

| Control | Observed | Classification |
|---------|----------|----------------|
| Branch protection on `main` | API 404 — **not configured** | MISCONFIGURED |
| GitHub Environment `Production` | `protection_rules: []`, admins may bypass | MISCONFIGURED |
| Vercel production deploy trigger | Push/merge to `main` via Git integration | VERIFIED |
| Preview deployments (recent) | None in last 50 deployments sampled | PARTIALLY VERIFIED (feature may still be enabled) |
| Git fork protection | Enabled on Vercel project | VERIFIED |
| Deployment checks | None | MISCONFIGURED |
| GitHub Actions secrets | None configured | VERIFIED |
| Actions permissions API | 403 for this token — full policy NOT VERIFIED | NOT VERIFIED |
| Untrusted PR → production secrets | Fork protection helps; **same-repo** branches from write collaborators can still reach shared Preview/Prod secret model if Preview builds run | High residual |

### Secure production deployment workflow (target)

1. Repository **private**.  
2. `main` protected: PR required, ≥1 review, CI (`unit` + `build`) required, no direct push except break-glass owner.  
3. Vercel Production deploys only from `main` after green CI.  
4. Preview disabled **or** bound only to scrubbed DB + distinct secrets.  
5. No production secrets in Development target.  
6. Optional: Vercel Deployment Protection for non-custom-domain URLs (already partially on).  
7. Migration/apply prod schema via break-glass path — not developer laptops with permanent `PROD_DIRECT_URL`.

---

## Prioritised remediation catalogue

### R-CRIT-1 — Emergency staff credential containment

| Field | Detail |
|-------|--------|
| Exact action | Force-reset passwords for ACTIVE accounts listed in Demo Assessment; revoke refresh tokens / bump `token_version`; require MFA enrolment for ADMIN+clinical roles; communicate out-of-band |
| Affected | App users `admin@`, doctors, `reception@`, `theater@` (and any other staff) |
| Dependencies | Owner change window; break-glass admin; SMS/phone tree for staff |
| Security improvement | Closes public-password takeover path |
| Operational impact | Staff cannot use old passwords; short login disruption |
| Owner approval | **Required** |
| Verification | Demo password classes fail; MFA flags true; new login succeeds |
| Rollback | Temporary known temporary passwords from sealed envelope (prefer forward-only) |

### R-CRIT-2 — Make repository private + remove credential docs from default branch

| Field | Detail |
|-------|--------|
| Exact action | GitHub → Private; remove or relocate `TEST_CREDENTIALS.md` / demo password tables; stop tracking `.venv` |
| Affected | GitHub `parrot-sketch/bkg001` |
| Dependencies | Collaborator access via explicit invites |
| Security improvement | Stops ongoing world-readable password publication |
| Operational impact | Public clone/fork breaks; CI/Vercel Git app must retain access |
| Owner approval | **Required** |
| Verification | Anonymous GitHub fetch denied; Vercel still deploys |
| Rollback | Re-public (not recommended) |

### R-CRIT-3 — Isolate Vercel secrets (see Environment Isolation Plan)

| Field | Detail |
|-------|--------|
| Exact action | Execute Steps M1–M8; rotate JWT/Cloudinary/OpenAI; split `DIRECT_URL`; confirm Preview DB ≠ Prod |
| Affected | Vercel `bkg001` env; all sessions |
| Dependencies | Preview policy decision; secrets escrow |
| Security improvement | Preview/Dev cannot mint prod JWTs or use prod data plane |
| Operational impact | Global re-login; possible brief feature gaps |
| Owner approval | **Required** |
| Verification | Checklist in Environment Isolation Plan |
| Rollback | Re-apply escrowed prod secrets ≤24h |

### R-CRIT-4 — Workstation prod DB URL replacement + rotate `avnadmin`

| Field | Detail |
|-------|--------|
| Exact action | Escrow → new break-glass workflow → rotate Aiven password → update Vercel `DATABASE_URL`/`DIRECT_URL` → remove `PROD_DIRECT_URL` from laptop `.env` |
| Affected | Aiven; Vercel; local `.env`; deploy scripts |
| Dependencies | Aiven console access; clinic downtime buffer for DB auth flip |
| Security improvement | Stolen laptop no longer yields lasting DB admin access |
| Operational impact | App downtime if Vercel not updated atomically with DB rotate |
| Owner approval | **Required** |
| Verification | App healthy; laptop `.env` lacks prod URL; old password fails |
| Rollback | Revert to escrowed password + env (short window) |

### R-HIGH-1 — Branch protection and deployment gates

| Field | Detail |
|-------|--------|
| Exact action | Protect `main`; require PR + CI; add GitHub Environment protection for Production; consider Vercel ignored build step until checks pass |
| Affected | GitHub + Vercel deploy path |
| Dependencies | CI already on `main` |
| Security improvement | Stops silent production pushes |
| Operational impact | Slower hotfixes |
| Owner approval | **Required** |
| Verification | Direct push rejected; PR without CI cannot merge |
| Rollback | Temporarily relax protection for emergency hotfix with audit log |

### R-HIGH-2 — Least-privilege DB role

| Field | Detail |
|-------|--------|
| Exact action | Create app role without SUPERUSER/createdb; update Vercel URLs; keep migrator role break-glass only |
| Affected | Aiven roles; Prisma connection user |
| Dependencies | R-CRIT-4 window |
| Security improvement | Limits SQL blast radius |
| Owner approval | **Required** |

### R-MED-1 — Redact historical Aiven hostnames from docs

| Field | Detail |
|-------|--------|
| Exact action | Replace real hosts with `YOUR_HOST.aivencloud.com`; confirm old `pg-25182a71-…` instance status |
| Affected | Public markdown guides |
| Owner approval | Required for doc edit commit (separate from this Phase 2 freeze) |

### R-MED-2 — Configure `CRON_SECRET` / disable open detailed health

| Field | Detail |
|-------|--------|
| Exact action | Add Sensitive cron secret + scheduler; authz detailed health |
| Affected | Notifications reliability + recon surface |
| Owner approval | Required |

### R-LOW-1 — OIDC hygiene

| Field | Detail |
|-------|--------|
| Exact action | Owner reviews Vercel access log; no need to recreate token |
| Severity | Low |

---

## Suggested execution order (after approval)

```text
1) R-CRIT-2 (private repo) — stops ongoing password broadcast
2) R-CRIT-1 (staff password/MFA) — contains account takeover
3) R-CRIT-3 (Vercel secret split + JWT rotate) — contains preview/session forgery
4) R-HIGH-1 (branch protection) — contains supply-chain push risk
5) R-CRIT-4 + R-HIGH-2 (DB credential rotate + least privilege) — contains data-plane admin risk
6) R-MED-* / R-LOW-* — hardening backlog
```

**Do not** tighten Aiven IP allowlists until a Vercel egress strategy exists (Phase 1 D1.4) — risk of total outage.

---

## Changes made in Phase 2

| Action | Result |
|--------|--------|
| Read-only production `User` email/role query + patient count | Evidence for Demo Assessment |
| Vercel/GitHub metadata inspection | Evidence for isolation & deploy integrity |
| Documentation under `docs/security/production-audit-phase2/` | Created |
| Credential rotation / env changes / visibility changes / commits / pushes | **None** |

---

## Stop

Phase 2 investigation and planning are complete.  
**Await explicit owner approval** before implementing any item above.
