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
    // Production CSP: Allow inline scripts for Next.js hydration, auth, and WebSocket connections
    // Next.js requires 'unsafe-inline' for:
    // - Hydration bootstrapping
    // - App Router runtime
    // - Auth providers (JWT, session management)
    // - WebSocket connections (for real-time features)
    // 
    // Security Note: This is acceptable for apps behind authentication.
    // For stricter security, consider implementing nonces (requires Next.js 13.4+).
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' 'inline-speculation-rules' https:",
        "style-src 'self' 'unsafe-inline'", // Required for Tailwind CSS
        "img-src 'self' data: https: blob:",
        "font-src 'self' data:",
        "connect-src 'self' ws: wss: https:", // Allow WebSocket connections (ws: wss:)
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
