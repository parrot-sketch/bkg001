# PDF Consent Template Implementation

**Date:** January 2025  
**Status:** ✅ **IMPLEMENTED**

## Overview

The system now supports doctors uploading their existing PDF consent forms and using them as templates. This allows doctors to maintain their preferred consent documents while benefiting from digital workflow management.

## How It Works

### 1. Template Creation Options

Doctors can create consent templates in three ways:

#### Option A: Create from Scratch (HTML)
- Use the rich text editor to create HTML-based templates
- Full formatting control
- Placeholder support (`{patientName}`, `{procedureName}`, etc.)

#### Option B: Upload PDF
- Upload existing PDF consent form
- System stores PDF in Cloudinary
- PDF is used directly when generating consents
- No editing needed - use your existing form as-is

#### Option C: Both (Hybrid)
- Upload PDF + create HTML version
- System can use either format
- PDF for signing, HTML for editing

### 2. Template Format Detection

The system automatically determines the template format:
- **HTML**: Only HTML content provided
- **PDF**: Only PDF uploaded
- **HYBRID**: Both PDF and HTML provided

### 3. Consent Generation Flow

When generating a consent from a template:

1. **PDF Template**:
   - Uses uploaded PDF directly
   - Patient details can be filled in (future enhancement: PDF form field filling)
   - Patient signs on the PDF

2. **HTML Template**:
   - Uses HTML content (current flow)
   - Replaces placeholders with patient details
   - Generates consent form

3. **Hybrid Template**:
   - Prefers PDF if available
   - Falls back to HTML if PDF unavailable
   - Best of both worlds

## Database Schema

### New Fields in ConsentTemplate

```prisma
model ConsentTemplate {
  // ... existing fields
  pdf_url          String?        // Cloudinary URL for uploaded PDF
  template_format  TemplateFormat @default(HTML) // HTML, PDF, or HYBRID
  extracted_content String?       // Text extracted from PDF (for search/preview)
}
```

### New Enum

```prisma
enum TemplateFormat {
  HTML    // Editable HTML template
  PDF     // PDF-only template
  HYBRID  // Both PDF and HTML
}
```

## API Endpoints

### Upload PDF
```
POST /api/doctor/consents/templates/upload-pdf
- Accepts: multipart/form-data with PDF file
- Returns: { url, publicId, format, size }
- Max size: 10MB
- Stores in: Cloudinary folder `consent-templates/{userId}`
```

### Create Template (Updated)
```
POST /api/doctor/consents/templates
- Accepts: { title, type, content?, pdf_url?, template_format?, extracted_content? }
- Auto-detects format if not provided
- Validates: Must have either content or pdf_url
```

### Update Template (Updated)
```
PATCH /api/doctor/consents/templates/[templateId]
- Accepts: { title?, content?, pdf_url?, template_format?, is_active? }
- Auto-increments version on content/PDF changes
- Auto-detects format if not explicitly set
```

## User Interface

### Template Creation Dialog

**Three Tabs:**
1. **Create from Scratch**: HTML editor (existing)
2. **Upload PDF**: File upload with preview
3. **Both**: Upload PDF + HTML editor

**Features:**
- Drag & drop PDF upload
- PDF preview in dialog
- Format badges (HTML/PDF/Hybrid)
- Validation based on selected tab

### Template List

- Shows format badge on each template card
- PDF templates have PDF icon
- Preview opens PDF viewer for PDF templates
- Edit supports both PDF and HTML

### Preview Dialog

- **PDF templates**: Embedded PDF viewer
- **HTML templates**: Rich text preview
- **Hybrid templates**: Tabbed view (PDF + HTML)

## Workflow Example

### Scenario: Doctor has existing PDF consent form

1. **Doctor navigates to** `/doctor/consents/templates`
2. **Clicks "New Template"**
3. **Selects "Upload PDF" tab**
4. **Uploads their PDF file** (drag & drop or file picker)
5. **System uploads to Cloudinary** → Returns PDF URL
6. **Doctor enters title and selects consent type**
7. **Clicks "Create Template"**
8. **Template saved** with `template_format: PDF`

### When generating consent:

1. **Doctor creates consent** from case plan
2. **System checks template format**:
   - If PDF: Uses PDF directly
   - If HTML: Uses HTML with placeholders
   - If Hybrid: Prefers PDF, falls back to HTML
3. **Patient signs** on generated consent
4. **Signed consent stored** with signature

## Technical Details

### PDF Storage
- **Service**: Cloudinary
- **Resource Type**: `raw` (not `image`)
- **Folder**: `consent-templates/{userId}`
- **Format**: PDF preserved as-is
- **Max Size**: 10MB

### File Upload
- **Endpoint**: `/api/doctor/consents/templates/upload-pdf`
- **Method**: POST with FormData
- **Validation**: PDF type, 10MB limit
- **Security**: Doctor-only, authenticated

### Format Auto-Detection
```typescript
if (pdf_url && content) → HYBRID
else if (pdf_url) → PDF
else if (content) → HTML
```

## Future Enhancements

1. **PDF Form Field Filling**
   - Detect form fields in PDF
   - Auto-fill patient details
   - Use `pdf-lib` or similar

2. **Text Extraction**
   - Extract text from PDF for search
   - Store in `extracted_content` field
   - Enable template search

3. **PDF Editing**
   - Overlay patient details on PDF
   - Generate new PDF with filled data
   - Maintain original PDF as template

4. **PDF Preview Enhancement**
   - Better PDF viewer component
   - Zoom, download controls
   - Print preview

## Migration Required

Run the migration to add new fields:

```bash
npx prisma migrate dev --name add_pdf_support_to_consent_templates
```

Or manually:
```sql
CREATE TYPE "TemplateFormat" AS ENUM ('HTML', 'PDF', 'HYBRID');
ALTER TABLE "ConsentTemplate" 
  ADD COLUMN "pdf_url" TEXT,
  ADD COLUMN "template_format" "TemplateFormat" NOT NULL DEFAULT 'HTML',
  ADD COLUMN "extracted_content" TEXT;
CREATE INDEX "ConsentTemplate_template_format_idx" ON "ConsentTemplate"("template_format");
```

## Testing Checklist

- [ ] Upload PDF template
- [ ] Create HTML template
- [ ] Create hybrid template
- [ ] Preview PDF template
- [ ] Edit template (change PDF/HTML)
- [ ] Generate consent from PDF template
- [ ] Generate consent from HTML template
- [ ] Template format badges display correctly
- [ ] PDF preview works
- [ ] File size validation (10MB limit)
- [ ] File type validation (PDF only)
