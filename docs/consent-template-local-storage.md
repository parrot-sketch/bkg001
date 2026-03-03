# Consent Template Local Storage Implementation

## Overview

Switched from Cloudinary to local file storage for consent template PDFs to avoid CORS issues, 401 errors, and simplify the implementation.

## Changes Made

### 1. Upload Route (`app/api/doctor/consents/templates/upload-pdf/route.ts`)
- **Before:** Uploaded PDFs to Cloudinary
- **After:** Saves PDFs to local `storage/consent-templates/{userId}/` directory
- Files are organized by user ID
- Returns local file path: `/api/files/consent-templates/{userId}/{filename}`

### 2. File Serving Route (`app/api/files/consent-templates/[userId]/[filename]/route.ts`)
- New route to serve PDFs from local storage
- Security features:
  - Validates filename and userId to prevent directory traversal
  - Only serves PDF files
  - Returns proper PDF headers with inline display

### 3. PDF Viewer (`components/pdf/PdfViewer.tsx`)
- Removed Cloudinary-specific proxy logic
- Local file URLs work directly, no proxy needed

### 4. API Client (`lib/api/consent-templates.ts`)
- Updated `UploadPdfResponse` interface to match new response structure:
  - `url`: Local file path (e.g., `/api/files/consent-templates/{userId}/{filename}`)
  - `filename`: Original filename
  - `size`: File size in bytes
  - `uploadedAt`: ISO timestamp

### 5. Storage Directory
- Created `storage/consent-templates/` directory
- Added to `.gitignore` to prevent committing uploaded files

## File Structure

```
storage/
└── consent-templates/
    └── {userId}/
        └── {timestamp}-{random}.pdf
```

## API Endpoints

### Upload PDF
```
POST /api/doctor/consents/templates/upload-pdf
Content-Type: multipart/form-data
Body: { file: File }

Response:
{
  "success": true,
  "data": {
    "url": "/api/files/consent-templates/{userId}/{filename}",
    "filename": "{timestamp}-{random}.pdf",
    "size": 12345,
    "uploadedAt": "2026-02-26T07:24:00.000Z"
  }
}
```

### Serve PDF
```
GET /api/files/consent-templates/{userId}/{filename}
Response: PDF file with Content-Type: application/pdf
```

## Security Features

1. **Authentication:** Upload requires DOCTOR role
2. **File Validation:** Only PDF files, max 10MB
3. **Path Traversal Protection:** Validates filename and userId
4. **File Type Verification:** Only serves `.pdf` files

## Benefits

- ✅ No CORS issues
- ✅ No 401 authentication errors
- ✅ Simpler implementation
- ✅ No external dependencies (Cloudinary)
- ✅ Full control over file storage
- ✅ Easy to migrate to cloud storage later if needed

## Migration Notes

- Existing templates with Cloudinary URLs will need to be re-uploaded
- The PDF proxy endpoint (`/api/pdf-proxy`) is no longer needed but kept for backward compatibility
- Storage directory is excluded from git via `.gitignore`

## Future Enhancements

- Add file cleanup for deleted templates
- Add file size limits per user
- Add file compression
- Migrate to cloud storage (S3, Azure Blob, etc.) for production
