# Workflow Catalog — Patient Intake

**Purpose:** This document captures the Patient Intake workflow as a business process, independent of implementation details. It serves as the contract between business stakeholders and engineering.

---

## Workflow Overview

| Attribute | Value |
|-----------|-------|
| **Workflow Name** | Patient Intake |
| **Business Purpose** | Register new patients into the clinic system with verified identity and medical baseline |
| **Primary Owner** | Frontdesk Department |
| **Trigger** | Frontdesk starts intake session OR patient scans QR code |
| **Success Criteria** | Patient record created with unique file number, all required data captured |
| **Failure Criteria** | Session expires, validation fails, duplicate detected, frontdesk rejects |
| **Average Duration** | 5-10 minutes (patient self-service) + 1-2 minutes (frontdesk review) |
| **Events Produced** | 14 |
| **Decision Points** | 2 |
| **AI Opportunities** | 3 |
| **Regulatory Requirements** | Patient consent, data privacy, audit trail |

---

## Entry Points

| Entry Point | Actor | Description |
|-------------|-------|-------------|
| **QR Code Scan** | Patient | Patient scans QR code displayed by frontdesk |
| **Permanent Desk QR** | Patient | Patient scans permanent QR at front desk |
| **Direct Registration** | Frontdesk | Staff opens registration dialog directly |

---

## Exit Points

| Exit Point | Condition | Next Workflow |
|------------|-----------|---------------|
| **Patient Created** | Frontdesk confirms intake | Appointment Scheduling, Queue Management |
| **Session Expired** | 60-minute timeout | Frontdesk starts new session |
| **Submission Rejected** | Frontdesk rejects | Frontdesk restarts intake |
| **Duplicate Detected** | Email already exists | Frontdesk searches existing patient |

---

## State Machine

