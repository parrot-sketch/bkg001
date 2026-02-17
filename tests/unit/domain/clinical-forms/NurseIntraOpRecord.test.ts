import { describe, it, expect } from 'vitest';
import { nurseIntraOpRecordFinalSchema, nurseIntraOpRecordDraftSchema } from '@/domain/clinical-forms/NurseIntraOpRecord';

describe('NurseIntraOpRecord Schema', () => {
    describe('Final Schema Validation', () => {
        it('should validate a complete record', () => {
            const validData = {
                positioning: {
                    position: 'SUPINE',
                    armsSecured: true,
                    safetyBeltApplied: true,
                    pressurePointsPaddingChecked: true,
                    diathermyPlateChecked: true,
                    bodyAlignmentChecked: true,
                    positionNotes: 'Standard positioning',
                },
                skinPrep: {
                    prepAgent: 'HIBITANE_SPIRIT',
                    prepArea: 'Abdomen',
                    prepPerformedBy: 'Nurse A',
                    shavingPerformed: false,
                },
                electrosurgery: {
                    cauteryUsed: true,
                    cauterySettingsCut: '30',
                    cauterySettingsCoag: '30',
                    skinCheckBefore: true,
                    skinCheckAfter: true,
                },
                tourniquet: {
                    tourniquetUsed: false,
                },
                fluids: {
                    ivFluidsTotal: 1000,
                    urineOutput: 200,
                    estimatedBloodLoss: 50,
                    bloodTransfusionUnits: 0,
                },
                closure: {
                    woundClass: 'CLEAN',
                    closureType: 'NON_ABSORBABLE',
                    dressingType: 'GAUZE',
                    drainsUsed: false,
                    packInserted: false,
                },
                counts: {
                    initialCountsCompleted: true,
                    swabsInitial: 10,
                    swabsFinal: 10,
                    sharpsInitial: 5,
                    sharpsFinal: 5,
                    instrumentsInitial: 20,
                    instrumentsFinal: 20,
                    countDiscrepancy: false,
                    initialCountsRecordedBy: 'Nurse A',
                    initialCountsTime: '10:00',
                    finalCountsCompleted: true,
                    finalCountsRecordedBy: 'Nurse B',
                    finalCountsTime: '12:00',
                },
                specimens: {
                    specimens: [],
                },
                implantsUsed: {
                    implantsConfirmed: true,
                    items: [],
                },
                signOut: {
                    signOutCompleted: true,
                    signOutTime: '12:30',
                    signOutNurseName: 'Nurse A',
                    postopInstructionsConfirmed: true,
                    specimensLabeledConfirmed: true,
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
