# 1. Credential Exposure Report

**Phase:** 2 — Credential Exposure Investigation and Containment Planning  
**Date:** 2026-11-02  
**Scope:** Public repository + Git history + correlated infrastructure metadata  
**Secret values in this document:** **NONE** (redacted by design)

---

## Executive distinction

| Class | Meaning in this report |
|-------|------------------------|
| **Confirmed exposure** | Sensitive material is present in a publicly reachable place (public Git tree/history, or live workstation file whose existence is verified). |
| **Suspected exposure** | Material looks sensitive or could become production-valid, but validity / current reuse is not proven. |
| **Demonstrative only** | Clearly placeholder / localhost / `YOUR_PASSWORD`-style content. Still undesirable in a public healthcare repo when paired with real hostnames. |

---

## A. Public repository and Git history

### A1. Committed environment files

| Item | Evidence | Classification |
|------|----------|----------------|
| `.env` / `.env.local` / `.env.production` as tracked files | `git ls-files` shows **none**; `git log --full-history` for those paths empty | No confirmed committed live env file |
| `.env.example` | Added in `f364751` (“docs: add comprehensive environment variables guide”) | Demonstrative localhost + placeholder JWT strings |

**Finding CE-01 (Informational):** No live `.env` is currently tracked.  
**Finding CE-02 (Medium):** `.env.example` and many guides teach production Aiven wiring in a **public** tree.

### A2. Database connection strings in the public tree

| File(s) | Historical refs (representative) | Category | Genuine vs demo | Still valid? | Privileges if valid | Containment |
|---------|-----------------------------------|----------|-----------------|--------------|---------------------|-------------|
| `QUICK_START_AIVEN.md`, `PRODUCTION_DB_SETUP.md`, `ENV_VARIABLES_GUIDE.md`, `QUICK_PRODUCTION_SETUP.md`, `PATIENT_SEED_UPDATE.md` | Introduced/expanded across `e804aab`, `a0e6821`, `f364751`, `b1a4d44`, `99a688f`, later edits | DB URL templates | **Demonstrative passwords** (`YOUR_PASSWORD` / `PASSWORD`) on a **real historical Aiven hostname** `pg-25182a71-mbuguamuiruri12-d78e.k.aivencloud.com` | Password: demonstrative. Host: discloses an Aiven instance identity (may be old personal project, **not** the current `pg-1ea96fce-bkgconsultants-…` host) | Would be `avnadmin` if someone substituted a real password | Redact hostnames from public docs; privatise repo; confirm old instance decommissioned |
| `lib/db.ts` comments | Current tree | Documentation example | `avnadmin@pg-xxx.aivencloud.com` placeholder | No | N/A | Optional redact |
| Local `.env` `PROD_DIRECT_URL` | **Not in Git** (gitignored) | Live prod DB URL | **Confirmed genuine shape** (`avnadmin`, `AVNS_`-prefix password metadata, current prod host/port/db, `sslmode=require`) | Treat as **live** until rotated | Full DB admin on production | See Workstation assessment; rotate after isolation plan |

**History scan for `AVNS_` tokens in Git:** **0 commits** introduced an `AVNS_` password into tracked content (pickaxe + patch classification).  
**History scan for `postgresql://avnadmin:`:** multiple commits; line classes overwhelmingly **placeholder**; no `AVNS_` password bodies found in history patches reviewed.

**Finding CE-03 (High — confirmed exposure of infrastructure identity):** Public docs publish a concrete Aiven hostname (older ID).  
**Finding CE-04 (Critical — confirmed workstation; not Git):** Current production `avnadmin` URL exists in local `.env` as `PROD_DIRECT_URL`.

### A3. API keys / tokens in Git

| Pattern | Result |
|---------|--------|
| OpenAI `sk-…` | No tracked application secret matches of production length/shape beyond docs using placeholders |
| Resend `re_…` | Hits in docs are illustrative (`re_xxxxx…`); false positives inside tracked `.venv` bytecode |
| Cloudinary URL with secret | Not found as live URL in tracked app sources |
| AWS `AKIA…` | Not found |
| Real PEM private keys | `DEPLOYMENT_TROUBLESHOOTING.md` contains **commented** `BEGIN OPENSSH PRIVATE KEY` **fence markers** as documentation — not a live key body classified as committed credential |

**Finding CE-05 (Informational):** No confirmed live third-party API key bodies found in application Git content.  
**Finding CE-06 (Medium):** `ENV_VARIABLES_GUIDE.md` includes JWT example strings; some lack the word “change/your” and resemble generated secrets. **Validity vs production JWT: NOT VERIFIED.** Treat as public material; rotate production JWT if any chance of reuse.

### A4. Demo accounts and passwords (public)

Confirmed published in current tree (and history):

- `TEST_CREDENTIALS.md`
- `docs/QUICK_DEMO_REFERENCE.md`
- `SEED_FILE_SAFETY.md`
- `scripts/seed-users.ts`
- `prisma/seed.ts`

Shared password classes published: `admin123`, `doctor123`, `nurse123`, `frontdesk123`, `theatertech123`, `stores123`.

**Finding CE-07 (Critical — confirmed public password disclosure):** Weak shared passwords for named clinic emails are world-readable.  
**Password validity on production:** **NOT VERIFIED** (no authentication attempts). Account **existence** is verified separately in Demo Account Assessment.

### A5. Tracked `.venv` directory

| Item | Evidence |
|------|----------|
| Tracked files under `.venv/` | **1414** paths via `git ls-files` |
| Risk | Public repo bloat; accidental future secret drop into venv harder to notice; noise in secret scanning |

**Finding CE-08 (Medium):** Python virtualenv should not be in application Git history for a public healthcare repo.

### A6. Internal tooling that encourages prod credential use

Scripts (source public; secrets not in scripts):

- `scripts/deploy-production-migrations.ts`
- `scripts/deploy-procedure-category-migration.ts`
- `scripts/deploy-vital-sign-surgical-case-migration.ts`
- `scripts/merge-procedure-catalogue.ts`

These **require** `PROD_DIRECT_URL` from local `.env` and override `DATABASE_URL` to production.

**Finding CE-09 (High):** Public operational pattern normalises keeping production admin DB URLs on laptops.

---

## Severity roll-up (Investigation A)

| ID | Severity | Exposure class |
|----|----------|----------------|
| CE-07 | Critical | Confirmed public demo passwords |
| CE-04 | Critical | Confirmed local prod admin DB URL |
| CE-03 | High | Confirmed public historical Aiven hostname |
| CE-09 | High | Confirmed prod-admin workflow in public scripts |
| CE-08 | Medium | Confirmed tracked `.venv` |
| CE-06 | Medium | Suspected JWT-like doc strings |
| CE-02 | Medium | Demonstrative prod wiring docs |
| CE-01 / CE-05 | Informational | Negative findings (good) |

---

## Credentials requiring immediate invalidation planning

(Do **not** execute until owner approval — listed for readiness.)

1. **Production database password** for `avnadmin` (and any app role) — after confirming exposure surface and scheduling downtime-safe cutover.  
2. **Production `JWT_SECRET` / `JWT_REFRESH_SECRET`** — especially because Preview/Dev share the same Vercel bindings (Phase 1 / Investigation C).  
3. **Cloudinary API secret** and **OpenAI API key** — shared across Vercel environments.  
4. **All staff passwords that match published demo password classes** — if verification later shows reuse (or as precautionary reset for accounts listed in Demo Assessment).  

Demo password **validity** remains NOT VERIFIED until a controlled reset or out-of-band verification procedure is approved.
