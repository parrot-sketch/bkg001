# E. ODPC Evidence Mapping

This mapping supports the organisation’s Data Protection Registration Checklist preparation.  
**It does not assert ODPC compliance.** Availability of a vendor security feature is not evidence that the feature is enabled or that processing is lawful.

Reference focus: **Section 4 — International data transfers** and **Section 5 — Risk mitigation measures**.

---

## Section 4 — International data transfers

| Processor / path | Data categories (potential) | Location evidence | Transfer outside Kenya? | Safeguard status |
|------------------|-----------------------------|-------------------|-------------------------|------------------|
| Vercel serverless functions | Account identifiers, clinical API payloads, cookies | Function region **`iad1` (USA)** VERIFIED | **Yes** (VERIFIED compute location) | DPA with Vercel: **NOT VERIFIED**. Encryption in transit (HTTPS) VERIFIED. |
| Vercel edge | TLS session, request metadata | PoP **`cpt1`** observed | Likely yes / multi-PoP | Same as above |
| Aiven PostgreSQL on DigitalOcean | Full patient, clinical, billing DB | Owner: **`blr` / `do-blr1` (India)** | **Yes** if owner region accurate (PARTIALLY VERIFIED) | Aiven/DO DPA: **NOT VERIFIED**. TLS `sslmode=require` PARTIALLY VERIFIED. Public allowlist undermines network safeguard. |
| Cloudinary | Images/PDFs including clinical/consent media | Region **NOT VERIFIED** | Possibly yes | DPA **NOT VERIFIED**; credentials present in Vercel |
| OpenAI | Dictation audio / transcript | Region **NOT VERIFIED** | Likely yes if used | DPA **NOT VERIFIED**; key present—feature activity volume NOT VERIFIED |
| GitHub | Source code, issues (should exclude PHI) | GitHub cloud | Yes | Repo is **public**—inappropriate for any PHI paste; operational risk |
| Resend / Twilio | Notifications | N/A — **not configured** in Vercel | N/A until enabled | Must complete transfer assessment before enablement |
| Browser users in Kenya | Local device | Kenya (users) | Originating jurisdiction | Endpoint security / staff policy NOT VERIFIED |

### Section 4 evidence gaps (owner input required)

1. Signed DPAs / SCCs / contractual clauses for Vercel, Aiven, DigitalOcean, Cloudinary, OpenAI.
2. Written transfer impact assessment for US compute + India database architecture.
3. Confirmation whether any patient-identifying content is stored in GitHub issues, Vercel logs, or third-party tickets.
4. Decision record for why `iad1` was selected versus regions nearer to Kenya or the database.

---

## Section 5 — Risk mitigation measures

| Checklist theme | Control claimed by design | Evidence of actual operation | Gap |
|-----------------|---------------------------|------------------------------|-----|
| Access control | Role-based API auth | Unauthenticated probes → 401 on sampled clinical APIs (VERIFIED). MFA enforcement PARTIALLY VERIFIED. | Enforce MFA; deepen IDOR testing |
| Authentication security | HttpOnly cookies, refresh rotation, login rate limit | Cookie flags VERIFIED in code; DB-backed login rate limit VERIFIED in login route; production JWT secret present | Shared JWT secrets across Preview (TF-P1-003) |
| Encryption in transit | HTTPS / TLS to DB | HSTS on responses VERIFIED; `sslmode=require` PARTIALLY VERIFIED | Prefer verify-full; document cipher policy |
| Encryption at rest | Vendor default | Aiven/Vercel/Cloudinary at-rest encryption **NOT VERIFIED** from console | Obtain vendor attestations |
| Network security | IP restrictions | Vercel trusted IPs none; Aiven allowlist open (owner) | Phase 1 network strategy |
| Secrets management | Vercel encrypted/sensitive env | `DATABASE_URL` Sensitive VERIFIED; many secrets still shared Encrypted across envs | Split environments; secrets manager for break-glass |
| Logging & audit | Audit tables / login attempts | Schema includes `AuditLog`, `LoginAttempt`, clinical audit models | Production log retention & access review NOT VERIFIED |
| Backup | Aiven automated backups | Owner-reported only | Restore drill missing |
| Secure development | CI typecheck + unit/integration | CI workflow VERIFIED; public repo and no branch protection weaken SDLC | Private repo + branch protection |
| Vendor management | Third-party inventory | Inventory started in Document A | Contracts and subprocessors register incomplete |
| Breach readiness | — | Not evidenced | Incident response runbook NOT VERIFIED |

### Section 5 measures that must **not** be claimed yet

- “Database is private / VPC-only” — contradicted by owner allowlist statement and Hobby egress limits.
- “Preview environments are safe for production data” — contradicted by shared secrets metadata.
- “MFA protects all staff accounts” — not verified in login enforcement.
- “Backups guarantee recovery” — restore untested.
- “We do not transfer data internationally” — contradicted by `iad1` function region (and likely `blr` DB).

---

## Suggested artefacts to collect next (owner)

1. Vendor DPAs (PDF) for each active processor.  
2. Aiven screenshot: SSL mode, IP allowlist, backup schedule/retention/encryption, user list.  
3. Vercel team member list + audit log export.  
4. Confirmation whether production staff passwords match published demo credentials.  
5. Written RPO/RTO targets from clinic leadership.
