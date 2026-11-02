# Final Report — Phase 1 Production Security Audit

**Date:** 2026-11-02  
**System:** Tibaflow / Nairobi Sculpt clinic application (`bkg001`)  
**Production changes:** **ZERO**  
**Code remediation changes:** **ZERO** (documentation only under `docs/security/production-audit-phase1/`)

---

## 1. Initial project and production deployment identity

| Field | Value |
|-------|-------|
| Vercel team | `psketchs-projects` (Hobby) |
| Vercel project | `bkg001` |
| GitHub | `parrot-sketch/bkg001` (**public**), production branch `main` |
| Production domains | `https://www.nsac.co.ke`, `https://nsac.co.ke`, `https://bkg001.vercel.app` |
| Production deployment at audit | `dpl_7paewE93TfNjF2PofrMqi2uFVovw` · commit `da0c9d5` · Ready |
| CLI account used | `parrot-sketch` (re-authenticated during audit; prior `parrotaccess` session lacked this project) |

---

## 2. Actual production architecture

- Next.js on Vercel serverless, default function region **`iad1` (USA)**.
- Browser edge responses observed via **`cpt1`**.
- PostgreSQL via Prisma using `DATABASE_URL` / `DIRECT_URL`; production client uses direct connection with `connection_limit=1`.
- Owner-reported DB: Aiven PostgreSQL on DigitalOcean in **`blr`**, public allowlist.
- Media: Cloudinary. Optional AI: OpenAI. Email/SMS providers **not** configured in Vercel.
- Diagram: see Document A.

---

## 3. Vercel security configuration findings

| Topic | Finding |
|-------|---------|
| Plan | Hobby — no Secure Compute / static egress IPs |
| Deployment Protection | SSO for `all_except_custom_domains` |
| Password / IP allowlist | None |
| Git fork protection | On |
| Deployment checks | None |
| Env hygiene | `DATABASE_URL` Sensitive (Prod/Preview); **JWT, DIRECT_URL, Cloudinary, OpenAI shared across Prod+Preview+Dev** |
| Missing env | `CRON_SECRET`, Resend/SMTP, Twilio |
| Crons | Definitions empty; live cron route returns 503 |
| Analytics | Off |

---

## 4. Database connectivity findings

- App depends on Prisma + `DATABASE_URL`/`DIRECT_URL`.
- TLS likely `sslmode=require` (encrypt-in-transit, not full private networking).
- Owner: allowlist open to world → critical when combined with any credential leak.
- Hobby Vercel cannot economically pin egress IPs for allowlisting.
- Local workstation contains `PROD_DIRECT_URL` (gitignored)—high risk if laptop compromised.
- Public docs mention real Aiven hostname with placeholder passwords.

---

## 5. Application security findings

**Strengths observed**

- Many clinical APIs return 401 when unauthenticated (sampled).
- Login uses DB-backed rate limiting; cookies `httpOnly` + `SameSite=Lax` + `secure` in production.
- Recent cookie-session alignment (tokens not returned in JSON body).
- CSP `frame-ancestors 'none'`; HSTS present.
- CI runs `tsc` + unit tests; build job uses dummy DB.

**Weaknesses observed**

- Public repository + published demo credentials.
- Shared production secrets with Preview/Dev.
- CSP `unsafe-inline`/`unsafe-eval`/`https:`; missing several security headers; `Access-Control-Allow-Origin: *` on documents.
- MFA not verified as enforced.
- Public `/api/services`; public detailed `/api/health`.
- Cron/email/SMS gaps.
- Next build ignores TS/ESLint errors (CI partially compensates).
- CSRF programme incomplete relative to cookie auth.
- Authorisation depth / IDOR not fully proven.

---

## 6. External data processing locations

| Processor | Location evidence |
|-----------|-------------------|
| Vercel compute | `iad1` USA (VERIFIED) |
| Vercel edge | `cpt1` observed |
| Aiven/DO DB | `blr` India (owner; PARTIALLY VERIFIED) |
| Cloudinary / OpenAI | Active credentials; regions NOT VERIFIED |
| Resend / Twilio | Not configured |

International transfer is a factual architecture property—not optional marketing text. See Document E.

---

## 7. Confirmed vulnerabilities and misconfigurations

Highest confidence issues:

1. Public healthcare application repository (TF-P1-001).  
2. Production secrets shared with Preview/Development (TF-P1-003).  
3. Owner-reported open DB allowlist + no Vercel static egress on Hobby (TF-P1-002/004).  
4. No GitHub branch protection / empty deployment checks (TF-P1-006/007).  
5. Demo credential documentation in tree (TF-P1-008).  
6. Cron auth not configured (TF-P1-011).  
7. Workstation production DB URL (TF-P1-022).

---

## 8. Unverified items requiring owner input

1. Aiven console confirmation: SSL mode, allowlist, users, backup retention/encryption, whether app uses `avnadmin`.  
2. Whether any production users still use documented demo passwords.  
3. Signed DPAs for Vercel, Aiven, DigitalOcean, Cloudinary, OpenAI.  
4. Cloudinary media ACL / signed URL expiry policy.  
5. Whether Preview deployments ever pointed `DATABASE_URL` at production (Sensitive entries exist for Preview—values unknown).  
6. MFA enrolment state of staff.  
7. Backup restore test evidence / RPO/RTO targets.  
8. Incident response and log retention practice.  
9. Whether `nsac.co.ke` DNS/registrar controls are hardened (third-party nameservers only observed).

---

## 9. Prioritised hardening roadmap

See Document D. Short form:

1. **Phase 1:** Private repo; credential verification/rotation; split Vercel secrets; choose DB network strategy; scrub laptop prod URLs.  
2. **Phase 2:** MFA; branch protection; cron/email secrets with DPAs; least-privilege DB role.  
3. **Phase 3:** Headers/CSP/CSRF; health/services lockdown; TS build strictness; IDOR test pass.  
4. **Phase 4:** Restore drill; RPO/RTO; monitoring.  
5. **Phase 5:** Continuous scanning and access reviews.

---

## 10. Changes made during this exercise

| Change | Production impact |
|--------|-------------------|
| Vercel CLI login to `parrot-sketch` / `psketchs-projects` | None (auth only) |
| `vercel link` to `bkg001` (gitignored `.vercel/`) | None |
| Accidental `.env.local` OIDC token from link → **deleted immediately** | None |
| Documentation written under `docs/security/production-audit-phase1/` | None to runtime |
| **Env vars / deploy / DNS / Aiven / DB / app code remediation** | **Not performed** |

---

## Stop point

Audit Phase 1 is complete. **Await explicit approval** before implementing any remediation from Document D.
