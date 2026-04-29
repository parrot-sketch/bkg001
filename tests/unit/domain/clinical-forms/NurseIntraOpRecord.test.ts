import { describe, it, expect } from 'vitest';
import { nurseIntraOpRecordFinalSchema, nurseIntraOpRecordDraftSchema } from '@/domain/clinical-forms/NurseIntraOpRecord';

describe('NurseIntraOpRecord Schema', () => {
    describe('Final Schema Validation', () => {
        it('should validate a complete record', () => {
            const validData = {
                patientFileNo: 'F12345',
                patientName: 'John Doe',
                age: 45,
                sex: 'Male',
                date: '2026-04-27',
                doctor: 'Dr. Smith',
                patientIdVerified: 'Y',
                informedConsentSigned: 'Y',
                preOpChecklistCompleted: 'Y',
                whoChecklistCompleted: 'Y',
                arrivedWithIVInfusing: 'N',
                countCorrect: 'Y',
                scrubNurse: 'Nurse A',
                circulatingNurse: 'Nurse B',
                scrubNurseSignature: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E',
                circulatingNurseSignature: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E',
            };

            const result = nurseIntraOpRecordFinalSchema.safeParse(validData);
            if (!result.success) {
                console.error(JSON.stringify(result.error, null, 2));
            }
            expect(result.success).toBe(true);
        });

        it('should fail validation if required fields are missing in final schema', () => {
            const invalidData = {
                patientFileNo: '',
            };
            const result = nurseIntraOpRecordFinalSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });

    describe('Draft Schema Validation', () => {
        it('should allow partial data', () => {
            const partialData = {
                patientFileNo: 'F12345',
                patientName: '',
            };
            const result = nurseIntraOpRecordDraftSchema.safeParse(partialData);
            expect(result.success).toBe(true);
        });
    });
});
