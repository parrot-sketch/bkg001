# D. Production Hardening Roadmap

No step below has been executed. Each item requires **explicit owner approval**.

Cost notes assume current Hobby Vercel team and owner-reported Aiven starter sizing; obtain current vendor quotes before purchase.

---

## Phase 1 — Critical exposure reduction

### D1.1 Make the GitHub repository private
- **Change:** GitHub → repository visibility Private; review collaborator list (`parrot-sketch` admin, `geogrey12muiruri` write, `BKG-Consulting` write).
- **Benefit:** Removes public attack-surface documentation and source maps for adversaries.
- **Ops impact:** Collaborators need org/repo access; some integrations may need re-auth.
- **Cost:** GitHub private repo (free for limited collaborators depending on plan).
- **Dependencies:** None.
- **Rollback:** Re-public (not recommended).
- **Approval:** Owner + repository admin.

### D1.2 Confirm and rotate production credentials if seed passwords exist
- **Change:** Verify no `admin123` / `doctor123`-class passwords on production users; force reset; revoke refresh tokens (`token_version` / RefreshToken table).
- **Benefit:** Closes trivial account takeover.
- **Ops impact:** All staff must set new passwords; brief login disruption.
- **Cost:** Labour only.
- **Dependencies:** Access to production admin or DB (break-glass).
- **Rollback:** N/A for password rotation.
- **Approval:** Clinic operations lead.

### D1.3 Split Production vs Preview/Development secrets on Vercel
- **Change:** Create distinct Production values for `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DIRECT_URL`, Cloudinary, OpenAI. Keep Preview on non-prod database **or** disable Preview entirely until a scrubbed dataset exists. Mark secrets Sensitive.
- **Benefit:** Preview cannot mint production JWTs or touch production media/AI keys.
- **Ops impact:** All sessions invalidated when JWT secrets rotate; redeploy required.
- **Cost:** Labour; possible extra Aiven branch/DB for preview.
- **Dependencies:** Decision on whether Preview may use production data (**should be no** for PHI).
- **Rollback:** Re-point env vars (keep previous secrets in password manager briefly).
- **Approval:** Owner (this mutates production env—out of Phase 1 audit authority).

### D1.4 Decide database network strategy (do not buy yet without choice)
Options (evaluate, then approve one):

| Option | What | Benefit | Cost / impact |
|--------|------|---------|---------------|
| A | Upgrade Vercel for Secure Compute / static IPs + Aiven allowlist those IPs | Closes open DB without moving host | Vercel Pro+ networking fees; app must run in attached region |
| B | Keep Hobby; place DB behind SSH bastion / Cloudflare Tunnel / reverse proxy reachable only from controlled path | Reduces public PG port exposure | Ops complexity; not native to current Vercel setup |
| C | Temporary compensating controls: rotate DB password, restrict to known office IPs **plus** accept residual Vercel dynamic egress breakage risk | Incomplete for serverless | Labour; may break prod if mis-allowlisted |

**Recommendation order:** Prefer **A** if budget allows and Secure Compute is confirmed available for this team after upgrade; else design **B**. Do **not** blindly allowlist a single transient IP.

- **Dependencies:** Vendor confirmation of feature availability after plan change.
- **Approval:** Owner + budget.

### D1.5 Remove production DB URLs from developer workstations
- **Change:** Delete `PROD_DIRECT_URL` from local `.env`; store break-glass credentials in a secrets manager; access prod DB only via approved jump path.
- **Benefit:** Reduces laptop-loss blast radius.
- **Cost:** Labour.
- **Approval:** Each developer + owner.

---

## Phase 2 — Identity, access and secrets hardening

### D2.1 Enforce MFA for privileged clinical roles
- **Change:** Require MFA challenge at login for ADMIN, DOCTOR, NURSE, FRONTDESK, THEATER_TECHNICIAN.
- **Benefit:** Protects PHI accounts from password theft.
- **Ops impact:** Enrolment support for staff.
- **Dependencies:** Product MFA UX completion (schema flags exist).
- **Approval:** Owner + clinical lead.

