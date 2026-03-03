# Consent Template Document Storage Architecture

## Current Storage Solution

### **Cloudinary (Cloud Storage)**

Consent PDF documents are stored in **Cloudinary**, a cloud-based media management service.

#### Storage Details:
- **Service**: Cloudinary
- **Resource Type**: `raw` (for PDF files)
- **Storage Path**: `consent-templates/{userId}/`
- **Format**: PDF files preserved as-is
- **Max File Size**: 10MB per PDF
- **URL Type**: Secure URLs (`secure_url`)

#### Configuration:
```typescript
// app/api/doctor/consents/templates/upload-pdf/route.ts
cloudinary.uploader.upload_stream({
    folder: `consent-templates/${user.userId}`,
    resource_type: 'raw',
    format: 'pdf',
    context: {
        uploaded_by: user.userId,
        uploaded_at: new Date().toISOString(),
    },
})
```

#### Database Storage:
- **Field**: `ConsentTemplate.pdf_url` (TEXT, nullable)
- **Stores**: Full Cloudinary secure URL
- **Example**: `https://res.cloudinary.com/{cloud_name}/raw/upload/v{version}/consent-templates/{userId}/{filename}.pdf`

---

## How to View Uploaded Documents

### **1. In the Template Management UI**

#### **During Upload (Upload View)**
- Preview shown immediately after file selection
- Uses browser's native PDF viewer via `<object>` tag
- Preview URL: Local blob URL (temporary, for preview only)

#### **In Template List (List View)**
- Click **"Preview"** button on any template card
- Opens preview dialog with PDF viewer

#### **In Create/Edit Form**
- PDF preview shown in Step 2 (PDF Document section)
- Uses Google Docs Viewer for better compatibility:
  ```typescript
  `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`
  ```
- Fallback: "Open PDF in new tab" button if inline viewing fails

### **2. Direct Access**

#### **Via Cloudinary URL**
- Each template stores the full Cloudinary URL in `pdf_url` field
- Can be accessed directly: `https://res.cloudinary.com/...`
- **Note**: Cloudinary `raw` resources are served as downloads by default

#### **Via Database Query**
```sql
SELECT id, title, pdf_url, created_at 
FROM "ConsentTemplate" 
WHERE created_by = '{userId}';
```

---

## Current Viewing Implementation

### **Preview Method: Google Docs Viewer**

**Why Google Docs Viewer?**
- Cloudinary `raw` resources don't display inline in `<iframe>` tags
- Google Docs Viewer provides reliable PDF rendering
- Works across different browsers

**Implementation:**
```tsx
<object
    data={`https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`}
    type="application/pdf"
    className="w-full h-[600px] border rounded"
>
    <Button onClick={() => window.open(pdfUrl, '_blank')}>
        Open PDF in new tab
    </Button>
</object>
```

**Limitations:**
- Requires internet connection (Google Docs Viewer needs to fetch from Cloudinary)
- Privacy: PDF URL is sent to Google (for viewing only)
- May not work if Cloudinary URL requires authentication

---

## Storage Architecture Diagram

```
┌─────────────────┐
│  Doctor Uploads │
│     PDF File    │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────┐
│  POST /api/.../upload-pdf│
│  - Validates PDF        │
│  - Authenticates user   │
│  - Uploads to Cloudinary│
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│     Cloudinary          │
│  Folder: consent-       │
│    templates/{userId}/   │
│  Returns: secure_url    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   PostgreSQL Database   │
│  ConsentTemplate        │
│  - pdf_url (TEXT)      │
│  - Stores Cloudinary URL│
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   UI Preview            │
│  - Google Docs Viewer   │
│  - Direct link fallback │
└─────────────────────────┘
```

---

## Access Control & Security

### **Current Security:**
- ✅ **Authentication Required**: Only authenticated doctors can upload
- ✅ **Role-Based Access**: Only `DOCTOR` role can access upload endpoint
- ✅ **User Isolation**: Files stored in user-specific folders
- ✅ **Secure URLs**: Cloudinary provides secure URLs (HTTPS)
- ✅ **Metadata**: Upload context includes `uploaded_by` and `uploaded_at`

