/**
 * Network-Based Security Middleware for Patient Intake Forms
 * 
 * Restricts access to intake forms based on:
 * - Session validity (not expired)
 * - IP address whitelist (if configured)
 * - Audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/security/rateLimit';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidSessionId(sessionId: unknown): sessionId is string {
    return typeof sessionId === 'string' && UUID_REGEX.test(sessionId);
}

export interface IntakeSecurityConfig {
    /**
     * Allowed IP ranges in CIDR notation (e.g., ["192.168.1.0/24", "10.0.0.0/8"])
     * If empty, no IP restriction (backward compatible)
     */
    allowedIpRanges?: string[];
    
    /**
     * Whether to log all access attempts
     */
    enableAuditLogging?: boolean;
}

/**
 * Check if an IP address is within a CIDR range
 */
function isIpInRange(ip: string, cidr: string): boolean {
    const [rangeIp, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength, 10);
    
    const ipToNumber = (ip: string): number => {
        return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
    };
    
    const mask = ~(0xFFFFFFFF >>> prefix);
    const ipNum = ipToNumber(ip);
    const rangeNum = ipToNumber(rangeIp);
    
    return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Get client IP address from request
 */
export function getClientIp(request: NextRequest): string {
    // Check various headers (in order of preference)
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    
    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }
    
    // Fallback: return unknown if no IP headers found
    return 'unknown';
}

/**
 * Check if client IP is allowed
 */
export function isIpAllowed(ip: string, config: IntakeSecurityConfig): boolean {
    // If no IP ranges configured, allow all (backward compatible)
    if (!config.allowedIpRanges || config.allowedIpRanges.length === 0) {
        return true;
    }
    
    // Check if IP matches any allowed range
    return config.allowedIpRanges.some(range => isIpInRange(ip, range));
}

/**
 * Network allowlist + per-IP rate limit for the public intake endpoints.
 * Returns a response to send back when the request is rejected, otherwise null.
 *
 * Limits are deliberately generous: every patient on the clinic Wi-Fi shares one
 * public IP. The limiter is in-memory, so on serverless it is per-instance and
 * only blunts bursts; it is not a substitute for an edge/WAF limit.
 */
export function guardIntakeRequest(
    request: NextRequest,
    bucket: 'start' | 'validate' | 'submit',
): NextResponse | null {
    const ip = getClientIp(request);
    const config = getIntakeSecurityConfig();

    if (!isIpAllowed(ip, config)) {
        if (config.enableAuditLogging) {
            console.log(`[IntakeSecurity] Blocked ${bucket} from IP ${ip}`);
        }
        return NextResponse.json(
            { error: 'Please connect to the clinic Wi-Fi to fill in this form.', code: 'NETWORK_NOT_ALLOWED' },
            { status: 403 },
        );
    }

    const limits = {
        start: { max: 40, windowMs: 10 * 60_000 },
        validate: { max: 120, windowMs: 10 * 60_000 },
        submit: { max: 20, windowMs: 10 * 60_000 },
    }[bucket];

    const result = rateLimit(ip, { ...limits, keyPrefix: `intake:${bucket}` });
    if (!result.success) {
        return NextResponse.json(
            { error: 'Too many attempts. Please wait a few minutes and try again.', code: 'RATE_LIMITED' },
            {
                status: 429,
                headers: { 'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)) },
            },
        );
    }

    return null;
}

/**
 * Validate intake session access
 * 
 * @param sessionId - Intake session ID
 * @param request - Next.js request object
 * @param config - Security configuration
 * @returns Validation result
 */
export async function validateIntakeSessionAccess(
    sessionId: string,
    request: NextRequest,
    config: IntakeSecurityConfig = {},
): Promise<{
    allowed: boolean;
    reason?: string;
    code?: 'NETWORK_NOT_ALLOWED' | 'SESSION_NOT_FOUND' | 'SESSION_SUBMITTED' | 'SESSION_EXPIRED';
    session?: {
        id: string;
        expiresAt: Date;
        status: string;
    };
}> {
    // Get client IP
    const clientIp = getClientIp(request);
    
    // Check IP whitelist
    if (!isIpAllowed(clientIp, config)) {
        // Log blocked access attempt
        if (config.enableAuditLogging) {
            console.log(`[IntakeSecurity] Blocked access from IP ${clientIp} for session ${sessionId}`);
        }
        
        return {
            allowed: false,
            code: 'NETWORK_NOT_ALLOWED',
            reason: 'Please connect to the clinic Wi-Fi to fill in this form.',
        };
    }
    
    // Check session validity
    const session = await db.intakeSession.findUnique({
        where: { session_id: sessionId },
        select: {
            id: true,
            session_id: true,
            expires_at: true,
            status: true,
        },
    });
    
    if (!session) {
        return {
            allowed: false,
            code: 'SESSION_NOT_FOUND',
            reason: 'This link is not valid. Please scan the QR code at the front desk again.',
        };
    }
    
    if (session.status === 'SUBMITTED' || session.status === 'CONFIRMED') {
        return {
            allowed: false,
            code: 'SESSION_SUBMITTED',
            reason: 'This form has already been submitted.',
        };
    }
    
    if (session.status !== 'ACTIVE' || new Date() > session.expires_at) {
        return {
            allowed: false,
            code: 'SESSION_EXPIRED',
            reason: 'This form has expired. Please start a new one.',
        };
    }
    
    // Log successful access
    if (config.enableAuditLogging) {
        console.log(`[IntakeSecurity] Allowed access from IP ${clientIp} for session ${sessionId}`);
    }
    
    return {
        allowed: true,
        session: {
            id: session.id,
            expiresAt: session.expires_at,
            status: session.status,
        },
    };
}

/**
 * Get security configuration from environment variables
 */
export function getIntakeSecurityConfig(): IntakeSecurityConfig {
    const allowedRanges = process.env.INTAKE_ALLOWED_IP_RANGES;
    
    return {
        allowedIpRanges: allowedRanges
            ? allowedRanges.split(',').map(r => r.trim()).filter(Boolean)
            : undefined,
        enableAuditLogging: process.env.INTAKE_ENABLE_AUDIT_LOGGING === 'true',
    };
}
