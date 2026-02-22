# PDF Consent Template Solution

**Date:** January 2025  
**Status:** Design Document

## Problem Statement

Doctors have existing physical PDF consent forms that they prefer to use. We need to support:
1. Uploading existing PDF consent forms
2. Using PDFs as templates (with or without text extraction)
3. Generating consents from PDF templates with patient details filled in
4. Maintaining both PDF and HTML template options

## Solution Architecture

### Database Schema Enhancement

Add to `ConsentTemplate` model:
```prisma
model ConsentTemplate {
  // ... existing fields
  pdf_url              String?    // Cloudinary URL for uploaded PDF
  template_format      TemplateFormat @default(HTML)  // HTML, PDF, or HYBRID
  extracted_content    String?    // Text extracted from PDF (optional, for search/preview)
}
```

New enum:
```prisma
enum TemplateFormat {
  HTML    // Editable HTML template (current)
  PDF     // PDF-only template (use uploaded PDF as-is)
  HYBRID  // Both PDF and HTML (PDF for signing, HTML for editing)
}
```

### Workflow Options

#### Option 1: PDF-Only Template (Simplest)
- Doctor uploads PDF
- System stores PDF in Cloudinary
- When generating consent:
  - Use PDF directly
  - Fill in patient details (if PDF has form fields) OR
  - Generate new PDF with patient details overlaid
  - Patient signs on the PDF

#### Option 2: PDF + Text Extraction (Recommended)
- Doctor uploads PDF
- System extracts text from PDF (optional, for search/preview)
- Stores both PDF and extracted text
- When generating consent:
  - Use PDF as base
  - Fill in patient details
  - Patient signs on PDF

#### Option 3: Hybrid (Most Flexible)
- Doctor uploads PDF
- System extracts text and converts to editable HTML (optional)
- Doctor can edit HTML version
- When generating consent:
  - Use PDF if available, otherwise use HTML
  - Fill in patient details
  - Patient signs

## Recommended Approach: Option 2 (PDF + Text Extraction)

### Why Option 2?
- ✅ Respects doctors' existing PDFs
- ✅ Simple workflow (upload → use)
- ✅ Text extraction enables search/preview
- ✅ No need for complex PDF editing
- ✅ Can fill patient details programmatically

### Implementation Plan

1. **Schema Migration**
   - Add `pdf_url`, `template_format`, `extracted_content` to ConsentTemplate
   - Add `TemplateFormat` enum

2. **PDF Upload Endpoint**
   - Extend `/api/upload` to support PDFs
   - Upload to Cloudinary with `resource_type: 'raw'`
   - Return PDF URL

3. **Template Creation UI**
   - Add "Upload PDF" option in template creation dialog
   - Show preview of uploaded PDF
   - Optional: Extract text for search/preview
   - Store PDF URL in template

4. **Consent Generation**
   - Check template format:
     - If PDF: Use PDF template
     - If HTML: Use HTML template (current)
     - If HYBRID: Prefer PDF, fallback to HTML
   - Fill in patient details (PDF form fields or overlay)
   - Generate consent form

5. **PDF Text Extraction** (Optional Enhancement)
   - Use `pdf-parse` or similar library
   - Extract text for search/preview
   - Store in `extracted_content` field

## Technical Details

### PDF Upload
```typescript
// Extend /api/upload to support PDFs
const validTypes = [
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf'  // Add PDF support
];

// Upload PDF to Cloudinary
cloudinary.uploader.upload_stream(
  {
    folder: 'consent-templates',
    resource_type: 'raw',  // PDFs are 'raw', not 'image'
    format: 'pdf',
  },
  callback
).end(buffer);
```

### Template Format Detection
```typescript
enum TemplateFormat {
  HTML = 'HTML',    // content field has HTML
  PDF = 'PDF',      // pdf_url has PDF, content may be empty
  HYBRID = 'HYBRID' // Both pdf_url and content exist
}
```

### Consent Generation Logic
```typescript
if (template.template_format === 'PDF' && template.pdf_url) {
  // Use PDF template
  // Option 1: Use PDF as-is (if it has form fields)
  // Option 2: Overlay patient details on PDF
  // Option 3: Convert to HTML, fill, then generate PDF
} else {
  // Use HTML template (current flow)
  // Fill placeholders, generate consent
}
```

## User Experience

### Template Creation Flow

1. **Create Template Dialog**
   - Tab 1: "Create from Scratch" (HTML editor - current)
   - Tab 2: "Upload PDF" (file upload)
   - Tab 3: "Both" (upload PDF + edit HTML version)

2. **PDF Upload**
   - Drag & drop or file picker
   - Preview PDF
   - Optional: "Extract text for search" checkbox
   - Save template

3. **Template List**
   - Show format badge (HTML/PDF/HYBRID)
   - PDF templates show PDF icon
   - Preview opens PDF viewer

4. **Consent Generation**
   - If PDF template: Generate consent from PDF
   - If HTML template: Generate consent from HTML (current)
   - Patient signs on generated consent (PDF or HTML-based)

## Migration Strategy

1. **Phase 1**: Add schema fields (backward compatible)
2. **Phase 2**: Add PDF upload to template creation
3. **Phase 3**: Update consent generation to handle PDFs
4. **Phase 4**: Add text extraction (optional enhancement)

## Security Considerations

- PDF file size limit (10MB recommended)
- PDF validation (ensure it's a valid PDF)
- Virus scanning (if available)
- Access control (doctors can only upload their own templates)
- PDF storage in secure Cloudinary folder

## Dependencies

- **Cloudinary**: Already installed ✅
- **PDF Processing**: 
  - Option A: `pdf-parse` (text extraction)
  - Option B: `pdf-lib` (PDF manipulation/filling)
  - Option C: Server-side PDF generation (puppeteer)

**Recommendation**: Start with Cloudinary storage only, add PDF processing later if needed.
