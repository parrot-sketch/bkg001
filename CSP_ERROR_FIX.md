# Content Security Policy (CSP) Error Fix

## Problem

Console error:
```
Refused to execute inline script because it violates the following Content Security Policy directive: 
"script-src 'self' 'wasm-unsafe-eval' 'inline-speculation-rules' chrome-extension://..."
```

## Root Cause

This error occurs because:
1. **Next.js HMR (Hot Module Replacement)** uses inline scripts in development
2. **Chrome extensions** may try to inject scripts
3. **Browser's default CSP** or Next.js CSP blocks these inline scripts

## Solution Applied

Updated `middleware.ts` to set appropriate CSP headers:

### Development Mode
- Allows `unsafe-inline` and `unsafe-eval` (required for HMR)
- Allows `chrome-extension:` (for browser extensions)
- More permissive for development workflow

### Production Mode
- Restrictive CSP (no unsafe directives)
- Better security posture
- If you need inline scripts in production, use nonces or hashes

## Alternative Solutions

If the error persists, you have these options:

### Option 1: Disable CSP in Development (Not Recommended)
Only if the above doesn't work, you can remove CSP headers in development:

```typescript
if (!isDevelopment) {
  // Only set CSP in production
  response.headers.set('Content-Security-Policy', ...);
}
```

### Option 2: Suppress Console Warnings (Development Only)
If the error is just noise in development, you can filter it:

```typescript
// In your app (development only)
if (process.env.NODE_ENV === 'development') {
  const originalError = console.error;
  console.error = (...args) => {
    if (args[0]?.includes?.('Content Security Policy')) {
      return; // Suppress CSP errors in dev
    }
    originalError(...args);
  };
}
```

### Option 3: Configure Next.js Headers (Alternative)
You can also set headers in `next.config.mjs`:

```javascript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'development'
              ? "script-src 'self' 'unsafe-eval' 'unsafe-inline' chrome-extension:; ..."
              : "script-src 'self'; ..."
          },
        ],
      },
    ];
  },
};
```

## Important Notes

1. **This is typically a development-only issue** - HMR requires inline scripts
2. **The error is usually harmless** - Your app should still work
3. **Production should have stricter CSP** - The current config handles this
4. **Chrome extensions** - The CSP now allows them, but you can remove this if not needed

## Verification

After the fix:
1. Restart your dev server
2. Clear browser cache
3. Check console - CSP errors should be gone
4. HMR should work without errors

## Security Considerations

- ✅ Development: Permissive CSP (needed for HMR)
- ✅ Production: Restrictive CSP (better security)
- ✅ No `unsafe-inline` in production (unless absolutely necessary)
- ✅ Chrome extension support (can be removed if not needed)

## If Error Persists

1. **Check browser extensions** - Disable extensions to see if one is causing it
2. **Clear browser cache** - Old CSP headers might be cached
3. **Check Next.js version** - Some versions have CSP issues
4. **Verify middleware is running** - Check network tab for CSP headers
