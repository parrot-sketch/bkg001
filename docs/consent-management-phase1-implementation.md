# Phase 1: Document Control System - Implementation Plan

## Overview

Build a professional document control system for consent templates that enables doctors to:
- Manage templates with proper versioning
- Track usage and access
- Maintain audit trails
- Organize templates effectively

## Database Schema Enhancements

### 1. Add Template Status & Metadata

```prisma
model ConsentTemplate {
  id                String         @id @default(uuid())
  title             String
  type              ConsentType
  content           String
  pdf_url           String?
  template_format   TemplateFormat @default(HTML)
  extracted_content String?
  version           Int            @default(1)
  is_active         Boolean        @default(true)
  created_by        String?
  created_at        DateTime       @default(now())
  updated_at        DateTime       @updatedAt
  
  // NEW: Document Control Fields
  status            TemplateStatus @default(DRAFT) // DRAFT, ACTIVE, ARCHIVED
  description       String?        // Template description/notes
  usage_count       Int            @default(0) // Times used in consents
  last_used_at      DateTime?      // Last time used
  
  // Relations
  audit_logs        ConsentTemplateAudit[]
  versions          ConsentTemplateVersion[] // Version history
  
  @@index([type])
  @@index([is_active])
  @@index([template_format])
  @@index([status])
  @@index([created_by])
}

enum TemplateStatus {
  DRAFT      // Being created/edited
  ACTIVE     // Available for use
  ARCHIVED   // No longer used but kept for reference
}

model ConsentTemplateVersion {
  id                String   @id @default(uuid())
  template_id       String
  version_number    Int
  title             String
  content           String
  pdf_url           String?
  template_format   TemplateFormat
  created_by        String?
  created_at        DateTime @default(now())
  version_notes     String?  // Why this version was created
  
  template          ConsentTemplate @relation(fields: [template_id], references: [id], onDelete: Cascade)
  
  @@unique([template_id, version_number])
  @@index([template_id])
}

model ConsentTemplateAudit {
  id                String   @id @default(uuid())
  template_id       String
  action            AuditAction // CREATED, UPDATED, ACTIVATED, ARCHIVED, DELETED, VIEWED, DOWNLOADED
  actor_user_id    String
  actor_role        Role
  changes_json      String?  // JSON diff of changes
  ip_address        String?
  user_agent        String?
  created_at        DateTime @default(now())
  
  template          ConsentTemplate @relation(fields: [template_id], references: [id], onDelete: Cascade)
  actor             User            @relation(fields: [actor_user_id], references: [id])
  
  @@index([template_id])
  @@index([actor_user_id])
  @@index([action])
  @@index([created_at])
}

enum AuditAction {
  CREATED
  UPDATED
  ACTIVATED
  ARCHIVED
  DELETED
  VIEWED
  DOWNLOADED
  DUPLICATED
}
```

## API Enhancements

### 1. Template Management Endpoints

**GET `/api/doctor/consents/templates`**
- Enhanced with filters: `status`, `type`, `search`
- Include usage stats
- Include version count

**GET `/api/doctor/consents/templates/:id`**
- Include version history
- Include audit log
- Include usage statistics

**POST `/api/doctor/consents/templates`**
- Create with status (defaults to DRAFT)
- Auto-create version 1
- Log audit event

**PATCH `/api/doctor/consents/templates/:id`**
- Update template
- Auto-increment version
- Create version snapshot
- Log audit event

**POST `/api/doctor/consents/templates/:id/activate`**
- Change status to ACTIVE
- Log audit event

**POST `/api/doctor/consents/templates/:id/archive`**
- Change status to ARCHIVED
- Log audit event

**POST `/api/doctor/consents/templates/:id/duplicate`**
- Duplicate template (new ID, version 1)
- Log audit event

**GET `/api/doctor/consents/templates/:id/versions`**
- Get all versions
- Include version metadata

**GET `/api/doctor/consents/templates/:id/audit`**
- Get audit log
- Filter by action, date range

**GET `/api/doctor/consents/templates/:id/stats`**
- Usage count
- Last used date
- Version count
- Recent activity

