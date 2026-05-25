/**
 * API Route: POST /api/authentication/login
 *
 * User authentication endpoint.
 *
 * Authenticates a user with email and password, returning JWT tokens.
 *
 * Security:
 * - Generic error messages (no user enumeration)
 * - Password verification via secure hashing (bcrypt)
 * - JWT tokens with proper expiration
 * - DB-backed rate limiting (survives Lambda restarts)
 * - All login attempts recorded in LoginAttempt table for audit + rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import db, { withRetry } from '@/lib/db';
import { LoginDto, loginDtoSchema, LoginResponseDto } from '@/application/dtos/LoginDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { AuthFactory } from '@/infrastructure/auth/AuthFactory';
import { NodeSecurityEventEmitter } from '@/infrastructure/events/NodeSecurityEventEmitter';
import { SecurityEventType } from '@/domain/interfaces/events/ISecurityEventEmitter';
import { getDbRateLimiter } from '@/infrastructure/rate-limiting/DbRateLimiter';
import type { ApiResponse } from '@/lib/api/client';

type ApiErrorResponse = ApiResponse<never>;

const emitter = NodeSecurityEventEmitter.getInstance();

// Module-level singletons — allocated once per Lambda instance.
const rateLimiter = getDbRateLimiter(db);
const { loginUseCase } = AuthFactory.create(db);

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiErrorResponse | ApiResponse<LoginResponseDto>>> {
  const correlationId =
    request.headers.get('x-correlation-id') || crypto.randomUUID();

  // Take only the first IP from x-forwarded-for (the real client IP on Vercel)
  const rawIp = request.headers.get('x-forwarded-for') || 'unknown';
  const ip = rawIp.split(',')[0].trim();
  const userAgent = request.headers.get('user-agent') || undefined;

  // ─── Layer 1: IP rate limit ────────────────────────────────────────────────
  // Checked BEFORE parsing the body so attackers can't bypass by sending garbage.
  // Uses the LoginAttempt table — shared across all Lambda instances.
  const ipCheck = await rateLimiter.isIpRateLimited(ip);
  if (ipCheck.isLimited) {
    emitter.emit(SecurityEventType.RATE_LIMIT_EXCEEDED, {
      ipAddress: ip,
      reason: `IP rate limit exceeded (${ipCheck.attemptCount} attempts in window)`,
      correlationId,
      timestamp: new Date(),
    });
    return NextResponse.json(
      { success: false, error: 'Too many requests from this IP. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(ipCheck.retryAfterSeconds ?? 900) },
      },
    );
  }

  try {
    // ─── Parse & validate body ───────────────────────────────────────────────
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 },
      );
    }

    const validationResult = loginDtoSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return NextResponse.json(
        { success: false, error: firstError?.message || 'Invalid request data' },
        { status: 400 },
      );
    }

    const body: LoginDto = validationResult.data;
    const emailLower = body.email.toLowerCase();

    // ─── Layer 2: DB lock/status check + attempt record in parallel ──────────
    // The findUnique hits the email unique index (fast).
    // recordAttempt is fire-and-forget via .catch() — never blocks login.
    const [accountCheck] = await Promise.all([
      db.user.findUnique({
        where: { email: emailLower },
        select: { id: true, locked_until: true, status: true },
      }),
      // Record this attempt now (before we know the outcome) so the IP rate
      // limit window is accurate. We'll update success=true on the record after
      // a successful login via a separate fire-and-forget call.
      rateLimiter.recordAttempt({
        ip,
        email: emailLower,
        success: false,  // pessimistic — updated below on success
        userAgent,
        userId: undefined,
        reason: 'attempt_started',
      }).catch(() => {}),
    ]);

    // Short-circuit: account locked in DB (cross-instance, persists across restarts)
    if (accountCheck?.locked_until && accountCheck.locked_until > new Date()) {
      const retryAfterSec = Math.ceil(
        (accountCheck.locked_until.getTime() - Date.now()) / 1000,
      );
      emitter.emit(SecurityEventType.ACCOUNT_LOCKED, {
        ipAddress: ip,
        email: emailLower,
        reason: 'Account locked — too many failed attempts',
        correlationId,
        timestamp: new Date(),
      });
      return NextResponse.json(
        {
          success: false,
          error:
            'Account is temporarily locked due to multiple failed login attempts. Please try again later or contact support.',
        },
        { status: 423, headers: { 'Retry-After': String(retryAfterSec) } },
      );
    }

    // Short-circuit: account inactive
    if (accountCheck?.status === 'INACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Account is inactive. Please contact administrator.' },
        { status: 403 },
      );
    }

    // ─── Execute login use case ──────────────────────────────────────────────
    // withRetry handles transient Aiven connection blips (max 2 retries, 200ms delay)
    const response = await withRetry(
      () => loginUseCase.execute({ email: body.email, password: body.password }),
      2,   // fewer retries than default — login is not fully idempotent
      200, // short initial delay — surface failure fast
    );

    if (!response?.accessToken || !response?.refreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error: Invalid response from authentication service',
        },
        { status: 500 },
      );
    }

    // ─── Record successful attempt (fire-and-forget) ─────────────────────────
    rateLimiter.recordAttempt({
      ip,
      email: emailLower,
      success: true,
      userAgent,
      userId: response.user.id,
      reason: undefined,
    }).catch(() => {});

    // Probabilistic cleanup of old LoginAttempt rows (1% of logins)
    if (Math.random() < 0.01) {
      rateLimiter.cleanupOldAttempts().catch(() => {});
    }

    emitter.emit(SecurityEventType.SUCCESSFUL_LOGIN, {
      ipAddress: ip,
      email: response.user.email,
      userId: response.user.id,
      correlationId,
      timestamp: new Date(),
    });

    // ─── Build response + set cookies ────────────────────────────────────────
    const nextResponse = NextResponse.json(
      { success: true, data: response } satisfies ApiResponse<LoginResponseDto>,
      { status: 200 },
    );

    const safeExpiresIn = typeof response.expiresIn === 'number' ? response.expiresIn : 900;
    const cookieBase = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };

    nextResponse.cookies.set('accessToken', response.accessToken, {
      ...cookieBase,
      maxAge: safeExpiresIn,
    });
    nextResponse.cookies.set('refreshToken', response.refreshToken, {
      ...cookieBase,
      maxAge: 7 * 24 * 60 * 60,
    });

    return nextResponse;

  } catch (error: unknown) {
    // ─── Connection error ────────────────────────────────────────────────────
    const isConnectionError =
      error instanceof Error &&
      ((error as any).isConnectionError ||
        error.message.includes('fetch failed') ||
        error.message.includes('Cannot fetch data from service') ||
        error.message.includes('Connection') ||
        error.message.includes("Can't reach database"));

    if (isConnectionError) {
      console.error(
        `[API] /api/authentication/login [${correlationId}] DB connection error:`,
        (error as Error).message,
      );
      return NextResponse.json(
        {
          success: false,
          error:
            'Unable to connect to the database. Please try again in a moment or contact support if the problem persists.',
        },
        { status: 503, headers: { 'Retry-After': '10' } },
      );
    }

    // ─── Invalid credentials (DomainException) ───────────────────────────────
    if (error instanceof DomainException) {
      // NOTE: JwtAuthService throws DomainException for multiple auth failures.
      // We keep responses safe, but we DO log the precise reason for operators.
      console.warn(
        `[API] /api/authentication/login [${correlationId}] Auth failure:`,
        error.message,
        (error as any).details ?? undefined,
      );

      const message = (error.message || '').toLowerCase();

      // If the user exists + password is valid but the account is not usable,
      // return a more accurate status to avoid confusing "invalid password".
      if (message.includes('account is inactive')) {
        return NextResponse.json(
          { success: false, error: 'Account is inactive. Please contact administrator.' },
          { status: 403 },
        );
      }

      if (message.includes('doctor profile not found')) {
        return NextResponse.json(
          { success: false, error: 'Doctor profile not found. Please contact administrator to complete account setup.' },
          { status: 409 },
        );
      }

      if (message.includes('onboarding') && message.includes('not complete')) {
        return NextResponse.json(
          { success: false, error: 'Account onboarding is not complete. Please complete onboarding to access the system.' },
          { status: 403 },
        );
      }

      emitter.emit(SecurityEventType.FAILED_LOGIN, {
        ipAddress: ip,
        reason: 'Invalid credentials',
        correlationId,
        timestamp: new Date(),
      });
      return NextResponse.json(
        { success: false, error: 'Invalid email or password. Please try again.' },
        { status: 401 },
      );
    }

    // ─── Unexpected error ────────────────────────────────────────────────────
    console.error(
      `[API] /api/authentication/login [${correlationId}] Unexpected error:`,
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      {
        success: false,
        error:
          'An unexpected error occurred. Please try again or contact support if the problem persists.',
      },
      { status: 500 },
    );
  }
}
