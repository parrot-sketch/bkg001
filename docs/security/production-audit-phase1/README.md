# Tibaflow Production Security Audit — Phase 1

**Status:** Audit complete (inspection only)  
**Audit date:** 2026-11-02  
**Auditor role:** Cloud / DevSecOps / Application Security (evidence-based)  
**Production changes made:** **ZERO**  
**Application source-code changes made:** **ZERO** (documentation deliverables only)

## Documents in this package

| ID | Document | Path |
|----|----------|------|
| A | Production Architecture Inventory | [A-production-architecture-inventory.md](./A-production-architecture-inventory.md) |
| B | Security Assessment | [B-security-assessment.md](./B-security-assessment.md) |
| C | Risk Register | [C-risk-register.md](./C-risk-register.md) |
| D | Production Hardening Roadmap | [D-production-hardening-roadmap.md](./D-production-hardening-roadmap.md) |
| E | ODPC Evidence Mapping | [E-odpc-evidence-mapping.md](./E-odpc-evidence-mapping.md) |

## Scope and method

- Inspected the connected Vercel account after authenticating as `parrot-sketch` / team `psketchs-projects`.
- Inspected the GitHub repository `parrot-sketch/bkg001` metadata and public HTTP behaviour of production aliases.
- Inspected application source and configuration for auth, headers, DB connectivity, and third-party integrations.
- Did **not** access Aiven console (no credentials/session). Owner-supplied Aiven facts are labelled as such.
- Did **not** print, pull, or transmit secret values.
- Did **not** rotate credentials, redeploy, change DNS, modify env vars, or alter the database.

## Classification legend

- **VERIFIED** — Direct evidence from Vercel API/CLI, GitHub API, live HTTP, or repository source.
- **PARTIALLY VERIFIED** — Some evidence exists; material details remain unknown.
- **NOT VERIFIED** — Insufficient evidence (often Aiven console or contractual artefacts).
- **MISCONFIGURED** — Observed setting creates an identifiable security concern.
- **NOT APPLICABLE** — Control does not apply under current architecture/plan.

## Immediate executive verdict

The live clinic system is reachable at **`https://www.nsac.co.ke`** (also `nsac.co.ke`, `bkg001.vercel.app`) on Vercel project **`bkg001`**, Hobby plan, Git-connected to a **public** GitHub repository, with serverless functions in **`iad1`** and an owner-reported Aiven PostgreSQL instance in **`blr`** whose IP allowlist is reported open to all.

Highest-priority concerns: public source repository for a healthcare system, shared production secrets with Preview/Development, database public exposure without Vercel static egress IPs (unavailable on Hobby), and missing production operational secrets (`CRON_SECRET`, email/SMS providers).

**Stop:** No remediation has been applied. Await explicit owner approval before Phase 2 implementation.