## UI Enhancements

### 1. Template List Page (`/doctor/consents/templates`)

**New Features**:
- **Status Filter**: Active, Draft, Archived tabs
- **Search**: Search by title, description
- **Type Filter**: Filter by consent type
- **Sort Options**: Recently updated, Most used, Alphabetical
- **Bulk Actions**: Archive multiple, Delete multiple
- **Quick Stats**: Total templates, Active count, Usage this month

**Template Card Enhancements**:
- Status badge (Draft/Active/Archived)
- Usage count badge
- Last used date
- Version number
- Quick actions menu (Activate, Archive, Duplicate, Delete)

### 2. Template Detail View

**New Sections**:
- **Overview Tab**: Basic info, description, status
- **Versions Tab**: Version history with comparison
- **Audit Log Tab**: Complete audit trail
- **Usage Stats Tab**: Usage analytics, last used, linked consents

**Actions**:
- Edit template (creates new version)
- Activate/Archive
- Duplicate
- Download PDF
- View version history
- Restore previous version

### 3. Version History View

**Features**:
- List all versions
- Compare versions (side-by-side)
- View version notes
- Restore version (creates new version from old)
- Download specific version

### 4. Audit Log View

**Features**:
- Filter by action type
- Filter by date range
- Filter by actor
- Export audit log
- View change details (diff)

## Implementation Steps

### Step 1: Database Migration
1. Add `status`, `description`, `usage_count`, `last_used_at` to `ConsentTemplate`
2. Create `ConsentTemplateVersion` model
3. Create `ConsentTemplateAudit` model
4. Create enums: `TemplateStatus`, `AuditAction`
5. Run migration

### Step 2: Backend Services
1. Create `ConsentTemplateService` with document control methods
2. Implement version management logic
3. Implement audit logging (non-blocking)
4. Update existing endpoints
5. Add new endpoints (activate, archive, duplicate, versions, audit)

### Step 3: API Routes
1. Update existing routes
2. Add new routes for document control
3. Add validation (Zod schemas)
4. Add authorization checks
5. Add contract tests

### Step 4: Frontend Components
1. Enhance template list page
2. Add template detail view
3. Add version history component
4. Add audit log component
5. Add status management UI
6. Add bulk operations UI

### Step 5: Testing
1. Unit tests for services
2. Integration tests for API routes
3. E2E tests for workflows
4. Test version restoration
5. Test audit logging

## Key Design Decisions

### 1. Version Management
- **Auto-versioning**: Every edit creates new version
- **Immutable versions**: Versions can't be edited, only restored
- **Version notes**: Optional notes explaining why version was created

### 2. Status Workflow
```
DRAFT → ACTIVE → ARCHIVED
  ↓       ↓         ↓
  └───────┴─────────┘
    (can reactivate)
```

### 3. Audit Logging
- **Non-blocking**: Audit failures don't break operations
- **Comprehensive**: Log all actions (view, download, etc.)
- **Detailed**: Store change diffs for updates

### 4. Usage Tracking
- **Increment on use**: When template used in consent
- **Track last used**: Update timestamp
- **Analytics**: Usage trends, popular templates

## Success Metrics

### Phase 1 Complete When:
- ✅ Doctors can manage templates with version control
- ✅ All template operations are audited
- ✅ Version history is accessible
- ✅ Templates can be organized by status
- ✅ Usage statistics are visible
- ✅ PDF preview works correctly

### Quality Gates:
- All API routes have contract tests
- Audit logging is comprehensive
- Version restoration works correctly
- UI is intuitive and responsive
- No data loss during versioning

## Future Phases (Out of Scope for Phase 1)

### Phase 2: Patient Authentication
- Patient user accounts
- Patient dashboard
- Secure document access

### Phase 3: Consent Signing Workflow
- Consent assignment
- Patient signing interface
- Signed document storage
- Multi-party signing

## Notes

- **Keep it simple**: Focus on document control, not complex digitization
- **Incremental**: Each feature delivers standalone value
- **Auditable**: Everything is logged for compliance
- **Scalable**: Foundation supports future enhancements
