# PDF Proxy Troubleshooting

## Issue: 401 Unauthorized from Cloudinary

If you're getting `401 Unauthorized` errors when trying to view PDFs from Cloudinary, this is likely because:

1. **Cloudinary is blocking server-side requests** - Some Cloudinary configurations block requests that don't look like browser requests
2. **URL format issue** - The PDF URL might need special formatting
3. **Cloudinary security settings** - Your Cloudinary account might have restrictions

## Solutions

### Solution 1: Check Cloudinary URL Format

Ensure the PDF URL is a **public secure URL**. Cloudinary URLs should look like:
```
https://res.cloudinary.com/{cloud_name}/raw/upload/v{version}/{path}/{filename}.pdf
```

### Solution 2: Verify PDF is Publicly Accessible

Test the URL directly in a browser:
```bash
# Open this URL in your browser
https://res.cloudinary.com/dcngzaxlv/raw/upload/v1772004207/consent-templates/8a99a0d9-f7ec-420d-956f-25e3b5c14ecf/mojnwthoh4uplfq0o48b.pdf
```

If it works in the browser but not through the proxy, it's a server-side blocking issue.

### Solution 3: Use Direct URL (Bypass Proxy)

If the proxy continues to fail, we can configure the PDF viewer to use the direct Cloudinary URL. This will work if:
- Cloudinary allows CORS from your domain
- The PDF is publicly accessible

### Solution 4: Check Cloudinary Settings

1. Log into your Cloudinary dashboard
2. Go to Settings → Security
3. Check if "Restrict media types" or "Block anonymous access" is enabled
4. Ensure raw files (PDFs) are allowed

### Solution 5: Use Cloudinary Signed URLs (If Needed)

If your Cloudinary account requires authentication, you'll need to generate signed URLs server-side:

```typescript
// In your upload route, generate a signed URL
import { v2 as cloudinary } from 'cloudinary';

const signedUrl = cloudinary.utils.private_download_url(publicId, {
    resource_type: 'raw',
    expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour
});
```

## Current Implementation

The proxy endpoint (`/api/pdf-proxy`) now:
- ✅ Uses browser-like headers to mimic browser requests
- ✅ Handles 401 errors with helpful messages
- ✅ Logs detailed error information for debugging
- ✅ Automatically routes Cloudinary URLs through the proxy

## Debugging Steps

1. **Check server logs** - Look for `[PDF Proxy]` messages in your console
2. **Test URL directly** - Try opening the Cloudinary URL in a browser
3. **Check network tab** - See what headers Cloudinary expects
4. **Verify Cloudinary settings** - Ensure PDFs are publicly accessible

## Fallback Options

If the proxy continues to fail, the PDF viewer will:
1. Show an error message
2. Provide "Open in Google Docs Viewer" button
3. Provide "Download PDF" button

These allow users to view/download the PDF even if the inline viewer fails.
