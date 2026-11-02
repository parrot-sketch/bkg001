# C. Risk Register

Prioritisation emphasises patient confidentiality, database exposure, privileged access, authentication strength, and availability.

| Rank | ID | Title | Severity | Likelihood | Patient-data impact | Status |
|------|----|-------|----------|------------|---------------------|--------|
| 1 | TF-P1-002 | Database reachable from any IP (owner) + credential theft path | Critical | High (if creds leak) | Direct PHI store compromise | Open |
| 2 | TF-P1-003 | Production JWT/media/AI secrets shared with Preview/Dev | Critical | High | Session forgery / data exfil via shared keys | Open |
| 3 | TF-P1-001 | Public GitHub repository for healthcare system | Critical | Certain (now) | Enables targeted attacks; may leak operational detail | Open |
| 4 | TF-P1-008 | Weak documented credentials; possible prod reuse | Critical* | Unknown | Account takeover of clinical roles | Open — *confirm prod |
| 5 | TF-P1-004 | Hobby plan prevents Vercel static egress allowlisting | High | Certain | Blocks economical closure of TF-P1-002 | Open |
| 6 | TF-P1-022 | Production DB URL on workstation | High | Medium | Same as DB compromise if laptop lost | Open |
| 7 | TF-P1-006 / 007 | No branch protection; auto-prod deploy | High | Medium | Integrity of clinical software | Open |
| 8 | TF-P1-005 | International processing (US compute / India DB) | High | Certain | Regulatory transfer risk | Open |
| 9 | TF-P1-016 | MFA not verified as enforced | High | Medium | Credential stuffing → PHI | Open |
| 10 | TF-P1-021 | Backups unproven for restore | High | Medium | Availability after loss | Open |
| 11 | TF-P1-013 / 014 | Weak CSP / missing headers | Medium | Medium | XSS / browser hardening gap | Open |
| 12 | TF-P1-015 | CSRF programme incomplete vs cookie sessions | Medium | Low–Medium | Unwanted authenticated actions | Open |
| 13 | TF-P1-011 | Cron notifications unavailable | Medium | Certain (now) | Missed clinical/ops notifications | Open |
| 14 | TF-P1-010 | Detailed health disclosure | Medium | Low | Recon aid | Open |
| 15 | TF-P1-017 | Residual IDOR / authz depth | Medium | Unknown | Cross-patient disclosure | Open |
| 16 | TF-P1-018 | Upload/Cloudinary residual controls | Medium | Unknown | Inappropriate media exposure | Open |
| 17 | TF-P1-012 | Email/SMS not configured | Medium | Certain | Availability / care coordination | Open |
| 18 | TF-P1-020 | Build ignores TS/ESLint errors | Medium | Low (CI mitigates) | Defects reaching prod | Open |
| 19 | TF-P1-023 | Public docs expose DB hostname | Medium | Certain | Targeted scanning | Open |
| 20 | TF-P1-009 | Public services price list | Low | Certain | Business recon | Open |
| 21 | TF-P1-024 / 025 | CI dummy DB; SSO excludes custom domains | Informational | — | Context only | Accepted / monitor |

## Risk treatment summary (proposed, not applied)

1. **Contain data plane:** Assume DB credentials are high-value; rotate after access review; shrink network exposure as soon as an egress strategy exists.
2. **Contain identity plane:** Split env secrets; enforce MFA; invalidate sessions after JWT rotation.
3. **Contain source plane:** Private repository + branch protection.
4. **Prove recoverability:** Backup restore drill before expanding features.
5. **Document transfers:** ODPC Section 4 file for Vercel/Aiven/Cloudinary/OpenAI.

No risk has been marked “Closed” in this phase—inspection only.
