# Tibaflow Security Hardening — Phase 3.1

Exposed staff credential containment (executed 2026-11-02).

| Document | Purpose |
|----------|---------|
| [PHASE3-1-COMPLETION-REPORT.md](./PHASE3-1-COMPLETION-REPORT.md) | Executive completion answers |
| [STAFF-CREDENTIAL-CONTAINMENT.md](./STAFF-CREDENTIAL-CONTAINMENT.md) | Account list + actions |
| [SESSION-REVOCATION-REPORT.md](./SESSION-REVOCATION-REPORT.md) | Refresh-token evidence |
| [MFA-IMPLEMENTATION-ASSESSMENT.md](./MFA-IMPLEMENTATION-ASSESSMENT.md) | MFA not enforceable |

**Owner action required:** retrieve temporary passwords from the offline escrow file under `~/.tibaflow-phase31-escrow/` (mode 0600), distribute out-of-band, confirm logins, then securely delete the escrow file. Do not commit escrow contents.
