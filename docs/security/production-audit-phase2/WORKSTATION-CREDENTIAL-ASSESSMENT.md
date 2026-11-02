# 4. Workstation Credential Assessment

**Subject:** gitignored `PROD_DIRECT_URL` on the audit workstation  
**Date:** 2026-11-02  
**Value printed:** never

---

## Existence and shape (metadata only)

| Property | Result |
|----------|--------|
| Present in `/home/parrot/bkg001/.env` | **Yes** |
| Git tracked | **No** (`.env` gitignored; not in `git ls-files`) |
| Ever committed | **No evidence** in `.env` path history |
| Username | `avnadmin` |
| Password class | `AVNS_`-prefixed (Aiven-style) — length observed metadata only |
| Host | `pg-1ea96fce-bkgconsultants-15b6.j.aivencloud.com` (matches Phase 1 production host) |
| Port / DB / SSL | `26567` / `defaultdb` / `sslmode=require` |
| Administrative account? | **Yes** — `avnadmin` is Aiven’s privileged default |

**Classification:** Confirmed live production administrative database credential on a developer workstation.

---

## Where it is referenced

### Runtime / scripts (require the env var; do not embed the secret)

| Path | Behaviour |
|------|-----------|
| `scripts/deploy-production-migrations.ts` | Aborts if unset; sets `process.env.DATABASE_URL = PROD_DIRECT_URL` then runs migrations |
| `scripts/deploy-procedure-category-migration.ts` | Same pattern |
| `scripts/deploy-vital-sign-surgical-case-migration.ts` | Same pattern |
| `scripts/merge-procedure-catalogue.ts` | Reads `PROD_DIRECT_URL` as source DB for catalogue merge |
| `prisma/migrations/.../README.md` (procedure categories / vital sign) | Documents the requirement |

### Local configuration files that depend on it

| File | Role |
|------|------|
| `.env` | Sole observed storage of the value on this workstation |
| `.env.example` | Does **not** define `PROD_DIRECT_URL` (local Docker URLs only) |

No other gitignored env files on this workstation were found carrying the same key during this assessment (`\.env.local` absent).

---

## Necessity for current development workflows

| Workflow | Needs `PROD_DIRECT_URL`? | Safer alternative |
|----------|--------------------------|-------------------|
| Day-to-day `pnpm dev` | **No** — uses local `DATABASE_URL` / `DIRECT_URL` to Docker | Keep local only |
| Unit / CI tests | **No** | Ephemeral Postgres |
| Production Prisma migrate | **Today’s scripts yes** | Break-glass CI job, bastion, or one-time operator machine with secrets manager injection |
| Catalogue merge from prod | **Yes as currently written** | Export scrubbed dump → import to local; or read-only replica with least-privilege role |

**Conclusion:** The credential is **not** required for ordinary feature development. It is required only for a small set of **production mutation** scripts that should not be routine laptop operations.

---

## Git history and logs

| Channel | Result |
|---------|--------|
| Git objects for `.env` | Not found as tracked file |
| Public docs / scripts | Reference the **name** `PROD_DIRECT_URL`, not this workstation’s value |
| Shell/agent transcripts | Phase 1/2 agents were instructed not to print values; treat any past accidental console echo as **suspected** and rotate if uncertain |

---

## Risk

| Factor | Assessment |
|--------|------------|
| Severity | **Critical** if laptop malware/theft occurs while Aiven allowlist remains open |
| Combined with public demo passwords | Amplifies blast radius (app + DB) |
| Least privilege | Missing — uses superuser-class `avnadmin` |

---

## Safe replacement strategy (do not delete yet — per Phase 2 orders)

1. **Escrow:** Ensure the current password is stored in an approved secrets manager / offline break-glass before removing from laptop.  
2. **Replace workflow:** Introduce an owner-operated production migration path that injects `DATABASE_URL` ephemerally (CI with environment secrets, or SSH jump host), **without** persisting `PROD_DIRECT_URL` in developer `.env`.  
3. **Least privilege:** Create `tibaflow_app` / `tibaflow_migrator` roles; stop using `avnadmin` from apps and laptops.  
4. **Rotate** `avnadmin` password after all copies are inventoried (Vercel `DATABASE_URL`/`DIRECT_URL`, laptop, any CI).  
5. **Then** remove `PROD_DIRECT_URL` from `.env` and verify `pnpm dev` still works against Docker.  
6. **Verify:** `rg PROD_DIRECT_URL` on workstation; attempt local migrate against Docker only; confirm production scripts fail closed without break-glass injection.

### Rollback

Re-create `.env` line from secrets manager if an emergency production migration is required during transition.

### Owner approval required

Before deletion, rotation, or Aiven role changes.