### **Potential Security Concerns:**
- ⚠️ **Public URLs**: Cloudinary secure URLs are publicly accessible if someone has the URL
- ⚠️ **No Access Control on Cloudinary**: URLs can be shared/accessed by anyone with the link
- ⚠️ **No Expiration**: URLs don't expire
- ⚠️ **No Download Restrictions**: Anyone with URL can download

---

## Viewing Options Summary

| Method | Location | How to Access | Pros | Cons |
|--------|----------|--------------|------|------|
| **Template Preview** | UI - Template Card | Click "Preview" button | Integrated, easy | Requires UI access |
| **Google Docs Viewer** | Create/Edit Form | Automatic in Step 2 | Reliable rendering | Requires internet, privacy concern |
| **Direct URL** | Cloudinary | Copy `pdf_url` from DB | Fast, direct | No access control |
| **New Tab** | Browser | Click "Open in new tab" | Native PDF viewer | Leaves current page |

---

## Recommendations for Improvement

### **1. Enhanced Access Control**
- **Option A**: Use Cloudinary signed URLs with expiration
- **Option B**: Implement proxy endpoint that checks permissions before serving PDF
- **Option C**: Use Cloudinary authenticated URLs

### **2. Better Preview Experience**
- **Option A**: Use PDF.js for client-side rendering (no external dependency)
- **Option B**: Server-side PDF to image conversion for thumbnails
- **Option C**: Keep Google Docs Viewer but add privacy notice

### **3. Storage Alternatives (Future Consideration)**
- **Option A**: Keep Cloudinary (current, works well)
- **Option B**: Move to S3-compatible storage (more control)
- **Option C**: Database blob storage (simpler, but not scalable)

### **4. Document Management Features**
- Add download button (with audit logging)
- Add document expiration/retention policies
- Add document versioning at storage level (not just DB versioning)
- Add document access logs

---

## Current File Locations

### **In Code:**
- **Upload Route**: `app/api/doctor/consents/templates/upload-pdf/route.ts`
- **Storage Config**: Cloudinary config in upload route
- **Database Field**: `ConsentTemplate.pdf_url` (Prisma schema)

### **In Cloudinary:**
- **Path Pattern**: `consent-templates/{userId}/{auto-generated-filename}.pdf`
- **Access**: Via secure URL stored in database

### **In Database:**
- **Table**: `ConsentTemplate`
- **Column**: `pdf_url` (TEXT, nullable)
- **Example Value**: `https://res.cloudinary.com/dcngzaxlv/raw/upload/v1771936908/consent-templates/8a99a0d9-f7ec-420d-956f-25e3b5c14ecf/lvwnm4i6sv9tdsru3p28.pdf`

---

## How to View a Specific Document

### **Method 1: Via UI**
1. Go to `/doctor/consents/templates`
2. Find the template in the list
3. Click **"Preview"** button
4. PDF opens in preview dialog

### **Method 2: Via Database**
1. Query database:
   ```sql
   SELECT pdf_url FROM "ConsentTemplate" WHERE id = '{templateId}';
   ```
2. Copy the URL
3. Open in browser or PDF viewer

### **Method 3: Via API**
1. Call `GET /api/doctor/consents/templates/{templateId}`
2. Response includes `pdf_url`
3. Use URL to view document

---

## Environment Variables Required

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## Questions to Consider

1. **Access Control**: Should PDFs be publicly accessible or require authentication?
2. **Retention**: How long should uploaded PDFs be kept?
3. **Backup**: Are PDFs backed up? (Cloudinary provides this, but verify)
4. **Compliance**: Do PDFs need to be stored in specific regions for compliance?
5. **Cost**: Cloudinary pricing for storage and bandwidth?
6. **Alternatives**: Should we consider other storage solutions?

---

## Next Steps (If Needed)

1. **Add Download Endpoint**: Create authenticated download endpoint
2. **Add Access Logging**: Log who views/downloads which documents
3. **Add Expiration**: Implement document retention policies
4. **Add Thumbnails**: Generate PDF thumbnails for better UI
5. **Add Search**: Full-text search within PDFs (requires PDF text extraction)
