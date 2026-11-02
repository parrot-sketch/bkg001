# B. Security Assessment

Findings use IDs `TF-P1-###`. Severity aligns with the Risk Register.

---

### TF-P1-001 — Public GitHub repository for a healthcare system
- **Component:** GitHub `parrot-sketch/bkg001`
- **Observed:** `visibility: public`; Vercel deployment meta `githubRepoVisibility: public`
- **Evidence:** GitHub API; Vercel deployment metadata
- **Impact:** Full application source, auth design, seed credential docs, operational runbooks, and attack surface are world-readable. Increases targeted exploitation risk against production.
- **Severity:** Critical
- **Classification:** MISCONFIGURED
- **Remediation:** Make the repository private; review commit history for secrets; restrict clone access to clinic operators.

### TF-P1-002 — Aiven PostgreSQL reported open to the internet
- **Component:** Aiven PostgreSQL (owner evidence)
- **Observed:** IP allowlist “open to all”; host publicly resolvable on port `26567`
- **Evidence:** Owner statement; host appears in local env metadata (value not disclosed)
- **Impact:** Anyone who obtains credentials can attempt direct DB access from any network. Combined with serverless dynamic egress, IP allowlisting is hard on Hobby.
- **Severity:** Critical
- **Classification:** PARTIALLY VERIFIED (owner) / treat as active risk until disproven
- **Remediation:** Restrict allowlist once a stable egress strategy exists (requires Vercel plan with static IPs / Secure Compute, or a reverse proxy/bastion, or migrate DB networking). Rotate `avnadmin` if ever exposed. Prefer least-privilege DB role for the app.

### TF-P1-003 — Production secrets shared with Preview and Development
- **Component:** Vercel environment variables
- **Observed:** Single bindings for `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DIRECT_URL`, Cloudinary trio, `OPENAI_API_KEY`, and public URL vars target Production+Preview+Development together. Only `DATABASE_URL` is split (Sensitive Prod/Preview, Encrypted Dev).
- **Evidence:** Vercel project env API (`type`/`target` metadata only)
- **Impact:** Preview deployments and local `vercel env pull` workflows can share production signing keys and media/AI credentials. A malicious or compromised preview path can mint valid production JWTs if it shares JWT secrets.
- **Severity:** Critical
- **Classification:** MISCONFIGURED
- **Remediation:** Separate Production secrets from Preview/Development; mark secrets Sensitive; never reuse JWT signing keys across environments.

### TF-P1-004 — Hobby plan blocks economical DB network lockdown with Vercel
- **Component:** Vercel billing plan
- **Observed:** `billing.plan = hobby`; Secure Compute / static outbound IPs not an entitlement on this plan
- **Evidence:** Vercel Teams API billing object
- **Impact:** Cannot allowlist Vercel→Aiven traffic by stable IP without changing architecture or plan. Leaves a structural gap while DB remains publicly reachable.
- **Severity:** High
- **Classification:** VERIFIED (plan limitation)
- **Remediation:** Evaluate Pro/Enterprise Secure Compute **or** alternative private connectivity (SSH tunnel sidecar is not native on Vercel). Do not buy blindly—cost/benefit in Roadmap Phase 1.

### TF-P1-005 — Cross-border processing path (Kenya clinic → US compute → India DB)
- **Component:** Vercel `iad1` + Aiven `blr` + edge `cpt1`
- **Observed:** Function region `iad1`; owner DB region `blr`; response headers show edge `cpt1`
- **Evidence:** Vercel project `serverlessFunctionRegion`; HTTP `x-vercel-id`; owner Aiven region
- **Impact:** Personal and medical data in API requests/DB queries are processed outside Kenya. Requires documented transfer safeguards (ODPC Section 4), not merely TLS.
- **Severity:** High
- **Classification:** VERIFIED (compute/edge) / PARTIALLY VERIFIED (DB region)
- **Remediation:** Document transfers; consider regional placement closer to Kenya/clinic policy; contractual DPAs with each processor.

### TF-P1-006 — No GitHub branch protection on `main`
- **Component:** GitHub repository
- **Observed:** Branch protection API returns 404; Production GitHub Environment has empty `protection_rules`; `can_admins_bypass: true`
- **Evidence:** GitHub API
- **Impact:** Direct pushes to `main` deploy to production via Vercel Git integration without required reviews.
- **Severity:** High
- **Classification:** MISCONFIGURED
- **Remediation:** Require PR reviews, status checks (CI), and restrict who can push to `main`.

### TF-P1-007 — Production deploy triggers on every `main` push without deployment checks
- **Component:** Vercel Git integration
- **Observed:** Auto production deploys from `main`; `project checks` empty; SSO protection excludes custom domains
- **Evidence:** Vercel protection/checks APIs; deployment history
- **Impact:** Compromised GitHub write access → immediate production code execution with production secrets.
- **Severity:** High
- **Classification:** VERIFIED
- **Remediation:** Required CI checks; optional Vercel Deployment Protection for previews; consider promotion workflow.

