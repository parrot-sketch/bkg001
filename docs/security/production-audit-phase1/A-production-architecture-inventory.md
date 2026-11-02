# A. Production Architecture Inventory

**Classification baseline:** Items marked VERIFIED were observed directly on 2026-11-02.

## 1. Project and production identity

| Item | Value | Status |
|------|-------|--------|
| Vercel team | `psketchs-projects` (“psketch's projects”) | VERIFIED |
| Vercel team plan | Hobby (`billing.plan = hobby`) | VERIFIED |
| Vercel project | `bkg001` (`prj_T8J6zbuCihXhdaBDyXoM2AENBbhp`) | VERIFIED |
| Framework | Next.js (`framework: nextjs`), Node.js 24.x | VERIFIED |
| Git provider | GitHub | VERIFIED |
| Git repository | `parrot-sketch/bkg001` | VERIFIED |
| Git visibility | **public** (`githubRepoVisibility: public`; GitHub API `visibility: public`) | VERIFIED |
| Production branch | `main` | VERIFIED |
| Production deployment (audit time) | `dpl_7paewE93TfNjF2PofrMqi2uFVovw` · commit `da0c9d5` · Ready | VERIFIED |
| Custom domain | `nsac.co.ke` (third-party registrar/nameservers) | VERIFIED |
| Production aliases | `https://www.nsac.co.ke`, `https://nsac.co.ke`, `https://bkg001.vercel.app`, project and git-main `*.vercel.app` aliases | VERIFIED |
| Connected GitHub homepage field | `https://bkg001.vercel.app` | VERIFIED |

### Authentication used for this inventory

- CLI user: `parrot-sketch`
- Team role: OWNER
- Prior CLI session on `parrotaccess` did **not** contain this project (wrong account). Re-authentication to `psketch` was required and completed for this audit.

## 2. Application execution topology

| Item | Observed | Status |
|------|----------|--------|
| Serverless function region (project default) | `iad1` (Washington, D.C., USA) | VERIFIED |
| Edge PoP observed on HTTP responses | `cpt1` (Cape Town) in `x-vercel-id` for browser requests to `www.nsac.co.ke` / `bkg001.vercel.app` | VERIFIED |
| Runtime | Node.js serverless / Next.js App Router route handlers | VERIFIED |
| Edge Middleware / Proxy | `proxy.ts` present (Next.js “proxy” convention); sets CSP; does **not** enforce auth | VERIFIED |
| Multi-region app deployment | No additional function regions configured beyond `iad1` | VERIFIED |
| Web Analytics | Disabled | VERIFIED |
| Cron definitions on Vercel project | `crons.definitions: []` (empty) | VERIFIED |
| Build machine | basic / 2 vCPU (plan default) | VERIFIED |

**Implication:** Application compute for patient APIs runs in the United States (`iad1`). Owner-reported database is in Bengaluru (`blr`). Browser edge termination may occur in Africa (`cpt1`). These are **not** the same region.

## 3. Database (owner-supplied + code evidence)

### Owner-supplied Aiven facts (NOT independently verified in Aiven console)

| Item | Owner-supplied value | Status |
|------|----------------------|--------|
| Provider | Aiven PostgreSQL 17.11 on DigitalOcean | NOT VERIFIED (owner evidence) |
| Host | `pg-1ea96fce-bkgconsultants-15b6.j.aivencloud.com` | PARTIALLY VERIFIED (matches local `.env` host metadata; value not re-printed) |
| Port | `26567` | PARTIALLY VERIFIED (same) |
| Database name | `defaultdb` | NOT VERIFIED in live config |
| SSL mode | `require` | PARTIALLY VERIFIED (docs + connection string pattern) |
| Plan / nodes | 1 CPU / 1 GB / 8 GB / 1 node | NOT VERIFIED |
| Connection limit | 25 | PARTIALLY VERIFIED (referenced in `lib/db.ts` comments and pool_size=1 strategy) |
| IP allowlist | Open to all | NOT VERIFIED (owner evidence; treat as likely until Aiven confirms) |
| Backups | Enabled; ~22h old at initial assessment; location `do-blr1` | NOT VERIFIED |

### Application connectivity (VERIFIED in source / Vercel metadata)

| Item | Evidence |
|------|----------|
| ORM | Prisma (`prisma/schema.prisma`: `provider = postgresql`, `url = env("DATABASE_URL")`, `directUrl = env("DIRECT_URL")`) |
| Production client strategy | `lib/db.ts`: direct Aiven URL with `connection_limit=1&pool_timeout=10`; optional Prisma Accelerate if URL is `prisma://` |
| Vercel `DATABASE_URL` | Present; **Sensitive** for Production and Preview; Encrypted for Development (separate entries) |
| Vercel `DIRECT_URL` | Present; **single** encrypted variable targeting Production **and** Preview **and** Development (same key/value binding across environments) |
| TLS verification nuance | `sslmode=require` encrypts in transit; does **not** by itself prove full certificate validation (`verify-full`) |
| Admin DB user | Owner/docs patterns use `avnadmin`; whether production app uses a least-privilege role is NOT VERIFIED |

## 4. Secrets and environment variables (names only)

### Present on Vercel project `bkg001`

| Name | Type | Targets | Notes |
|------|------|---------|-------|
| `DATABASE_URL` | sensitive (Prod, Preview); encrypted (Dev) | Split by environment | Strongest protection among DB vars |
| `DIRECT_URL` | encrypted | Production, Preview, Development | **Shared binding across all three** |
| `JWT_SECRET` | encrypted | Production, Preview, Development | Shared binding |
| `JWT_REFRESH_SECRET` | encrypted | Production, Preview, Development | Shared binding |
| `CLOUDINARY_CLOUD_NAME` | encrypted | All three | Shared binding |
| `CLOUDINARY_API_KEY` | encrypted | All three | Shared binding |
| `CLOUDINARY_API_SECRET` | encrypted | All three | Shared binding |
| `OPENAI_API_KEY` | encrypted | All three | Shared binding |
| `NEXT_PUBLIC_APP_URL` | encrypted | All three | Public-by-prefix; still stored encrypted |
| `NEXT_PUBLIC_BASE_URL` | encrypted | All three | Public-by-prefix |
| `NEXT_PUBLIC_LANDING_VERSION` | encrypted | All three | Public-by-prefix |

### Expected by code but absent from Vercel env list

`CRON_SECRET`, `RESEND_API_KEY` / `RESEND_FROM_EMAIL` / `EMAIL_FROM`, SMTP trio, Twilio trio, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `NODE_ENV` (platform-provided).

Live probe: `GET https://www.nsac.co.ke/api/cron/dispatch-notifications` → **503** `"Cron authentication is not configured"` — consistent with missing `CRON_SECRET` in production.

### Local workstation risk (not Vercel)

Local `.env` contains a `PROD_DIRECT_URL` key pointing at the Aiven host (secret value not recorded here). File is gitignored and not tracked. Remains a workstation secret-hygiene risk.

## 5. Networking and exposure

| Control | Observation | Status |
|---------|-------------|--------|
| Public HTTPS application | Yes — custom domain and `*.vercel.app` | VERIFIED |
| Vercel Deployment Protection (SSO) | `all_except_custom_domains` | VERIFIED |
| Password protection | None | VERIFIED |
| Trusted IPs / IP allowlist on Vercel project | None | VERIFIED |
| Git fork protection | Enabled | VERIFIED |
| Deployment checks | None configured | VERIFIED |
| Stable outbound IPs / Secure Compute | **Not available on Hobby** | VERIFIED (plan) |
| DDoS / platform edge protection | Relies on Vercel platform defaults | PARTIALLY VERIFIED |
| Aiven IP restriction | Owner: open to all | NOT VERIFIED |

## 6. Third-party / processing inventory

| Service | Purpose | Active in prod? | Likely data categories | Processing location (evidence) |
|---------|---------|-----------------|------------------------|--------------------------------|
| Vercel | App hosting, TLS termination, serverless | Yes | Auth cookies, API traffic, logs metadata, possibly PHI in function memory/logs | Functions `iad1` (US); edge PoP observed `cpt1` |
| Aiven / DigitalOcean | Primary PostgreSQL | Yes (health DB ok) | Full clinical/operational database | Owner: `blr` / `do-blr1` |
| GitHub | Source, CI, deploy trigger | Yes | Source code; **not** intended for PHI, but public repo exposes system design | GitHub cloud (international) |
| Cloudinary | Image/PDF object storage | Configured in Vercel env | Doctor images, medical image uploads, consent PDFs (by route design) | Cloudinary regions NOT VERIFIED |
| OpenAI | Clinical dictation | Key present in Vercel | Audio/transcript clinical content if feature used | OpenAI processing location NOT VERIFIED |
| Resend / SMTP | Email notifications | **Not configured** in Vercel env; code falls back to mock | Would include appointment/notification content | N/A until enabled |
| Twilio | SMS | **Not configured** in Vercel env | Would include patient phone / message content | N/A until enabled |
| GitHub Actions CI | Unit/integration/build | Yes on push to `main` | Uses dummy DB URL in build job; no repo Actions secrets configured | GitHub-hosted runners |

## 7. Architecture diagram

```text
                         [ Clinicians / Frontdesk browsers ]
                                        |
                                        | HTTPS
                                        v
                     +--------------------------------------+
                     | Vercel Edge PoP (observed: cpt1)     |
                     | Domains: www.nsac.co.ke / nsac.co.ke  |
                     |          bkg001.vercel.app           |
                     +--------------------------------------+
                                        |
                                        v
                     +--------------------------------------+
                     | Vercel Serverless (region: iad1 USA) |
                     | Next.js App Router + API routes      |
                     | Auth: HttpOnly JWT cookies           |
                     | proxy.ts: CSP headers only           |
                     +--------------------------------------+
                        |              |              |
           DATABASE_URL |              |              | HTTPS APIs
           DIRECT_URL   |              |              |
                        v              v              v
              +----------------+  +-----------+  +-------------+
              | Aiven Postgres |  | Cloudinary|  | OpenAI      |
              | (owner: blr /  |  | media     |  | dictation   |
              |  DO), SSL      |  |           |  | (if used)   |
              | allowlist:     |  +-----------+  +-------------+
              | owner=open-all |
              +----------------+

 GitHub (PUBLIC) parrot-sketch/bkg001
        |
        | push to main → Vercel production deploy + GitHub Actions CI
        v
 Vercel project bkg001 (Hobby) + GH workflows (unit / integration / build)
```

## 8. Changes made during inventory

**None** to production, Aiven, DNS, or application code. Local-only: temporary Vercel project link under gitignored `.vercel/`; accidental `.env.local` OIDC token file was removed immediately and was never committed.
