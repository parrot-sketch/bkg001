import { describe, it, expect } from 'vitest';
import {
    parseSubmitForApproval,
    parseApproveTemplate,
    parseRejectTemplate,
    parseReplacePdf,
    parseSignedUpload
} from '@/lib/parsers/consentPhase2Parsers';
import { ValidationError } from '@/application/errors';

describe('Consent Phase 2 Parsers', () => {
    describe('parseSubmitForApproval', () => {
        it('should validate valid submission data', () => {
            const input = { templateId: 'tmpl_123', notes: 'Please review this template' };
            const result = parseSubmitForApproval(input);
            expect(result).toEqual(input);
        });

        it('should allow optional notes', () => {
            const input = { templateId: 'tmpl_123' };
            const result = parseSubmitForApproval(input);
            expect(result.templateId).toBe('tmpl_123');
        });

        it('should throw ValidationError for missing templateId', () => {
            expect(() => parseSubmitForApproval({ notes: 'test' })).toThrow(ValidationError);
        });
    });

    describe('parseApproveTemplate', () => {
        it('should validate valid approval data', () => {
            const input = { templateId: 'tmpl_123', releaseNotes: 'Final release' };
            const result = parseApproveTemplate(input);
            expect(result).toEqual(input);
        });

        it('should throw for empty release notes', () => {
            expect(() => parseApproveTemplate({ templateId: 'tmpl_123', releaseNotes: '' })).toThrow(ValidationError);
        });
    });

    describe('parseRejectTemplate', () => {
        it('should validate valid rejection data', () => {
            const input = { templateId: 'tmpl_123', reason: 'Missing signature block' };
            const result = parseRejectTemplate(input);
            expect(result).toEqual(input);
        });

        it('should throw for missing reason', () => {
            expect(() => parseRejectTemplate({ templateId: 'tmpl_123' })).toThrow(ValidationError);
        });
    });

    describe('parseReplacePdf', () => {
        it('should validate valid replace pdf data', () => {
            const input = { templateId: 'tmpl_123', versionNotes: 'Updated spelling' };
            const result = parseReplacePdf(input);
            expect(result).toEqual(input);
        });

        it('should allow optional version notes', () => {
            const input = { templateId: 'tmpl_123' };
            const result = parseReplacePdf(input);
            expect(result.templateId).toBe('tmpl_123');
        });
    });

    describe('parseSignedUpload', () => {
        it('should validate valid signed upload data', () => {
            const input = { consentId: 'form_123', checksum: 'abc123def456' };
            const result = parseSignedUpload(input);
            expect(result).toEqual(input);
        });

        it('should allow optional checksum', () => {
            const input = { consentId: 'form_123' };
            const result = parseSignedUpload(input);
            expect(result.consentId).toBe('form_123');
        });

        it('should throw for missing consentId', () => {
            expect(() => parseSignedUpload({ checksum: 'abc' })).toThrow(ValidationError);
        });
    });
});
