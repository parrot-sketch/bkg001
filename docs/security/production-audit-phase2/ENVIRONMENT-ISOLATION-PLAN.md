# 3. Environment Isolation Plan

**Date:** 2026-11-02  
**Sources:** Vercel project `bkg001` env metadata (names/types/targets only); application dependency map from source.  
**Secret values:** not retrieved.

---

## Current Vercel variable map

| Variable | Type | Targets | Shared binding? | Application dependency |
|----------|------|---------|-----------------|------------------------|
| `DATABASE_URL` | Sensitive (Production) | Production | Separate entry | Prisma runtime (`lib/db.ts`, all DB access) |
| `DATABASE_URL` | Sensitive (Preview) | Preview | Separate entry | Same — **value equality with Production NOT VERIFIED** |
| `DATABASE_URL` | Encrypted (Development) | Development | Separate entry | Local/CLI pulls |
| `DIRECT_URL` | Encrypted | Production + Preview + Development | **Yes — one binding** | Prisma `directUrl` (migrations / some direct ops) |
| `JWT_SECRET` | Encrypted | Prod + Preview + Dev | **Yes** | Access token signing (`AuthFactory`) |
| `JWT_REFRESH_SECRET` | Encrypted | Prod + Preview + Dev | **Yes** | Refresh token signing |
| `CLOUDINARY_CLOUD_NAME` | Encrypted | All three | **Yes** | Uploads / signed URLs |
| `CLOUDINARY_API_KEY` | Encrypted | All three | **Yes** | Cloudinary auth |
| `CLOUDINARY_API_SECRET` | Encrypted | All three | **Yes** | Cloudinary auth |
| `OPENAI_API_KEY` | Encrypted | All three | **Yes** | `/api/clinical/dictation` |
| `NEXT_PUBLIC_APP_URL` | Encrypted | All three | **Yes** | Public client URL |
| `NEXT_PUBLIC_BASE_URL` | Encrypted | All three | **Yes** | Server-side absolute URL helpers |
| `NEXT_PUBLIC_LANDING_VERSION` | Encrypted | All three | **Yes** | Landing variant |

### Absent but referenced by code

`CRON_SECRET`, Resend/SMTP, Twilio, optional JWT TTL overrides.

---

## Risk analysis

### R1 — Shared JWT secrets (Critical)

Any Preview or Development runtime that can read `JWT_SECRET` / `JWT_REFRESH_SECRET` can mint tokens accepted by **Production** if values are identical (single Vercel binding ⇒ identical).

**Preview deployments in last 50:** none observed with `target != production`. Risk is **latent** but structural.

### R2 — Shared `DIRECT_URL` (Critical)

One binding across Prod/Preview/Dev means Preview builds/functions using Prisma `directUrl` hit the **same** database endpoint string as Production.

### R3 — Preview `DATABASE_URL` Sensitive (High until proven)

Separate Sensitive entries exist for Preview vs Production. Values might differ. **NOT VERIFIED.**  
If they match, Preview has full production PHI access.

### R4 — Shared Cloudinary / OpenAI (High)

Preview can upload/read using production media credentials and consume production AI quota; dictation content may leave the clinic boundary.

### R5 — Hobby plan + public Git (High)

Fork protection is on, but anyone with write access to `main` deploys Production. PR previews (if enabled later) would inherit shared secrets unless isolated first.

---

## Target state

| Environment | Database | JWT secrets | Cloudinary | OpenAI | Cron/Email |
|-------------|----------|-------------|------------|--------|------------|
| Production | Prod Aiven only | Prod-only Sensitive | Prod-only | Prod-only (or disabled) | Prod-only Sensitive |
| Preview | **Scrubbed** preview DB **or Preview disabled** | Distinct secrets | Distinct / unsigned dummy | Disabled or separate key | Disabled |
| Development | Local Docker only | Distinct local secrets | Optional sandbox | Optional sandbox | Local mocks |

**Hard rule:** Preview must never receive Production `DATABASE_URL` / `DIRECT_URL` / JWT secrets.

---

## Migration plan (do not execute without approval)

### Step M1 — Decide Preview policy

**Option A (recommended short-term):** Disable Preview deployments for `bkg001` until a scrubbed database exists.  
**Option B:** Provision a separate Aiven/Postgres with synthetic data; point Preview `DATABASE_URL` + `DIRECT_URL` only there.

### Step M2 — Inventory and back up current env metadata

Export **names and targets only** (already done). Store new secrets in an offline password manager before applying.

### Step M3 — Generate new Production secrets

- New `JWT_SECRET` / `JWT_REFRESH_SECRET` (cryptographically random, ≥32 bytes).  
- New Cloudinary secret rotation if Preview ever used prod credentials.  
- New OpenAI key restricted to prod project.  
- Prefer new DB password / least-privilege role (coordinate with Aiven).

### Step M4 — Apply Production-only bindings

For each secret: remove multi-target binding; create **Production** Sensitive entries only. Redeploy Production.

### Step M5 — Force session invalidation

After JWT rotation, all cookies/sessions invalidate naturally (signature fail). Communicate staff re-login.

### Step M6 — Configure Preview (if kept)

Distinct JWT + DB + Cloudinary; Deployment Protection SSO remains; never pull Production env into Preview.

### Step M7 — Development

Developers use `.env.example` → local Docker only; no `PROD_DIRECT_URL` on laptops (see Workstation plan).

### Step M8 — Verification

| Check | Expected |
|-------|----------|
| Vercel UI: JWT targets | Production only |
| Preview deploy (if any) | Cannot read prod patients |
| Production login | Works with new sessions |
| Old JWT | Rejected |
| `DIRECT_URL` Preview | Absent or non-prod host |

### Step M9 — Rollback

Keep previous secret values in offline escrow for ≤24h. Re-apply prior Production values and redeploy if clinic blocked. Prefer forward-fix (issue new secrets) over long rollback windows.

---

## Operational impact

- All users re-authenticate after JWT rotation.  
- In-flight refresh cookies fail until re-login.  
- Dictation/uploads fail if Cloudinary/OpenAI rotated without update.  
- Migration scripts using `PROD_DIRECT_URL` need a new break-glass procedure.

---

## Owner approvals required

1. Preview disable vs scrubbed DB.  
2. JWT/Cloudinary/OpenAI/DB rotation change window.  
3. Staff communication for re-login.  
4. Confirmation whether Preview `DATABASE_URL` historically equalled Production (Vercel UI / out-of-band).
