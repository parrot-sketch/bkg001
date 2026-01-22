import { NextRequest, NextResponse } from "next/server";

/**
 * JWT-based middleware
 * 
 * Note: API routes handle their own JWT authentication via JwtMiddleware.
 * This middleware is simplified to avoid conflicts with Clerk (which is not used).
 * Client-side routes handle authentication through useAuth hook and redirects.
 */
export default function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Content Security Policy configuration
  // Development: More permissive to allow HMR (Hot Module Replacement)
  // Production: More restrictive for security
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    // Development CSP: Allow HMR and Chrome extensions
    // HMR requires 'unsafe-eval' and 'unsafe-inline' for script-src
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval' 'inline-speculation-rules' chrome-extension:",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data:",
        "connect-src 'self' ws: wss:",
        "frame-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
      ].join('; ')
    );
  } else {
    // Production CSP: More restrictive (no unsafe-inline/unsafe-eval)
    // Note: If you use inline scripts in production, you'll need to add nonces or hashes
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'wasm-unsafe-eval' 'inline-speculation-rules'",
        "style-src 'self' 'unsafe-inline'", // Required for Tailwind CSS
        "img-src 'self' data: https: blob:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
      ].join('; ')
    );
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