### TF-P1-008 — Demo/seed credentials documented in the public tree
- **Component:** Repository docs/scripts
- **Observed:** `TEST_CREDENTIALS.md`, seed scripts, and related docs publish role emails and weak passwords (e.g. `admin123`, `doctor123`)
- **Evidence:** Public files in repository
- **Impact:** If any seed user still exists in production with unchanged passwords, trivial account takeover.
- **Severity:** Critical (if reused in prod) / High (information disclosure even if not)
- **Classification:** VERIFIED disclosure; production password reuse NOT VERIFIED
- **Remediation:** Confirm production passwords rotated; remove or privatise credential docs; block seed scripts from production.

### TF-P1-009 — Unauthenticated service catalogue disclosure
- **Component:** `GET /api/services`
- **Observed:** HTTP 200 on production with service names, descriptions, prices, categories; code comments mark it public
- **Evidence:** Live probe `https://www.nsac.co.ke/api/services`; source `app/api/services/route.ts`
- **Impact:** Business/pricing enumeration; not PHI by itself, but expands reconnaissance.
- **Severity:** Low / Informational (context-dependent)
- **Classification:** VERIFIED
- **Remediation:** Require auth if public listing is unnecessary; otherwise accept as intentional with rate limits.

### TF-P1-010 — Public health endpoint reveals production DB liveness (and detailed diagnostics)
- **Component:** `/api/health` (+ `?detailed=true`)
- **Observed:** Unauthenticated 200; `checks.database: ok`; detailed mode returns latency, memory, PID
- **Evidence:** Live probes
- **Impact:** Assists attackers in timing outages/attacks; detailed mode is higher disclosure than needed publicly.
- **Severity:** Medium (detailed) / Low (basic)
- **Classification:** MISCONFIGURED for detailed public access
- **Remediation:** Restrict detailed health to authenticated/ops; keep basic probe minimal.

### TF-P1-011 — Cron dispatcher misconfigured in production
- **Component:** `/api/cron/dispatch-notifications`
- **Observed:** 503 “Cron authentication is not configured”; `CRON_SECRET` absent from Vercel env; Vercel cron definitions empty
- **Evidence:** Live probe; env inventory; project `crons.definitions: []`
- **Impact:** Notification outbox likely not processing in production; if `CRON_SECRET` were missing while NODE_ENV were non-production semantics, risk would differ—here production correctly fails closed, but availability suffers.
- **Severity:** Medium (availability / integrity of notifications)
- **Classification:** MISCONFIGURED
- **Remediation:** Add Sensitive `CRON_SECRET`, configure Vercel Cron or external scheduler with Bearer auth.

### TF-P1-012 — Email and SMS providers not configured
- **Component:** Resend/SMTP/Twilio env
- **Observed:** Keys absent from Vercel; code paths use mock/console when unset
- **Evidence:** Env inventory; `EmailNotificationService` / `TwilioSmsService`
- **Impact:** Operational gap (patients may not receive messages). Lower direct confidentiality risk until enabled—then DPAs and data-minimisation required.
- **Severity:** Medium (availability/ops)
- **Classification:** VERIFIED absent

### TF-P1-013 — CSP allows `unsafe-inline` and `unsafe-eval`; `connect-src`/`script-src` include broad `https:`
- **Component:** `proxy.ts` security headers
- **Observed:** Production CSP includes `'unsafe-inline' 'unsafe-eval'` and `https:` for scripts/connect
- **Evidence:** Live response headers; source
- **Impact:** Weakens XSS mitigation. `frame-ancestors 'none'` and HSTS are positive.
- **Severity:** Medium
- **Classification:** MISCONFIGURED (relative to strict healthcare hardening)
- **Remediation:** Move toward nonces/hashes; tighten `connect-src` allowlists.

### TF-P1-014 — Missing common browser security headers
- **Component:** HTTP responses
- **Observed:** No `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy` on sampled pages; `Access-Control-Allow-Origin: *` present on HTML responses
- **Evidence:** `curl -sI https://www.nsac.co.ke/login`
- **Impact:** MIME sniffing / referrer leakage / overly broad CORS signal on document responses.
- **Severity:** Low–Medium
- **Classification:** MISCONFIGURED
- **Remediation:** Add headers in `proxy.ts` / Next config; remove blanket `*` unless intentionally required.

### TF-P1-015 — Cookie auth model improved but CSRF surface remains
- **Component:** Login/refresh cookie issuance
- **Observed:** `httpOnly: true`, `sameSite: 'lax'`, `secure` in production; tokens no longer returned in JSON body (recent change). No explicit CSRF token framework found for cookie-authenticated mutating API calls.
- **Evidence:** `app/api/authentication/login|refresh`; AuthContext cookie-session alignment
- **Impact:** `SameSite=Lax` blocks many cross-site POSTs but is not a complete CSRF programme for all browser cases.
- **Severity:** Medium
- **Classification:** PARTIALLY VERIFIED
- **Remediation:** Confirm all state-changing APIs require custom headers or CSRF tokens; keep refresh rotation/revocation tested.

