import { describe, it, expect } from 'vitest';
import { nurseIntraOpRecordFinalSchema, nurseIntraOpRecordDraftSchema } from '@/domain/clinical-forms/NurseIntraOpRecord';

describe('NurseIntraOpRecord Schema', () => {
    describe('Final Schema Validation', () => {
        it('should validate a complete record', () => {
            const validData = {
                entry: {
                    timeIn: '10:00',
                    arrivalMethod: 'STRETCHER',
                    identityChecked: true,
                    consentFormChecked: true,
                    siteMarked: true,
                },
                safety: {
                    whoSignIndone: true,
                    whoTimeOutDone: true,
                    whoSignOutDone: true,
                    patientIdVerified: true,
                },
                timings: {
                    anaesthesiaStart: '10:15',
                    surgeryStart: '10:30',
                },
                staffing: {
                    surgeon: 'Dr. Smith',
                    scrubNurse: 'Nurse A',
                },
                diagnoses: {
                    preOpDiagnosis: 'Appendicitis',
                    operationPerformed: 'Appendectomy',
                    side: 'N/A',
                },
                positioning: {
                    position: 'SUPINE',
                    armsSecured: true,
                    safetyBeltApplied: true,
                    bodyAlignmentCorrect: true,
                },
                catheter: {
                    catheterInserted: false,
                },
                skinPrep: {
                    agentUsed: 'Betadine',
                    preppedBy: 'Nurse A',
                },
                equipment: {
                    electrosurgical: {
                        cauteryUsed: true,
                        unitNo: 'E-123',
                        cutSet: '30',
                        coagSet: '30',
                    },
                    tourniquet: {
                        tourniquetUsed: false,
                    },
                },
                surgicalDetails: {
                    woundClassification: 'CLEAN',
                    implantsUsed: false,
                },
                counts: {
                    countCorrect: true,
                    scrubNurseSignature: 'Nurse A',
                    circulatingNurseSignature: 'Nurse B',
                },
                closure: {
                    skinClosure: 'Staples',
                    dressingApplied: 'Gauze',
                },
                fluids: {
                    estimatedBloodLossMl: 50,
                    urinaryOutputMl: 200,
                },
                medications: [],
                implants: [],
                specimens: [],
                itemsToReturnToTheatre: '',
                billing: {
                    anaestheticMaterialsCharge: '',
                    theatreFee: '',
                },
            };

            const result = nurseIntraOpRecordFinalSchema.safeParse(validData);
            if (!result.success) {
                console.error(JSON.stringify(result.error, null, 2));
            }
            expect(result.success).toBe(true);
        });

        it('should fail validation if required fields are missing in final schema', () => {
            const invalidData = {
                positioning: {
                    // Missing required fields
                    position: 'SUPINE',
                },
            };
            const result = nurseIntraOpRecordFinalSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });

    describe('Draft Schema Validation', () => {
        it('should allow partial data', () => {
            const partialData = {
                positioning: {
                    position: 'SUPINE',
                },
            };
            const result = nurseIntraOpRecordDraftSchema.safeParse(partialData);
            expect(result.success).toBe(true);
        });
    });
});
