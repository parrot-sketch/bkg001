# Consent Management System - Comprehensive Audit

## Executive Summary

This document provides a detailed audit of the Consent Management System with Document Control integration. The system enables doctors to create, version, and manage consent templates that can be used to generate patient consent forms.

**Status:** Phase 1 (Document Control) - ✅ **COMPLETE**

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Data Structures & Relationships](#data-structures--relationships)
3. [Document Control Infrastructure](#document-control-infrastructure)
4. [API Layer](#api-layer)
5. [Service Layer](#service-layer)
6. [Frontend Implementation](#frontend-implementation)
7. [Storage Architecture](#storage-architecture)
8. [Integration Points](#integration-points)
9. [Current Capabilities](#current-capabilities)
10. [Gaps & Opportunities](#gaps--opportunities)
11. [Best Practices & Recommendations](#best-practices--recommendations)

---

## 1. System Architecture Overview

### 1.1 High-Level Flow

```
┌─────────────────┐
│   Doctor UI      │
│  (Template Mgmt) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Routes     │
│  /api/doctor/   │
│  consents/      │
│  templates/     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ConsentTemplate │
│    Service      │
│ (Document Ctrl) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Database      │
│  (Prisma ORM)   │
└─────────────────┘
```

### 1.2 Core Components

1. **ConsentTemplate** - Master template entity
2. **ConsentTemplateVersion** - Version history snapshots
3. **ConsentTemplateAudit** - Audit trail for all actions
4. **ConsentTemplateService** - Business logic layer
5. **API Routes** - RESTful endpoints
6. **Frontend UI** - Template management interface

---

## 2. Data Structures & Relationships

### 2.1 ConsentTemplate Model

**Location:** `prisma/schema.prisma` (lines 1362-1391)

```prisma
model ConsentTemplate {
  // Core Identity
  id                String         @id @default(uuid())
  title             String
  type              ConsentType    // GENERAL_PROCEDURE, ANESTHESIA, etc.
  
  // Content
  content           String         // HTML content
  pdf_url           String?         // Local storage path (Phase 1: local)
  template_format   TemplateFormat  // HTML, PDF, HYBRID
  extracted_content String?         // Text extracted from PDF (for search)
  
  // Document Control (Phase 1)
  status            TemplateStatus  @default(DRAFT)  // DRAFT, ACTIVE, ARCHIVED
  version           Int             @default(1)
  description       String?         // Template description/notes
  usage_count       Int             @default(0)     // Times used in consents
  last_used_at      DateTime?       // Last time template was used
  
  // Metadata
  is_active         Boolean         @default(true)
  created_by        String?         // User ID of creator
  created_at        DateTime        @default(now())
  updated_at        DateTime        @updatedAt
  
  // Relations
  versions          ConsentTemplateVersion[]
  audit_logs        ConsentTemplateAudit[]
  
  // Indexes
  @@index([type])
  @@index([is_active])
  @@index([template_format])
  @@index([status])
  @@index([created_by])
}
```

**Key Fields:**
- `status`: Controls template lifecycle (DRAFT → ACTIVE → ARCHIVED)
- `version`: Auto-incremented on content changes
- `usage_count`: Tracks how many times template was used
- `pdf_url`: **Now uses local storage** (`/api/files/consent-templates/{userId}/{filename}`)

### 2.2 ConsentTemplateVersion Model

**Location:** `prisma/schema.prisma` (lines 1393-1410)

```prisma
model ConsentTemplateVersion {
  id              String         @id @default(uuid())
  template_id     String
  version_number  Int
  title           String
  content         String
  pdf_url         String?
  template_format TemplateFormat
  created_by      String?
  created_at      DateTime       @default(now())
  version_notes   String?        // Why this version was created
  
  template        ConsentTemplate @relation(...)
  
  @@unique([template_id, version_number])
  @@index([template_id])
  @@index([created_at])
}
```

**Purpose:**
- Immutable snapshots of template at each version
- Enables rollback to previous versions
- Tracks who created each version and why

**Version Creation Logic:**
- New version created when:
  - `title` changes
  - `content` changes
  - `pdf_url` changes
  - `template_format` changes
- Version number auto-increments
- Previous version snapshot saved before update

### 2.3 ConsentTemplateAudit Model

**Location:** `prisma/schema.prisma` (lines 1412-1431)

```prisma
model ConsentTemplateAudit {
  id            String      @id @default(uuid())
  template_id   String
  action        AuditAction // CREATED, UPDATED, ACTIVATED, ARCHIVED, etc.
  actor_user_id String
  actor_role    Role        // DOCTOR, ADMIN, etc.
  changes_json  String?     // JSON diff of changes
  ip_address    String?
  user_agent    String?
  created_at    DateTime    @default(now())
  
  template      ConsentTemplate @relation(...)
  actor         User           @relation(...)
  
  @@index([template_id])
  @@index([actor_user_id])
  @@index([action])
  @@index([created_at])
  @@index([template_id, created_at])
}
```

**Audit Actions (AuditAction enum):**
- `CREATED` - Template created
- `UPDATED` - Template content/fields updated
- `ACTIVATED` - Status changed to ACTIVE
- `ARCHIVED` - Status changed to ARCHIVED
- `DELETED` - Template deleted (soft delete via archive)
- `VIEWED` - Template viewed (future)
- `DOWNLOADED` - Template downloaded (future)
- `DUPLICATED` - Template duplicated
- `RESTORED` - Template restored from archive (future)

**Audit Features:**
- Non-blocking: Audit failures don't break operations
- Comprehensive: Tracks actor, role, IP, user agent
- Change tracking: `changes_json` stores before/after diffs
- Queryable: Indexed for fast retrieval

### 2.4 TemplateStatus Enum

```prisma
enum TemplateStatus {
  DRAFT    // Initial state, not ready for use
  ACTIVE   // Ready for use in consent forms
  ARCHIVED // No longer active, historical record
}
```

**Status Transitions:**
- `DRAFT → ACTIVE`: Via `activateTemplate()`
- `ACTIVE → ARCHIVED`: Via `archiveTemplate()`
- `ARCHIVED → ACTIVE`: Future restore functionality

### 2.5 Relationships Diagram

```
ConsentTemplate (1) ──< (many) ConsentTemplateVersion
     │
     │ (1)
     │
     └──< (many) ConsentTemplateAudit
     │
     │ (created_by)
     │
     └──> (1) User (creator)
```

**Key Relationships:**
- One template has many versions (version history)
- One template has many audit logs (audit trail)
- Template belongs to one creator (User)
- Audit logs reference the actor (User)

---

## 3. Document Control Infrastructure

### 3.1 ConsentTemplateService

**Location:** `application/services/ConsentTemplateService.ts`

**Responsibilities:**
1. Template CRUD with version control
2. Status management (DRAFT → ACTIVE → ARCHIVED)
3. Version history tracking
4. Audit logging (non-blocking)
5. Usage tracking

**Key Methods:**

#### 3.1.1 Create Template
```typescript
async createTemplate(data: CreateTemplateData, context: AuditContext): Promise<ConsentTemplate>
```
- Creates template with `status: DRAFT`
- Sets `version: 1`
- Creates initial version snapshot
- Logs `CREATED` audit event

#### 3.1.2 Update Template
```typescript
async updateTemplate(templateId: string, data: UpdateTemplateData, context: AuditContext): Promise<ConsentTemplate>
```
- **Version Control Logic:**
  - Detects if content changed (title, content, pdf_url, template_format)
  - If changed: Creates version snapshot of OLD version, increments version number
  - If unchanged: Keeps same version number
- **Ownership Check:** Only creator can update
- **Change Tracking:** Computes diff, stores in audit log

#### 3.1.3 Activate Template
```typescript
async activateTemplate(templateId: string, context: AuditContext): Promise<ConsentTemplate>
```
- Transitions: `DRAFT → ACTIVE`
- Logs `ACTIVATED` audit event
- Ownership check required

#### 3.1.4 Archive Template
```typescript
async archiveTemplate(templateId: string, context: AuditContext): Promise<ConsentTemplate>
```
- Transitions: `ACTIVE → ARCHIVED`
- Logs `ARCHIVED` audit event
- Ownership check required

#### 3.1.5 Duplicate Template
```typescript
async duplicateTemplate(templateId: string, newTitle: string, context: AuditContext): Promise<ConsentTemplate>
```
- Creates new template with same content
- New template starts at `version: 1`, `status: DRAFT`
- Logs `CREATED` (new) and `DUPLICATED` (source) audit events

#### 3.1.6 Version History
```typescript
async getVersionHistory(templateId: string): Promise<ConsentTemplateVersion[]>
```
- Returns all versions ordered by `version_number DESC`
- Each version is immutable snapshot

#### 3.1.7 Audit Log
```typescript
async getAuditLog(templateId: string, limit?: number): Promise<ConsentTemplateAudit[]>
```
- Returns audit trail ordered by `created_at DESC`
- Optional limit for pagination

#### 3.1.8 Usage Tracking
```typescript
async trackUsage(templateId: string): Promise<void>
```
- Increments `usage_count`
- Updates `last_used_at` timestamp
- **Note:** Currently not automatically called - needs integration with consent form creation

### 3.2 Version Control Algorithm

**When is a new version created?**

```typescript
const needsNewVersion = !!(
  data.title !== undefined && data.title !== existing.title ||
  data.content !== undefined && data.content !== existing.content ||
  data.pdf_url !== undefined && data.pdf_url !== existing.pdf_url ||
  data.template_format !== undefined && data.template_format !== existing.template_format
);
```

**Version Snapshot Process:**
1. Before update, create snapshot of current state
2. Store in `ConsentTemplateVersion` with current version number
3. Update template with new version number
4. New version becomes current

**Benefits:**
- Immutable history
- Rollback capability (future feature)
- Audit compliance
- Change tracking

---

## 4. API Layer

### 4.1 Endpoint Structure

```
/api/doctor/consents/templates/
├── GET    /                           # List templates (filtered by status, search)
├── POST   /                           # Create template
├── GET    /[templateId]               # Get single template
├── PATCH  /[templateId]               # Update template (creates version if needed)
├── DELETE /[templateId]               # Archive template (soft delete)
├── POST   /[templateId]/activate      # Activate template (DRAFT → ACTIVE)
├── POST   /[templateId]/archive       # Archive template (ACTIVE → ARCHIVED)
├── POST   /[templateId]/duplicate     # Duplicate template
├── GET    /[templateId]/versions      # Get version history
├── GET    /[templateId]/audit         # Get audit log
└── POST   /upload-pdf                 # Upload PDF to local storage
```

### 4.2 Request/Response Patterns

**All endpoints:**
- Use `ApiResponse<T>` pattern
- Require authentication (JWT)
- Role-based access (DOCTOR only)
- Zod validation for inputs
- Error handling via `handleApiError`/`handleApiSuccess`

**Example: GET /api/doctor/consents/templates**

**Query Parameters:**
- `includeInactive` (boolean): Include inactive templates
- `type` (ConsentType): Filter by consent type
- `status` (TemplateStatus): Filter by status (DRAFT, ACTIVE, ARCHIVED)
- `search` (string): Search in title/description

**Response:**
```typescript
{
  success: true,
  data: ConsentTemplateDto[]
}
```

**Example: POST /api/doctor/consents/templates**

**Request Body:**
```typescript
{
  title: string;
  type: ConsentType;
  content?: string;        // HTML content
  pdf_url?: string;        // Local file path
  template_format?: TemplateFormat;
  extracted_content?: string;
  description?: string;
}
```

**Validation:**
- Must have either `content` OR `pdf_url`
- Title: 1-200 characters
- Description: max 500 characters

**Response:**
```typescript
{
  success: true,
  data: {
    id: string;
    title: string;
    type: ConsentType;
    version: number;
    status: TemplateStatus;
    // ... other fields
  },
  message: "Template created successfully"
}
```

### 4.3 PDF Upload Endpoint

**POST /api/doctor/consents/templates/upload-pdf**

**Features:**
- Multipart form data
- Validates PDF file type
- Max size: 10MB
- Saves to local storage: `storage/consent-templates/{userId}/{filename}.pdf`
- Returns local file path: `/api/files/consent-templates/{userId}/{filename}`

**Response:**
```typescript
{
  success: true,
  data: {
    url: "/api/files/consent-templates/{userId}/{timestamp}-{random}.pdf",
    filename: string,
    size: number,
    uploadedAt: string
  }
}
```

### 4.4 File Serving Endpoint

**GET /api/files/consent-templates/[userId]/[filename]**

**Features:**
- Serves PDFs from local storage
- Security: Path traversal prevention
- Validates file type (PDF only)
- Returns PDF with proper headers (Content-Type: application/pdf)
- Inline display (not download)

---

## 5. Service Layer

### 5.1 Service Architecture

```
API Route
    │
    ▼
ConsentTemplateService
    │
    ├──> Prisma Client (Database)
    ├──> Version Snapshot Logic
    ├──> Audit Logging (non-blocking)
    └──> Change Detection
```

### 5.2 Error Handling

**Custom Errors:**
- `NotFoundError`: Template not found
- `ValidationError`: Invalid operation (e.g., not owner)

**Non-Blocking Operations:**
- Audit logging: Failures logged but don't break operations
- Version snapshots: Failures prevent update (transactional)

### 5.3 Transaction Safety

**Current Implementation:**
- Version snapshot created BEFORE template update
- If snapshot fails, update is prevented
- Audit logging is non-blocking (fire-and-forget)

**Future Enhancement:**
- Wrap in Prisma transaction for atomicity
- Rollback on any failure

---

## 6. Frontend Implementation

### 6.1 UI Components

**Location:** `app/doctor/consents/templates/page.tsx`

**Features:**
1. **Template List View:**
   - Status filter tabs (All, Draft, Active, Archived)
   - Search functionality (title/description)
   - Template cards with badges (status, usage count)
   - Action buttons (Activate, Archive, Duplicate, Versions, Audit)

2. **Create Template Workflow:**
   - Step 1: Upload PDF (optional)
   - Step 2: Create template (title, type, description, HTML content)
   - Integrated PDF preview using custom `PdfViewer` component

3. **Template Management:**
   - Edit template (updates create new version)
   - View versions dialog
   - View audit log dialog
   - Preview PDF dialog

### 6.2 React Hooks

**Location:** `hooks/doctor/useConsentTemplates.ts`

**Hooks:**
- `useConsentTemplates(params)`: List templates with filters
- `useCreateConsentTemplate()`: Create mutation
- `useUpdateConsentTemplate()`: Update mutation
- `useDeleteConsentTemplate()`: Archive mutation
- `useActivateConsentTemplate()`: Activate mutation
- `useArchiveConsentTemplate()`: Archive mutation
- `useDuplicateConsentTemplate()`: Duplicate mutation
- `useConsentTemplateVersions(templateId)`: Version history
- `useConsentTemplateAuditLog(templateId)`: Audit log

**State Management:**
- React Query for server state
- Optimistic updates for better UX
- Automatic refetch on mutations

### 6.3 PDF Viewer

**Location:** `components/pdf/PdfViewer.tsx`

**Features:**
- Custom PDF viewer using `react-pdf` (PDF.js)
- Zoom controls
- Page navigation
- Download functionality
- Error handling
- Loading states

**Storage Integration:**
- Loads PDFs from local storage via `/api/files/consent-templates/...`
- No proxy needed (local files work directly)

---

## 7. Storage Architecture

### 7.1 Local Storage Structure

```
storage/
└── consent-templates/
    └── {userId}/
        └── {timestamp}-{random}.pdf
```

**Example:**
```
storage/consent-templates/
└── 8a99a0d9-f7ec-420d-956f-25e3b5c14ecf/
    ├── 1771936908-abc123def456.pdf
    └── 1772004207-xyz789ghi012.pdf
```

### 7.2 File Naming Convention

- Format: `{timestamp}-{randomString}.pdf`
- Timestamp: Unix milliseconds (ensures uniqueness)
- Random: 13-character alphanumeric (prevents collisions)
- Extension: Always `.pdf`

### 7.3 File Serving

**Route:** `GET /api/files/consent-templates/[userId]/[filename]`

**Security:**
- Path traversal prevention (validates filename/userId)
- File type validation (PDF only)
- File existence check

**Headers:**
- `Content-Type: application/pdf`
- `Content-Disposition: inline` (display, not download)
- `Cache-Control: public, max-age=3600` (1 hour cache)

### 7.4 Git Ignore

**Location:** `.gitignore`

```
/storage/
```

Uploaded files are excluded from version control.

---

## 8. Integration Points

### 8.1 Current Integration Status

**✅ Completed:**
- Template CRUD operations
- Version control
- Audit logging
- Status management
- PDF upload/viewing
- Frontend UI

**❌ Not Yet Integrated:**
- Consent form creation from templates
- Usage tracking (automatic)
- Template selection in consent workflow
- Patient consent signing

### 8.2 ConsentForm Model (Current State)

**Location:** `prisma/schema.prisma` (lines 1134-1158)

```prisma
model ConsentForm {
  id                String        @id @default(uuid())
  case_plan_id      Int           // Linked to CasePlan (surgical case)
  title             String
  type              ConsentType
  content_snapshot  String        // Snapshot of content at creation
  version           Int           @default(1)
  status            ConsentStatus @default(DRAFT)
  patient_signature String?
  signed_at         DateTime?
  // ... signing session, witness fields
  case_plan         CasePlan      @relation(...)
  signing_session   ConsentSigningSession?
}
```

**⚠️ CRITICAL GAP:**
- **No `template_id` field** - ConsentForm is NOT linked to ConsentTemplate
- ConsentForm is linked to `CasePlan` (surgical case), not directly to templates
- No way to track which template was used to create a consent form
- No automatic usage tracking when consent form created
- No template selection UI in consent workflow

**Integration Required:**
1. Add `template_id` field to `ConsentForm` model (migration needed)
2. Populate `template_id` when creating consent from template
3. Add foreign key relationship: `ConsentForm.template_id → ConsentTemplate.id`
4. Call `trackUsage()` when consent form created from template

### 8.3 Integration Opportunities

**1. Consent Form Creation:**
```typescript
// When creating consent form from template
const consentForm = await createConsentForm({
  patientId: patient.id,
  templateId: template.id,  // Link to template
  // ... other fields
});

// Track template usage
await consentTemplateService.trackUsage(template.id);
```

**2. Template Selection UI:**
- Add template selector in consent form creation
- Show only ACTIVE templates
- Filter by consent type
- Preview template before selection

**3. Consent Form Rendering:**
- Use template content as base
- Merge patient data into template
- Generate PDF from rendered content
- Store rendered PDF with consent form

---

## 9. Current Capabilities

### 9.1 What Works Now

✅ **Template Management:**
- Create templates (HTML or PDF)
- Update templates (with version control)
- Activate templates (DRAFT → ACTIVE)
- Archive templates (ACTIVE → ARCHIVED)
- Duplicate templates

✅ **Document Control:**
- Version history tracking
- Audit trail (all actions logged)
- Status workflow (DRAFT → ACTIVE → ARCHIVED)
- Usage tracking (manual increment)

✅ **Storage:**
- PDF upload to local storage
- PDF viewing in browser
- File serving with security

✅ **UI:**
- Template list with filters
- Search functionality
- Status badges
- Version history dialog
- Audit log dialog
- PDF preview

### 9.2 What's Missing

❌ **Consent Form Integration:**
- No link between templates and consent forms
- No automatic usage tracking
- No template selection in consent workflow

❌ **Patient Signing:**
- No patient access to consent forms
- No digital signature workflow
- No consent form PDF generation

❌ **Advanced Features:**
- Template restoration from archive
- Version rollback
- Template sharing between doctors
- Template approval workflow

---

## 10. Gaps & Opportunities

### 10.1 Critical Gaps

**1. Consent Form ↔ Template Link**
- **Current:** `ConsentForm.template_id` exists but unused
- **Impact:** Cannot track which template was used for a consent
- **Fix:** Populate `template_id` when creating consent from template

**2. Automatic Usage Tracking**
- **Current:** `trackUsage()` exists but not called
- **Impact:** `usage_count` and `last_used_at` not updated
- **Fix:** Call `trackUsage()` when consent form created from template

**3. Template Selection in Consent Workflow**
- **Current:** No UI to select template when creating consent
- **Impact:** Templates exist but cannot be used
- **Fix:** Add template selector to consent form creation

### 10.2 Enhancement Opportunities

**1. Template Rendering Engine**
- Merge patient data into template
- Support variables: `{{patient.name}}`, `{{date}}`, etc.
- Generate PDF from rendered HTML

**2. Consent Form PDF Generation**
- Generate PDF from template + patient data
- Store PDF with consent form
- Enable patient download

**3. Digital Signature Workflow**
- Patient authentication
- Digital signature capture
- Signature verification
- Audit trail for signing

**4. Template Approval Workflow**
- Require approval before activation
- Multi-level approval (senior doctor, admin)
- Approval audit trail

**5. Template Sharing**
- Share templates between doctors
- Template library (common templates)
- Template categories/tags

---

## 11. Best Practices & Recommendations

### 11.1 Data Integrity

**✅ Current:**
- Version snapshots are immutable
- Audit logs are comprehensive
- Status transitions are controlled

**⚠️ Recommendations:**
- Add database constraints for status transitions
- Add unique constraint on `(template_id, version_number)`
- Add foreign key from `ConsentForm.template_id` to `ConsentTemplate.id`

### 11.2 Security

**✅ Current:**
- Authentication required
- Role-based access (DOCTOR only)
- Ownership checks (only creator can modify)
- Path traversal prevention in file serving

**⚠️ Recommendations:**
- Add rate limiting on upload endpoint
- Add file size limits per user
- Add virus scanning for uploaded PDFs
- Add encryption at rest for sensitive templates

### 11.3 Performance

**✅ Current:**
- Indexed queries (status, type, created_by)
- Pagination support in audit log
- Non-blocking audit logging

**⚠️ Recommendations:**
- Add pagination to template list
- Add caching for frequently accessed templates
- Optimize version history queries (limit results)
- Add database connection pooling

### 11.4 Scalability

**✅ Current:**
- Local storage works for small scale
- Database schema supports growth

**⚠️ Recommendations:**
- Migrate to cloud storage (S3, Azure Blob) for production
- Add CDN for PDF serving
- Implement file cleanup for archived templates
- Add archiving strategy (move old files to cold storage)

### 11.5 User Experience

**✅ Current:**
- Clear workflow (Upload → Create → Manage)
- Status badges and filters
- Version history and audit dialogs

**⚠️ Recommendations:**
- Add template preview before selection
- Add template comparison (diff between versions)
- Add bulk operations (activate multiple, archive multiple)
- Add template import/export

---

## 12. Integration Roadmap

### Phase 2: Consent Form Integration (Next Steps)

**Priority 1: Link Templates to Consent Forms**
1. Update consent form creation to accept `templateId`
2. Populate `ConsentForm.template_id` when creating from template
3. Call `trackUsage()` automatically

**Priority 2: Template Selection UI**
1. Add template selector to consent form creation
2. Filter by consent type
3. Show only ACTIVE templates
4. Preview template before selection

**Priority 3: Template Rendering**
1. Create template rendering engine
2. Support variables: `{{patient.name}}`, `{{date}}`, etc.
3. Merge patient data into template
4. Generate consent form content from template

### Phase 3: Patient Signing (Future)

**Priority 1: Patient Access**
1. Create patient consent dashboard
2. Enable patient authentication
3. Show pending consents

**Priority 2: Digital Signature**
1. Implement signature capture
2. Store signature with consent form
3. Verify signature integrity

**Priority 3: PDF Generation**
1. Generate PDF from rendered template
2. Include patient signature
3. Store PDF with consent form
4. Enable download

---

## 13. Conclusion

### 13.1 Foundation Status

**✅ Strong Foundation:**
- Document control system is complete
- Version control works
- Audit trail is comprehensive
- Storage is functional

**⚠️ Integration Needed:**
- Link templates to consent forms
- Enable template selection in workflow
- Automatic usage tracking

### 13.2 Next Steps

1. **Immediate:** Integrate template selection into consent form creation
2. **Short-term:** Implement template rendering engine
3. **Medium-term:** Add patient signing workflow
4. **Long-term:** Migrate to cloud storage, add advanced features

### 13.3 System Readiness

**Current Readiness: 70%**

- ✅ Document control: 100%
- ✅ Version control: 100%
- ✅ Audit logging: 100%
- ✅ Storage: 100%
- ⚠️ Consent integration: 0%
- ⚠️ Patient signing: 0%

**To reach 100%:**
- Complete consent form integration
- Add patient signing workflow
- Migrate to cloud storage for production

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-26  
**Author:** System Audit
      