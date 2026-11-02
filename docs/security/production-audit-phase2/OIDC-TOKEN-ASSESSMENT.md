# 5. OIDC Token Assessment

**Context:** Phase 1 reported that `vercel link` created an OIDC-related entry in `.env.local`, which was deleted immediately.  
**Date:** 2026-11-02  
**Token body:** never reproduced

---

## What was created

| Property | Evidence |
|----------|----------|
| File | `.env.local` (gitignored) |
| Key name | `VERCEL_OIDC_TOKEN` |
| Creation trigger | `vercel link --yes --project bkg001 --scope psketchs-projects` during Phase 1 inventory |
| CLI message | “Downloading a fresh `VERCEL_OIDC_TOKEN` for bkg001” / “Created `.env.local` file” |
| Approximate size | ~1293 bytes file (Phase 1 metadata) |
| Disposition | File **deleted** in the same Phase 1 session; not committed |

---

## Token type and purpose

| Question | Assessment |
|----------|------------|
| Authentication password for the Vercel user account? | **No** — distinct from the CLI `auth.json` user token |
| Project environment secret (JWT_SECRET, DATABASE_URL, etc.)? | **No** |
| Temporary / development federation credential? | **Yes** — Vercel documents project **OIDC** tokens for secure machine identity to Vercel (e.g. local/dev tooling, federated access patterns). CLI labelled it `VERCEL_OIDC_TOKEN` after link |
| Deployment hook secret? | Not indicated |
| Classification | **Short-lived project OIDC credential for local linkage**, not a database or JWT signing secret |

Exact lifetime, audience, and scopes are **PARTIALLY VERIFIED** (depends on Vercel’s current OIDC token semantics for CLI link). Treat as a **bearer credential** while it remains unexpired.

---

## Current validity

| Check | Result |
|-------|--------|
| `.env.local` present now | **No** |
| Key still on disk in repo tree | **No** (`rg` over workspace excluding `.git`/`node_modules`/`/.venv` found no `VERCEL_OIDC_TOKEN` file hits in this Phase 2 pass) |
| Git history | **Not committed** (`.env.local` gitignored) |
| Revoked explicitly via Vercel UI/API? | **NOT VERIFIED** — deletion of the local file does not prove server-side revocation |
| Likely expired? | **Plausible** for OIDC/dev tokens, but **NOT VERIFIED** without Vercel token introspection |

**Residual risk:** Low–Medium. Anyone who captured the token from memory/disk before deletion could use it until expiry/revocation. No evidence it was exfiltrated; no evidence it was logged to the public repo.

---

## Logs and other copies

| Location | Result |
|----------|--------|
| Application Git | Not present |
| Current `.env` / `.env.local` | Absent |
| Agent terminal transcripts | May contain CLI **status lines** (“Created `.env.local`”); Phase 1 process avoided printing the token value. Treat any unknown paste buffer as **suspected** |

---

## Additional action required?

| Action | Required now? | Notes |
|--------|---------------|-------|
| Panic-rotate database/JWT because of this token alone | **No** (different secret class) | Still rotate those for other Phase 2 reasons |
| Re-issue concern for clinic PHI via this token | Indirect — OIDC could allow Vercel project automation abuse if still valid | |
| Owner: review Vercel team activity / revoke dangling OIDC/client sessions | **Recommended** | Use Vercel dashboard account/security settings |
| Avoid `vercel env pull` / `vercel link` on PHI laptops without need | **Recommended** | Prefer read-only API metadata inspection |
| Further local action | None beyond confirming file absence (done) | Do not recreate the token for curiosity |

---

## Finding

| ID | Severity | Statement |
|----|----------|-----------|
| OIDC-01 | Low / Informational | Transient `VERCEL_OIDC_TOKEN` was created and deleted; not in Git; server-side revocation NOT VERIFIED |
| OIDC-02 | Low | Recommend owner confirm no unexpected Vercel access events around Phase 1 link timestamp |
