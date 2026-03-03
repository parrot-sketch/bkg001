# Custom PDF Viewer Setup Guide

## Overview

We've implemented a custom PDF viewer using `react-pdf` (which uses PDF.js under the hood). This provides:

✅ **Better Privacy** - PDFs don't leave your domain (no Google Docs Viewer)  
✅ **Full Control** - Customize UI/UX as needed  
✅ **Offline Support** - Works without external services  
✅ **Features** - Zoom, page navigation, download, search (can be added)  
✅ **Better Error Handling** - More control over error states  

## Installation

Install the required packages:

```bash
pnpm add react-pdf pdfjs-dist
```

Or with npm:

```bash
npm install react-pdf pdfjs-dist
```

## Components Created

### 1. `components/pdf/PdfViewer.tsx`

A fully-featured PDF viewer component with:
- Zoom controls (50% - 300%)
- Page navigation (prev/next)
- Download button
- Loading states
- Error handling with retry
- Responsive design

### 2. Updated `PreviewTemplateDialog`

The consent template preview dialog now uses the custom PDF viewer instead of Google Docs Viewer.

## Usage

### Basic Usage

```tsx
import { PdfViewer } from '@/components/pdf/PdfViewer';

<PdfViewer
    file="https://example.com/document.pdf"
    height={600}
    showDownload={true}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `file` | `string` | **required** | URL of the PDF to display |
| `className` | `string` | - | Optional className for container |
| `height` | `string \| number` | `600` | Height of the viewer |
| `showDownload` | `boolean` | `true` | Show download button |
| `onLoadSuccess` | `(numPages: number) => void` | - | Callback when PDF loads |
| `onLoadError` | `(error: Error) => void` | - | Callback when PDF fails to load |

## Features

### Current Features

- ✅ **Zoom Controls**: Zoom in/out (50% - 300%)
- ✅ **Page Navigation**: Navigate between pages
- ✅ **Download**: Download the PDF file
- ✅ **Loading States**: Shows loading spinner while PDF loads
- ✅ **Error Handling**: Graceful error messages with retry option
- ✅ **Text Selection**: Text layer enabled for copy/paste
- ✅ **Annotations**: Annotation layer enabled

### Future Enhancements (Can be added)

- 🔲 **Search**: Search text within PDF
- 🔲 **Thumbnail Navigation**: Sidebar with page thumbnails
- 🔲 **Fullscreen Mode**: Toggle fullscreen viewing
- 🔲 **Print**: Print PDF directly
- 🔲 **Rotation**: Rotate pages
- 🔲 **Bookmarks**: Navigate via PDF bookmarks
- 🔲 **Annotations**: Add/edit annotations
- 🔲 **Multi-page View**: View multiple pages at once

## Configuration

### PDF.js Worker

The component automatically configures the PDF.js worker using a CDN:

```typescript
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
```

### For Production (Optional)

For better performance and offline support, you can host the worker locally:

1. Copy `pdf.worker.min.js` from `node_modules/pdfjs-dist/build/` to `public/`
2. Update the worker path:

```typescript
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
```

Or configure in `next.config.mjs`:

```javascript
webpack: (config) => {
    config.resolve.alias = {
        ...config.resolve.alias,
        'pdfjs-dist': require.resolve('pdfjs-dist'),
    };
    return config;
},
```

## Styling

The component uses Tailwind CSS and shadcn/ui components. Styles can be customized via:

1. **Props**: Pass `className` to override container styles
2. **CSS**: Override Tailwind classes
3. **Theme**: Use your existing design system colors

## Browser Compatibility

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (with some limitations)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Considerations

- **Large PDFs**: For very large PDFs (>50MB), consider:
  - Lazy loading pages
  - Virtual scrolling
  - Progressive loading
  
- **Caching**: PDF.js caches rendered pages automatically

- **Memory**: Each page uses memory. For multi-page PDFs, consider:
  - Rendering only visible pages
  - Limiting max pages rendered at once

## Troubleshooting

### PDF Not Loading

1. **CORS Issues**: Ensure the PDF URL allows cross-origin requests
   ```javascript
   // Server needs to send:
   Access-Control-Allow-Origin: *
   ```

2. **Worker Not Found**: Check browser console for worker errors
   - Ensure CDN is accessible
   - Or configure local worker path

3. **Network Errors**: Check network tab for failed requests

### Styling Issues

- Ensure `react-pdf` CSS is imported:
  ```typescript
  import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
  import 'react-pdf/dist/esm/Page/TextLayer.css';
  ```

### TypeScript Errors

Install type definitions if needed:
```bash
pnpm add -D @types/react-pdf
```

## Example: Enhanced Viewer with Search

```tsx
import { useState } from 'react';
import { PdfViewer } from '@/components/pdf/PdfViewer';
import { Input } from '@/components/ui/input';

function EnhancedPdfViewer({ file }: { file: string }) {
    const [searchTerm, setSearchTerm] = useState('');
    
    return (
        <div>
            <Input
                placeholder="Search in PDF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <PdfViewer file={file} />
        </div>
    );
}
```

## Migration from Google Docs Viewer

The custom viewer is now used in:
- ✅ Consent Template Preview Dialog
- ✅ Create/Edit Template Form (PDF preview)

No changes needed - the component handles all PDF rendering internally.

## Security Considerations

- **CORS**: PDF URLs must allow cross-origin requests
- **Content Security Policy**: May need to allow `blob:` and `data:` URLs
- **XSS**: PDF.js sanitizes content, but be cautious with user-uploaded PDFs

## Resources

- [react-pdf Documentation](https://react-pdf.org/)
- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [PDF.js Examples](https://mozilla.github.io/pdf.js/examples/)
