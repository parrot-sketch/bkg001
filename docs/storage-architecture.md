# Storage Architecture

## Overview

This document explains the file storage architecture for different types of files in the system.

## Storage Types

### 1. Cloudinary Storage (Profile Images)

**Route:** `POST /api/upload`

**Used For:**
- Doctor profile images
- Other general image uploads

**Configuration:**
- Images are uploaded to Cloudinary `doctors` folder
- Automatic image transformations (500x500, face crop, auto quality)
- Returns Cloudinary `secure_url` and `public_id`

**Example:**
```typescript
// Upload profile image
const formData = new FormData();
formData.append('file', imageFile);
const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
});
// Returns: { url: 'https://res.cloudinary.com/...', publicId: 'doctors/...' }
```

### 2. Local Storage (Consent Template PDFs)

**Route:** `POST /api/doctor/consents/templates/upload-pdf`

**Used For:**
- Consent template PDF documents

**Storage Location:**
- `storage/consent-templates/{userId}/{filename}.pdf`
- Files are organized by user ID

**Serving:**
- PDFs are served via `GET /api/files/consent-templates/{userId}/{filename}`
- Returns PDF with proper headers for inline display

**Example:**
```typescript
// Upload consent PDF
const formData = new FormData();
formData.append('file', pdfFile);
const response = await fetch('/api/doctor/consents/templates/upload-pdf', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
});
// Returns: { url: '/api/files/consent-templates/{userId}/{filename}', ... }
```

## Why Two Different Storage Systems?

1. **Profile Images (Cloudinary):**
   - Need CDN for fast global delivery
   - Benefit from Cloudinary's image transformations
   - Small files, high frequency
   - Public access needed

2. **Consent PDFs (Local Storage):**
   - Avoid CORS/401 issues with Cloudinary
   - Simpler implementation
   - Full control over file access
   - Can migrate to cloud storage later if needed

## Migration Notes

- Profile images continue to use Cloudinary (unchanged)
- Consent template PDFs migrated from Cloudinary to local storage
- The general `/api/upload` route still handles profile images via Cloudinary

## Future Considerations

- Consider migrating consent PDFs to cloud storage (S3, Azure Blob) for production
- Add file cleanup for deleted templates
- Add file size limits per user
- Consider adding file compression