```
┌─────────────────────────────────────────────────────────────┐
│  INTAKE SESSION LIFECYCLE                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ACTIVE ──(patient submits)──► SUBMITTED ──(frontdesk confirms)──► CONFIRMED
│    │                              │                              │
│    │                              │                              │
│    └──(timeout)──► EXPIRED       └──(frontdesk rejects)──► REJECTED (submission only)
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  PATIENT RECORD LIFECYCLE                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [does not exist] ──(intake confirmed)──► ACTIVE             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Business Rules

| Rule ID | Rule | Enforcement | Rationale |
|---------|------|-------------|-----------|
| BR-INT-001 | Intake must originate from clinic staff | Frontdesk auth required to create session | Prevents unauthorized submissions |
| BR-INT-002 | Sessions expire after 60 minutes | Server-side timestamp check | Prevents stale submissions |
| BR-INT-003 | Email must be unique | Database unique constraint + domain check | Prevents duplicate patient records |
| BR-INT-004 | Required fields: firstName, lastName, DOB, gender, email, phone | Zod schema + domain validation | Ensures minimum viable patient record |
| BR-INT-005 | All three consents required | Domain entity validation | Legal/regulatory requirement |
| BR-INT-006 | File numbers must be sequential (NS001, NS002...) | PatientFileNumberGenerator | Regulatory tracking requirement |
| BR-INT-007 | IntakeSubmission must be reviewed before creating Patient | State machine enforcement | Human verification of patient data |
| BR-INT-008 | Minors (age < 18) flagged in UI | Domain entity calculation | Clinical safety |
| BR-INT-009 | Session is single-use | Status transition ACTIVE → SUBMITTED | Prevents multiple submissions per session |
| BR-INT-010 | IP whitelist optional (configurable) | Middleware check | Network security |

---

## Decision Points

| Decision | Current Actor | Rule | Can Rules Handle It? | AI Useful? |
|----------|--------------|------|---------------------|------------|
| Is intake session complete? | Frontdesk | `submission.isComplete()` checks 5 required fields | Yes — automated | No |
| Should intake be confirmed? | Frontdesk | Visual review + completeness score | Partially — high-score auto-approve possible | Yes — anomaly detection |
| Is this a duplicate patient? | Frontdesk + System | System checks email; frontdesk checks name/phone | Partially — email check automated | Yes — fuzzy demographic matching |
| Does patient need additional info? | Frontdesk | Manual assessment | No — requires clinical judgment | Possibly — AI suggestions |

---

## Events Produced

| Event | When Emitted | Payload Summary |
|-------|--------------|-----------------|
| `intake.session.created` | Frontdesk generates QR | sessionId, expiresAt, qrCodeUrl |
| `intake.session.opened` | Patient opens form | sessionId, ipAddress |
| `intake.submission.created` | Patient submits form | submissionId, sessionId, patientName, email, phone |
| `intake.session.submitted` | Session marked submitted | sessionId |
| `intake.confirmed` | Frontdesk confirms | sessionId, patientId, fileNumber |
| `patient.record.created` | Patient record created | patientId, fileNumber, firstName, lastName |
| `intake.submission.confirmed` | Submission marked confirmed | submissionId, confirmedAt |
| `intake.session.confirmed` | Session marked confirmed | sessionId |
| `intake.session.expired` | Session times out | sessionId, expiredAt |
| `intake.form.viewed` | Form displayed | sessionId |
| `intake.form.step.completed` | Step completed | sessionId, stepNumber |
| `intake.form.draft.saved` | Draft auto-saved | sessionId |
| `patient.record.rejected` | Admin rejects patient | patientId, reason |

---

## Events Consumed

| Event | Consumer | Reaction |
|-------|----------|----------|
| `intake.session.created` | Frontdesk UI | Display QR code, start polling |
| `intake.session.expired` | Frontdesk UI | Show expired state, enable new session |
| `intake.submission.created` | Frontdesk Notification Agent | Alert frontdesk of new submission |
| `patient.record.created` | Appointment Service | Enable appointment scheduling |
| `patient.record.created` | Queue Management | Enable patient queuing |
| `patient.record.created` | Billing | Enable invoice generation |

---

## Integration Points

| System | Purpose | Current Implementation | Future Enhancement |
|--------|---------|------------------------|-------------------|
| **QR Code Library** | Generate QR codes for intake sessions | `qrcode` npm package, server-side generation | Client-side generation, NFC support |
| **Phone Number Validation** | Validate international phone numbers | `react-phone-number-input` library | Real-time validation API |
| **Email Service** | Send confirmation emails (planned) | Not implemented | SendGrid / AWS SES |
| **SMS Service** | Send reminders (planned) | Not implemented | Twilio / AWS SNS |
| **WhatsApp Business API** | Send intake links via WhatsApp | Not implemented — manual copy-paste | Direct WhatsApp integration |
| **Authentication** | JWT-based auth for frontdesk | Custom JWT implementation | OAuth2 / SSO |
| **Database** | PostgreSQL via Prisma ORM | Direct Prisma queries | Read replicas, connection pooling |

---

## Pain Points (Current Implementation)

| Pain Point | Location | Impact | Frequency | Workaround |
|------------|----------|--------|-----------|------------|
| 4-second polling for submission status | `app/frontdesk/intake/start/page.tsx` | Latency, unnecessary DB load | Constant | None — accepted as current behavior |
| Two separate patient creation paths | `app/api/patients/route.ts` + `ConfirmPatientIntakeUseCase` | Code duplication, inconsistent behavior | Every new patient | None |
| Frontdesk must manually copy/send QR link | `app/frontdesk/intake/start/page.tsx` | Operational friction | Every intake session | Copy-paste to WhatsApp |
| No real-time notification on submission | Polling-based | Delayed frontdesk awareness | Every submission | Manual refresh of pending list |
| Draft saved to localStorage per session | `MobileIntakeForm.tsx` | Data loss if browser closed | Rare | None |
| Phone number validation client-side only | Zod schema | Invalid numbers can reach server | Low | Server-side validation added later |

---

## Automation Opportunities (Rules Only)

| Opportunity | Current Implementation | Proposed Automation | Effort | Risk |
|-------------|------------------------|---------------------|--------|------|
| Auto-approve high-score submissions | Manual frontdesk review | Auto-confirm if completeness >= 95% AND no anomalies | Low | Medium — needs audit trail |
| Auto-expire old sessions | Manual check in status endpoint | Background job to mark expired sessions | Low | Low |
| Auto-suggest duplicate patients | Manual visual matching | Fuzzy name + DOB + phone matching at submission time | Medium | Low |
| Auto-assign file numbers | Already automated | No change needed | None | None |
| Auto-notify frontdesk on submission | Polling-based | Event-driven notification | Medium | Low |

---

## Agent Opportunities (Future)

| Opportunity | Current Actor | AI Value Proposition | Confidence | Prerequisites |
|-------------|---------------|---------------------|------------|---------------|
| Duplicate patient detection | Frontdesk | Fuzzy matching + embedding similarity to catch near-duplicates | High | Vector DB for patient embeddings |
| Intake anomaly detection | Frontdesk | Flag unusual data patterns (e.g., fake phone numbers, inconsistent DOB/age) | Medium | Anomaly detection model |
| Smart form suggestions | Patient | Auto-fill address from phone number, suggest emergency contact relation | Medium | External APIs (maps, contacts) |
| Submission pre-approval | Frontdesk | AI pre-reviews submissions, suggests approve/review/reject | Medium | Training data on past approvals |
| Consent simplification | Patient | Simplify legal language into plain language summary | High | LLM with medical consent templates |
| Follow-up scheduling | Frontdesk | Suggest optimal follow-up time based on condition | Medium | Clinical guidelines database |

---

## Proposed Event Names (Final)

| Event | Payload | When Emitted | Consumers |
|-------|---------|--------------|-----------|
| `intake.session.created` | sessionId, createdBy, expiresAt, qrCodeUrl, minutesRemaining | Session generated | Frontdesk UI, Expiry Agent, Analytics |
| `intake.session.opened` | sessionId, ipAddress, userAgent | Form displayed | Analytics, Security Agent |
| `intake.session.submitted` | sessionId, submittedAt | Form submitted | Frontdesk UI |
| `intake.session.confirmed` | sessionId, confirmedAt | Intake confirmed | Session Cleanup Agent |
| `intake.session.expired` | sessionId, expiredAt | Session times out | Cleanup Agent, Frontdesk UI |
| `intake.submission.created` | submissionId, sessionId, patientName, email, phone | Patient submits | Frontdesk Notification Agent, CRM |
| `intake.submission.confirmed` | submissionId, confirmedAt, confirmedBy, patientId | Frontdesk confirms | Audit Agent |
| `intake.submission.rejected` | submissionId, reason, rejectedBy | Frontdesk rejects | Frontdesk UI, Audit Agent |
| `patient.record.created` | patientId, fileNumber, firstName, lastName, email, phone | Patient created | All downstream systems |
| `patient.record.approved` | patientId, approvedBy, approvedAt | Admin approves | Frontdesk UI, Notifications |
| `patient.record.rejected` | patientId, reason, rejectedBy | Admin rejects | Frontdesk UI, Audit Agent |
| `intake.form.viewed` | sessionId | Form displayed | Analytics, Reminder Agent |
| `intake.form.step.completed` | sessionId, stepNumber, stepName | Step completed | Analytics, Reminder Agent |
| `intake.form.draft.saved` | sessionId, draftTimestamp | Draft saved | Analytics, Recovery Agent |

---

## Metrics & KPIs

| Metric | Formula | Target | Current |
|--------|---------|--------|---------|
| Intake Completion Rate | Submissions / Sessions Created | >80% | Unknown |
| Average Time to Submit | Time from session creation to submission | <10 minutes | Unknown |
| Frontdesk Review Time | Time from submission to confirmation | <5 minutes | Unknown |
| Duplicate Detection Rate | Duplicates found / Total patients | <2% | Unknown |
| Form Abandonment Rate | Sessions expired / Sessions created | <20% | Unknown |
| Patient Search Hit Rate | Searches with results / Total searches | >70% | Unknown |

---

## Open Questions

1. **Session Reuse:** Can a session be reused if the patient closes the browser without submitting? Current: No. Possible: Yes, with session reset.
2. **Partial Submissions:** Should patients be able to save and resume later? Current: localStorage draft only. Possible: server-side draft.
3. **Multi-Language:** Should the intake form support languages beyond English? Not currently implemented.
4. **Accessibility:** Does the intake form meet WCAG standards? Unknown — needs audit.
5. **Mobile App:** Should there be a native mobile app instead of web form? Out of scope for current architecture.
6. **Offline Support:** Can patients fill the form offline? Current: localStorage only. Possible: Service Worker + IndexedDB.
