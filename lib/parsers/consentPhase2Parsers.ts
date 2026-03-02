/**
 * Consent Phase 2 Parsers
 * 
 * Zod schemas and parsers for Phase 2 Consent & Document Control API requests.
 */

import { z } from 'zod';
import { ValidationError } from '@/application/errors/ValidationError';

// ============================================================================
// Approval Workflow Schemas
// ============================================================================

export const SubmitForApprovalSchema = z.object({
    templateId: z.string().min(1),
    notes: z.string().optional(),
});

export const ApproveTemplateSchema = z.object({
    templateId: z.string().min(1),
    releaseNotes: z.string().min(1, 'Release notes are required'),
});

export const RejectTemplateSchema = z.object({
    templateId: z.string().min(1),
    reason: z.string().min(1, 'Reason for rejection is required'),
});

// ============================================================================
// PDF Management Schemas
// ============================================================================

export const ReplacePdfSchema = z.object({
    templateId: z.string().min(1),
    versionNotes: z.string().optional(),
});

// ============================================================================
// Signed Document Schemas
// ============================================================================

export const SignedUploadSchema = z.object({
    consentId: z.string().min(1),
    checksum: z.string().optional(),
});

// ============================================================================
// Types
// ============================================================================

export type SubmitForApprovalRequest = z.infer<typeof SubmitForApprovalSchema>;
export type ApproveTemplateRequest = z.infer<typeof ApproveTemplateSchema>;
export type RejectTemplateRequest = z.infer<typeof RejectTemplateSchema>;
export type ReplacePdfRequest = z.infer<typeof ReplacePdfSchema>;
export type SignedUploadRequest = z.infer<typeof SignedUploadSchema>;

// ============================================================================
// Parser Functions
// ============================================================================

export function parseSubmitForApproval(body: unknown): SubmitForApprovalRequest {
    try {
        return SubmitForApprovalSchema.parse(body);
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw ValidationError.fromZodError(error, 'Invalid submit for approval request');
        }
        throw new ValidationError('Failed to parse submit for approval request');
    }
}

export function parseApproveTemplate(body: unknown): ApproveTemplateRequest {
    try {
        return ApproveTemplateSchema.parse(body);
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw ValidationError.fromZodError(error, 'Invalid approve template request');
        }
        throw new ValidationError('Failed to parse approve template request');
    }
}

export function parseRejectTemplate(body: unknown): RejectTemplateRequest {
    try {
        return RejectTemplateSchema.parse(body);
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw ValidationError.fromZodError(error, 'Invalid reject template request');
        }
        throw new ValidationError('Failed to parse reject template request');
    }
}

export function parseReplacePdf(body: unknown): ReplacePdfRequest {
    try {
        return ReplacePdfSchema.parse(body);
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw ValidationError.fromZodError(error, 'Invalid replace PDF request');
        }
        throw new ValidationError('Failed to parse replace PDF request');
    }
}

export function parseSignedUpload(body: unknown): SignedUploadRequest {
    try {
        return SignedUploadSchema.parse(body);
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw ValidationError.fromZodError(error, 'Invalid signed upload request');
        }
        throw new ValidationError('Failed to parse signed upload request');
    }
}