### D2.2 Branch protection and deployment gates
- **Change:** Protect `main` (PR required, CI required); optionally require Vercel promotion; keep `gitForkProtection`.
- **Benefit:** Stops silent production pushes.
- **Cost:** Slightly slower shipping.
- **Approval:** Owner.

### D2.3 Add missing operational secrets safely
- **Change:** Sensitive `CRON_SECRET`; configure Vercel Cron or external scheduler; add email/SMS only with DPAs and data minimisation.
- **Benefit:** Restores notification integrity; avoids open cron.
- **Approval:** Owner.

### D2.4 Least-privilege database role
- **Change:** Replace app use of `avnadmin` with a role limited to DML on app schemas; keep migrations on a separate break-glass role.
- **Benefit:** Limits blast radius of app credential theft.
- **Dependencies:** Aiven console access.
- **Approval:** Owner.

---

## Phase 3 — Application and deployment security

### D3.1 Tighten security headers / CSP
- **Change:** Add `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`; remove `Access-Control-Allow-Origin: *` unless required; plan CSP nonces.
- **Benefit:** Browser-side hardening.
- **Risk:** CSP breakage for Next hydration—test in Preview first.
- **Approval:** Owner.

### D3.2 CSRF hardening for cookie sessions
- **Change:** Require custom header on mutating API calls and/or double-submit CSRF token.
- **Benefit:** Closes residual cross-site action risk.
- **Approval:** Owner.

### D3.3 Lock down `/api/health?detailed=true` and reconsider `/api/services` anonymity
- **Change:** Authz for diagnostics; decide product need for public price list.
- **Approval:** Owner.

### D3.4 Stop ignoring TypeScript/ESLint in Next build
- **Change:** Flip `ignoreBuildErrors` / eslint ignore after CI is consistently green.
- **Benefit:** Prevents config drift where CI is skipped.
- **Approval:** Owner.

### D3.5 Authorisation / IDOR deep test pass
- **Change:** Systematic role×resource tests for patient, billing, surgical, consent routes.
- **Benefit:** Confidentiality assurance beyond “returns 401 when logged out”.
- **Approval:** Owner.

---

## Phase 4 — Backup, disaster recovery and monitoring

### D4.1 Aiven backup restore drill
- **Change:** Restore latest backup to an isolated instance; measure RTO; verify record counts; **do not** overwrite production during the drill.
- **Benefit:** Converts “backups enabled” into evidence.
- **Dependencies:** Aiven access.
- **Approval:** Owner.

### D4.2 Define RPO/RTO and media recovery
- **Change:** Document DB RPO (backup interval), app config recovery (Vercel), Cloudinary retention/versioning.
- **Approval:** Owner.

### D4.3 Monitoring and audit log review
- **Change:** Alert on auth failures, 5xx spikes, DB connection exhaustion; ensure audit tables are retained and reviewed.
- **Approval:** Owner.

---

## Phase 5 — Continuous security assurance

### D5.1 Dependency scanning / Dependabot / secret scanning
- **Change:** Enable GitHub secret scanning, push protection, Dependabot.
- **Benefit:** Continuous detection.
- **Approval:** Owner (repo settings).

### D5.2 Periodic access reviews
- **Change:** Quarterly review of Vercel members, GitHub collaborators, Aiven users, Cloudinary users.
- **Approval:** Owner.

### D5.3 Penetration test / external assessment
- **Change:** After Phases 1–3, commission scoped web+API test with synthetic data.
- **Cost:** Vendor quote.
- **Approval:** Owner.

---

## Explicit non-actions until approval

- Do not rotate production secrets from this agent session without a written change window.
- Do not tighten Aiven allowlists until egress strategy is chosen (risk of total prod outage).
- Do not upgrade Vercel plan without confirming Secure Compute applicability to `psketchs-projects` / region needs.
- Do not run production restore onto the live instance.