### TF-P1-016 — MFA fields exist; enforced MFA not verified in login path
- **Component:** Auth / User model
- **Observed:** `mfa_enabled` / `mfa_secret` columns; admin staff routes set flags; login route rate-limits but MFA challenge not confirmed as mandatory for clinical roles
- **Evidence:** Prisma schema; admin staff routes; login route review
- **Impact:** Password-only access to PHI-bearing roles if MFA unused.
- **Severity:** High
- **Classification:** PARTIALLY VERIFIED
- **Remediation:** Enforce MFA for ADMIN/DOCTOR/NURSE/FRONTDESK; verify enrolment UX.

### TF-P1-017 — API authentication broadly present; authorisation depth uneven
- **Component:** `/app/api/**`
- **Observed:** Sampled sensitive endpoints return 401 without cookies. Many routes call `authenticateRequest` / role checks; residual risk of IDOR within authenticated roles requires systematic review beyond this phase.
- **Evidence:** Live unauth probes; route grep counts; recent unit tests for some authorisation paths
- **Impact:** Unauthenticated access to core clinical APIs appears blocked; privilege confusion / cross-patient IDOR remains a residual appsec concern.
- **Severity:** Medium (residual)
- **Classification:** PARTIALLY VERIFIED (authn stronger than authz proof)

### TF-P1-018 — File uploads go to Cloudinary with type/size checks
- **Component:** `/api/upload`, medical image routes
- **Observed:** Auth + role gate; MIME allowlist; size limits; Cloudinary credentials in env
- **Evidence:** Source review
- **Impact:** Reasonable baseline; malware scanning, per-patient access controls on signed URLs, and Cloudinary bucket publicity settings NOT VERIFIED.
- **Severity:** Medium residual
- **Classification:** PARTIALLY VERIFIED

### TF-P1-019 — SQL injection baseline via Prisma
- **Component:** Data access
- **Observed:** Dominant use of Prisma client; raw SQL exists in limited helper paths (health uses Prisma count)
- **Evidence:** Repository patterns
- **Impact:** Prisma parameterisation reduces classic SQLi; any `$queryRaw` unsanitised usage needs continued review.
- **Severity:** Low (current baseline)
- **Classification:** PARTIALLY VERIFIED

### TF-P1-020 — `next.config.mjs` ignores ESLint and TypeScript build errors
- **Component:** Build configuration
- **Observed:** `eslint.ignoreDuringBuilds: true`; `typescript.ignoreBuildErrors: true`
- **Evidence:** `next.config.mjs`
- **Impact:** Unsafe code can ship if CI typecheck is skipped or bypassed. CI currently runs `tsc --noEmit` separately (positive control).
- **Severity:** Medium
- **Classification:** MISCONFIGURED
- **Remediation:** Keep CI typecheck mandatory; eventually stop ignoring build-time TS/ESLint.

### TF-P1-021 — Backup/restore capability not proven
- **Component:** Aiven backups
- **Observed:** Owner reports automated backups enabled; restore never tested in this audit
- **Evidence:** Owner statement only
- **Impact:** Backup existence ≠ recoverable clinic after ransomware/loss.
- **Severity:** High (availability)
- **Classification:** NOT VERIFIED (restore)
- **Remediation:** Documented restore drill to non-prod; record RPO/RTO evidence.

### TF-P1-022 — Workstation holds production DB URL
- **Component:** Local `.env` `PROD_DIRECT_URL`
- **Observed:** Present on audit workstation; gitignored; not in git history as tracked file
- **Evidence:** Local key inventory (values not disclosed)
- **Impact:** Laptop compromise yields production DB credentials while allowlist is open.
- **Severity:** High
- **Classification:** VERIFIED presence of key
- **Remediation:** Remove production URLs from developer laptops; use break-glass secrets manager; rotate if exposure suspected.

### TF-P1-023 — Public docs reference real Aiven hostname with placeholder passwords
- **Component:** `QUICK_START_AIVEN.md`, `PRODUCTION_DB_SETUP.md`, etc.
- **Observed:** Real hostname patterns + placeholder password markers in public repo
- **Evidence:** Repo scan (no live `AVNS_` tokens found in tracked files)
- **Impact:** Facilitates targeted scanning of the specific instance.
- **Severity:** Medium
- **Classification:** MISCONFIGURED (information disclosure)
- **Remediation:** Redact hostnames from public docs or privatise repo.

### TF-P1-024 — No repository Actions secrets; CI uses dummy DB for build
- **Component:** GitHub Actions
- **Observed:** `actions/secrets` total 0; CI build uses dummy `DATABASE_URL`
- **Evidence:** GitHub API; `.github/workflows/ci.yml`
- **Impact:** Positive (build does not need prod DB). Integration job uses ephemeral Postgres service—good isolation.
- **Severity:** Informational
- **Classification:** VERIFIED

### TF-P1-025 — Deployment Protection does not cover custom domains
- **Component:** Vercel SSO protection
- **Observed:** `deploymentType: all_except_custom_domains`
- **Evidence:** Vercel protection API
- **Impact:** Expected for a public clinic app on custom domain; preview `*.vercel.app` deployments are the ones gated. Ensure preview envs do not use production data (see TF-P1-003).
- **Severity:** Informational / depends on preview data
- **Classification:** VERIFIED
