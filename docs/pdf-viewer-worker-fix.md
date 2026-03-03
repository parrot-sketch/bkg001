# PDF Viewer Worker Fix

## Problem

The PDF.js worker is failing to load with error:
```
Failed to fetch dynamically imported module: http://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.js
```

## Root Cause

1. **Version Mismatch**: The code was using version `4.8.69` but `package.json` has `pdfjs-dist@^4.7.100`
2. **CDN Issues**: The cdnjs URL might be blocked or have CORS issues
3. **Network/Firewall**: CDN might be blocked by network/firewall

## Solution Applied

Updated the worker configuration to:
1. Use the correct version from `package.json` (`4.7.100`)
2. Switch to `unpkg.com` CDN (more reliable)
3. Add better error handling for worker failures

## Alternative Solutions

### Option 1: Use Local Worker File (Most Reliable)

1. Copy the worker file to `public/`:
   ```bash
   cp node_modules/pdfjs-dist/build/pdf.worker.min.js public/pdf.worker.min.js
   ```

2. Update `PdfViewer.tsx`:
   ```typescript
   pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
   ```

### Option 2: Use jsdelivr CDN

Update the worker source in `PdfViewer.tsx`:
```typescript
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.js`;
```

### Option 3: Use Exact Version Match

Check the actual installed version:
```bash
npm list pdfjs-dist
# or
pnpm list pdfjs-dist
```

Then update the fallback version in `PdfViewer.tsx` to match exactly.

## Current Configuration

The component now uses:
- **CDN**: `unpkg.com` (more reliable than cdnjs)
- **Version**: `4.7.100` (matches package.json)
- **Fallback**: Error message with retry option

## Testing

After the fix, test by:
1. Opening a consent template preview
2. Checking browser console for any worker errors
3. Verifying PDF loads and displays correctly

## If Still Failing

1. **Check Network Tab**: See if the worker file request is being made and what the response is
2. **Try Local Worker**: Use Option 1 above for most reliable solution
3. **Check CORS**: Ensure your server allows loading from the CDN
4. **Check Firewall**: Ensure CDN is not blocked

## Recommended: Use Local Worker

For production, using a local worker file is recommended:
- ✅ No external dependencies
- ✅ Works offline
- ✅ No CORS issues
- ✅ Faster (no CDN latency)
- ✅ More reliable
