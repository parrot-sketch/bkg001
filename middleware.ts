import { NextRequest, NextResponse } from "next/server";

/**
 * JWT-based middleware
 * 
 * Note: API routes handle their own JWT authentication via JwtMiddleware.
 * This middleware is simplified to avoid conflicts with Clerk (which is not used).
 * Client-side routes handle authentication through useAuth hook and redirects.
 */
export default function middleware(request: NextRequest) {
  // Allow all requests through - authentication is handled at:
  // 1. API routes: Via JwtMiddleware in each route handler
  // 2. Client routes: Via useAuth hook and redirects in components
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
