# Consent Phase 2 - Implementation Progress

## ✅ Completed

### 1. PDF Viewer Fix
- Fixed react-pdf options warning with `useMemo`
- Stable `documentOptions` object
- Stable `fileUrl` memoization
- **File:** `components/pdf/PdfViewer.tsx`

### 2. Database Schema (Phase 2)
- ✅ Added `ApprovalStatus` enum (DRAFT, PENDING_APPROVAL, APPROVED, REJECTED)
- ✅ Added approval fields to `ConsentTemplate`:
  - `approval_status`, `approved_by_user_id`, `approved_at`
  - `checksum_sha256`, `latest_pdf_filename`, `locked_version_number`
- ✅ Created `ConsentTemplateRelease` model
- ✅ Created `ConsentFormDocument` model
- ✅ Added `template_id` to `ConsentForm`
- ✅ Updated `AuditAction` enum (SUBMITTED_FOR_APPROVAL, APPROVED, REJECTED, PDF_REPLACED)
- **File:** `prisma/schema.prisma`
- **Next:** Create migration file

### 3. Service Layer (Phase 2)
- ✅ Added `submitForApproval()` method
- ✅ Added `approveTemplate()` method (ADMIN only)
- ✅ Added `rejectTemplate()` method (ADMIN only)
- ✅ Added `replacePdf()` method (with checksum computation)
- ✅ Added `computeChecksum()` helper
- **File:** `application/services/ConsentTemplateService.ts`

## 🔄 In Progress

### 4. API Routes
- Need to create:
  - `POST /api/doctor/consents/templates/[templateId]/submit-for-approval`
  - `POST /api/admin/consents/templates/[templateId]/approve`
  - `POST /api/admin/consents/templates/[templateId]/reject`
  - `PUT /api/doctor/consents/templates/[templateId]/replace-pdf`

### 5. Security Hardening
- File upload: checksum, rate limiting, sanitization
- File access: JWT required, authorization checks
- Integrity verification endpoint

### 6. Frontend Refactor
- Feature module structure
- Split workspace layout
- Approval workflow UI

## ⏳ Pending

### 7. ConsentFormDocumentService
- Create service for signed consent uploads
- Upload, list, delete methods

### 8. Tests
- Unit tests (parsers, mappers, service)
- Contract tests (approval endpoints, file access)

### 9. Documentation
- Update audit doc with Phase 2 changes

---

## Next Steps

1. **Create Migration File** - Generate Prisma migration for schema changes
2. **API Routes** - Implement approval workflow endpoints
3. **Security** - Add file upload/access hardening
4. **Frontend** - Refactor into feature modules
5. **Tests** - Add comprehensive test coverage

---

## Files Modified

- `components/pdf/PdfViewer.tsx` - Fixed options warning
- `prisma/schema.prisma` - Added Phase 2 models/fields
- `application/services/ConsentTemplateService.ts` - Added approval methods

## Files to Create

- Migration file (after schema is finalized)
- API route files for approval workflow
- `ConsentFormDocumentService.ts`
- Frontend feature module structure
- Test files
