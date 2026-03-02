/**
 * Network-Based Security Middleware for Patient Intake Forms
 * 
 * Restricts access to intake forms based on:
 * - Session validity (not expired)
 * - IP address whitelist (if configured)
 * - Audit logging
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

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
function getClientIp(request: NextRequest): string {
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
            reason: `Access denied: IP address ${clientIp} is not in the allowed network range. Please connect to the clinic network.`,
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
            reason: 'Invalid session ID. Please scan the QR code again or ask the receptionist for a new one.',
        };
    }
    
    if (session.status !== 'ACTIVE') {
        return {
            allowed: false,
            reason: 'This intake session is no longer active. Please ask the receptionist to start a new session.',
        };
    }
    
    if (new Date() > session.expires_at) {
        return {
            allowed: false,
            reason: 'This intake session has expired. Please ask the receptionist to start a new session.',
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
