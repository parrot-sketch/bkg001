# Consent Management System Design

**Last Updated:** January 2025  
**Status:** Design Phase

## Overview

A safe, compliant consent management system that allows doctors to manage their own consent documents while maintaining a clear audit trail and avoiding heavy regulatory burden.

## Core Principles

1. **Transparency Over Compliance**: We document everything clearly but don't claim legal binding status
2. **Audit Trail First**: Every action is logged with timestamp, user, and IP
3. **Version Control**: Consent templates are versioned to track changes
4. **Simple Signature Capture**: Canvas-based signature (documented acknowledgment, not legal e-signature)
5. **PDF Generation**: All signed consents generate downloadable PDFs for records

## Architecture

### Data Model

```
ConsentTemplate (Doctor-managed)
├── id, title, type, content (HTML/Markdown)
├── version, is_active
└── created_by (doctor_id)

ConsentForm (Patient-specific instance)
├── case_plan_id, template_id (reference)
├── content_snapshot (frozen at creation time)
├── status (DRAFT → PENDING_SIGNATURE → SIGNED → REVOKED)
├── patient_signature (base64 canvas image)
├── signed_at, signed_by_ip
├── witness_signature, witness_name, witness_id
└── valid_until (optional expiration)

ConsentAuditLog (Immutable audit trail)
├── consent_form_id, action (CREATED, VIEWED, SIGNED, REVOKED)
├── user_id, user_role, ip_address
├── metadata (JSON: changes, notes)
└── timestamp
```

### Workflow

1. **Template Management** (Doctor)
   - Upload/create consent templates
   - Version control (auto-increment on edit)
   - Mark active/inactive
   - Preview before use

2. **Consent Generation** (Doctor during case planning)
   - Select template(s) for case
   - System creates ConsentForm with frozen content snapshot
   - Status: DRAFT → PENDING_SIGNATURE

3. **Patient Review** (Patient/Doctor)
   - Display consent content
   - Patient reviews (time tracked)
   - Questions/answers logged
   - Proceed to signature

4. **Signature Capture** (Patient)
   - Canvas-based signature pad
   - Patient name confirmation
   - Witness option (staff member)
   - IP address capture
   - Status: PENDING_SIGNATURE → SIGNED

5. **PDF Generation** (System)
   - Generate signed PDF with:
     - Consent content
     - Patient signature image
     - Witness signature (if applicable)
     - Timestamp, IP address
     - Audit trail summary
   - Store PDF URL in ConsentForm
   - Downloadable by doctor/patient

6. **Audit & Compliance**
   - All actions logged in ConsentAuditLog
   - PDFs stored securely
   - Version history maintained
   - Revocation support (status → REVOKED)

## Implementation Strategy

### Phase 1: Template Management (Doctor Portal)
- **UI**: `/doctor/consents/templates`
- **Features**:
  - List all templates (active/inactive)
  - Create new template (rich text editor)
  - Edit template (creates new version)
  - Preview template
  - Delete/deactivate templates

### Phase 2: Enhanced Signature Capture
- **Component**: `SignaturePad` (canvas-based)
- **Features**:
  - Touch/mouse support
  - Clear/redo buttons
  - Patient name confirmation
  - Witness selection (staff dropdown)
  - IP address capture (server-side)

### Phase 3: PDF Generation
- **Library**: `@react-pdf/renderer` or `puppeteer`
- **Features**:
  - Template-based PDF generation
  - Signature image embedding
  - Watermark with timestamp
  - Download button
  - Email to patient (optional)

### Phase 4: Audit Trail
- **Service**: `ConsentAuditService`
- **Features**:
  - Automatic logging on all actions
  - View audit log per consent
  - Export audit log (CSV/PDF)

## Safety & Compliance Notes

### What We Do
✅ Document all consent interactions  
✅ Store signatures with timestamps  
✅ Maintain version history  
✅ Generate PDFs for records  
✅ Track IP addresses and witnesses  
✅ Support revocation  

### What We Don't Claim
❌ Legally binding e-signatures (we use documented acknowledgment)  
❌ HIPAA compliance (we document but don't certify)  
❌ Regulatory approval (transparent about limitations)  

### Recommendations
- **Legal Disclaimer**: "This system documents patient consent acknowledgment. For legal purposes, consult your legal team."
- **Backup**: Export all consents to secure storage regularly
- **Access Control**: Only doctors can manage templates; only authorized staff can witness
- **Retention**: Follow your jurisdiction's medical record retention requirements

## Technical Stack

- **Frontend**: React Canvas API for signatures
- **Backend**: Next.js API routes
- **PDF**: `@react-pdf/renderer` or `puppeteer`
- **Storage**: Database (signatures as base64) + File storage (PDFs)
- **Audit**: Prisma with immutable audit log table

## Security Considerations

1. **Signature Storage**: Base64 in database (encrypted at rest)
2. **PDF Storage**: Secure file storage (S3/Cloudinary) with access control
3. **IP Logging**: Server-side only (not exposed to client)
4. **Access Control**: Role-based (DOCTOR, NURSE, FRONTDESK)
5. **Audit Log**: Immutable (no updates/deletes)

## Next Steps

1. ✅ Review and approve design
2. ⏳ Implement template management UI
3. ⏳ Enhance signature capture component
4. ⏳ Add PDF generation service
5. ⏳ Implement audit logging
6. ⏳ Add legal disclaimer to UI
7. ⏳ Test end-to-end workflow
