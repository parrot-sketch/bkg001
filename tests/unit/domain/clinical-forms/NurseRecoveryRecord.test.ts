/**
 * Unit Tests: NurseRecoveryRecord validation
 *
 * Tests zod schemas for the post-operative recovery record:
 * - Draft schema (lenient: all optional)
 * - Final schema (strict: all required fields enforced)
 * - Vitals refinement (at least one observation or reason)
 * - Discharge criteria refinement (all criteria met unless HOLD)
 * - Nurse signature refinement
 * - getMissingRecoveryItems helper
 * - getRecoverySectionCompletion helper
 * - getCompletionGateItems helper (COMPLETED transition safety gate)
 * - Enum validation (airway, oxygen, consciousness, nausea, discharge)
 * - Time format validation
 */

import { describe, it, expect } from 'vitest';
import {
    nurseRecoveryRecordDraftSchema,
    nurseRecoveryRecordFinalSchema,
    getMissingRecoveryItems,
    getRecoverySectionCompletion,
    getCompletionGateItems,
    arrivalBaselineSchema,
    vitalsMonitoringSchema,
    interventionsSchema,
    dischargeReadinessSchema,
    dischargeCriteriaSchema,
    vitalsObservationSchema,
    medicationItemSchema,
    fluidItemSchema,
    drainItemSchema,
    type NurseRecoveryRecordData,
    type NurseRecoveryRecordDraft,
} from '@/domain/clinical-forms/NurseRecoveryRecord';

// ──────────────────────────────────────────────────────────────────────
// Complete valid dataset for finalization
// ──────────────────────────────────────────────────────────────────────

const VALID_ARRIVAL: NurseRecoveryRecordData['arrivalBaseline'] = {
    timeArrivedRecovery: '14:30',
    airwayStatus: 'PATENT',
    oxygenDelivery: 'NASAL_CANNULA',
    oxygenFlowRate: '4L/min',
    consciousness: 'ALERT',
    painScore: 3,
    nauseaVomiting: 'NONE',
    arrivalNotes: '',
};

const VALID_VITALS_OBS = {
    time: '14:45',
    bpSys: 120,
    bpDia: 80,
    pulse: 72,
    rr: 16,
    spo2: 98,
    tempC: 36.5,
};

const VALID_VITALS: NurseRecoveryRecordData['vitalsMonitoring'] = {
    observations: [VALID_VITALS_OBS],
    vitalsNotRecordedReason: '',
};

const VALID_INTERVENTIONS: NurseRecoveryRecordData['interventions'] = {
    medications: [
        { name: 'Morphine', dose: '2mg', route: 'IV', time: '14:35' },
    ],
    fluids: [
        { type: 'Normal Saline', volumeMl: 500 },
    ],
    urineOutputMl: 150,
    drains: [],
    dressingStatus: 'Clean and dry',
    interventionNotes: '',
};

const VALID_DISCHARGE: NurseRecoveryRecordData['dischargeReadiness'] = {
    dischargeCriteria: {
        vitalsStable: true,
        painControlled: true,
        nauseaControlled: true,
        bleedingControlled: true,
        airwayStable: true,
    },
    dischargeDecision: 'DISCHARGE_TO_WARD',
    nurseHandoverNotes: 'Stable, transfer to ward',
    dischargeTime: '16:00',
    finalizedByName: 'Nurse Sarah',
    finalizedByUserId: 'user-nurse-1',
    finalizedAt: '2026-02-11T16:00:00Z',
};

const VALID_FINAL_DATA = {
    arrivalBaseline: VALID_ARRIVAL,
    vitalsMonitoring: VALID_VITALS,
    interventions: VALID_INTERVENTIONS,
    dischargeReadiness: VALID_DISCHARGE,
};

// ──────────────────────────────────────────────────────────────────────
// Draft Schema Tests
// ──────────────────────────────────────────────────────────────────────

describe('nurseRecoveryRecordDraftSchema', () => {
    it('accepts empty data', () => {
        const result = nurseRecoveryRecordDraftSchema.safeParse({});
        expect(result.success).toBe(true);
    });

    it('accepts partial data', () => {
        const partial = {
            arrivalBaseline: { painScore: 5 },
        };
        const result = nurseRecoveryRecordDraftSchema.safeParse(partial);
        expect(result.success).toBe(true);
    });

    it('accepts complete valid data', () => {
        const result = nurseRecoveryRecordDraftSchema.safeParse(VALID_FINAL_DATA);
        expect(result.success).toBe(true);
    });

    it('accepts empty sections', () => {
        const data = {
            arrivalBaseline: {},
            vitalsMonitoring: {},
            interventions: {},
            dischargeReadiness: {},
        };
        const result = nurseRecoveryRecordDraftSchema.safeParse(data);
        expect(result.success).toBe(true);
    });
});

// ──────────────────────────────────────────────────────────────────────
// Final Schema Tests
// ──────────────────────────────────────────────────────────────────────

describe('nurseRecoveryRecordFinalSchema', () => {
    it('accepts complete valid data', () => {
        const result = nurseRecoveryRecordFinalSchema.safeParse(VALID_FINAL_DATA);
        expect(result.success).toBe(true);
    });

    it('rejects empty data', () => {
        const result = nurseRecoveryRecordFinalSchema.safeParse({});
        expect(result.success).toBe(false);
    });

    it('rejects when arrivalBaseline section is missing', () => {
        const { arrivalBaseline, ...rest } = VALID_FINAL_DATA;
        const result = nurseRecoveryRecordFinalSchema.safeParse(rest);
        expect(result.success).toBe(false);
    });

    it('rejects when dischargeReadiness section is missing', () => {
        const { dischargeReadiness, ...rest } = VALID_FINAL_DATA;
        const result = nurseRecoveryRecordFinalSchema.safeParse(rest);
        expect(result.success).toBe(false);
    });

    // Vitals refinement
    it('accepts with vitals observations and no reason', () => {
        const data = {
            ...VALID_FINAL_DATA,
            vitalsMonitoring: { observations: [VALID_VITALS_OBS], vitalsNotRecordedReason: '' },
        };
        const result = nurseRecoveryRecordFinalSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it('accepts with no vitals but explicit reason (>= 5 chars)', () => {
        const data = {
            ...VALID_FINAL_DATA,
            vitalsMonitoring: { observations: [], vitalsNotRecordedReason: 'Transferred to ICU urgently' },
        };
        const result = nurseRecoveryRecordFinalSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it('rejects with no vitals and short reason (< 5 chars)', () => {
        const data = {
            ...VALID_FINAL_DATA,
            vitalsMonitoring: { observations: [], vitalsNotRecordedReason: 'No' },
        };
        const result = nurseRecoveryRecordFinalSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('rejects with no vitals and no reason', () => {
        const data = {
            ...VALID_FINAL_DATA,
            vitalsMonitoring: { observations: [], vitalsNotRecordedReason: '' },
        };
        const result = nurseRecoveryRecordFinalSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    // Discharge criteria refinement
    it('rejects DISCHARGE_TO_WARD with vitalsStable=false', () => {
        const data = {
            ...VALID_FINAL_DATA,
            dischargeReadiness: {
                ...VALID_DISCHARGE,
                dischargeCriteria: { ...VALID_DISCHARGE.dischargeCriteria, vitalsStable: false },
            },
        };
        const result = nurseRecoveryRecordFinalSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('allows HOLD with criteria not all met', () => {
        const data = {
            ...VALID_FINAL_DATA,
            dischargeReadiness: {
                ...VALID_DISCHARGE,
                dischargeDecision: 'HOLD' as const,
                dischargeCriteria: {
                    vitalsStable: false,
                    painControlled: false,
                    nauseaControlled: false,
                    bleedingControlled: false,
                    airwayStable: false,
                },
            },
        };
        const result = nurseRecoveryRecordFinalSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    // Nurse signature refinement
    it('rejects when finalizedByName is missing', () => {
        const data = {
            ...VALID_FINAL_DATA,
            dischargeReadiness: {
                ...VALID_DISCHARGE,
                finalizedByName: '',
            },
        };
        const result = nurseRecoveryRecordFinalSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('rejects when finalizedByName is too short (< 2 chars)', () => {
        const data = {
            ...VALID_FINAL_DATA,
            dischargeReadiness: {
                ...VALID_DISCHARGE,
                finalizedByName: 'A',
            },
        };
        const result = nurseRecoveryRecordFinalSchema.safeParse(data);
        expect(result.success).toBe(false);
    });
});

// ──────────────────────────────────────────────────────────────────────
// Arrival Baseline Schema Tests
// ──────────────────────────────────────────────────────────────────────

describe('arrivalBaselineSchema', () => {
    it('rejects invalid airway status', () => {
        const data = { ...VALID_ARRIVAL, airwayStatus: 'INVALID' };
        const result = arrivalBaselineSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('accepts all valid airway statuses', () => {
        for (const status of ['PATENT', 'ORAL_AIRWAY', 'NASAL_AIRWAY', 'LMA_IN_SITU', 'ETT_IN_SITU', 'OTHER']) {
            const data = { ...VALID_ARRIVAL, airwayStatus: status };
            const result = arrivalBaselineSchema.safeParse(data);
            expect(result.success, `Airway status ${status} should be valid`).toBe(true);
        }
    });

    it('rejects pain score > 10', () => {
        const data = { ...VALID_ARRIVAL, painScore: 11 };
        const result = arrivalBaselineSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('rejects pain score < 0', () => {
        const data = { ...VALID_ARRIVAL, painScore: -1 };
        const result = arrivalBaselineSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('accepts pain score 0', () => {
        const data = { ...VALID_ARRIVAL, painScore: 0 };
        const result = arrivalBaselineSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it('accepts pain score 10', () => {
        const data = { ...VALID_ARRIVAL, painScore: 10 };
        const result = arrivalBaselineSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it('rejects invalid time format', () => {
        const data = { ...VALID_ARRIVAL, timeArrivedRecovery: '25:00' };
        const result = arrivalBaselineSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('accepts valid time "23:59"', () => {
        const data = { ...VALID_ARRIVAL, timeArrivedRecovery: '23:59' };
        const result = arrivalBaselineSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it('accepts valid time "00:00"', () => {
        const data = { ...VALID_ARRIVAL, timeArrivedRecovery: '00:00' };
        const result = arrivalBaselineSchema.safeParse(data);
        expect(result.success).toBe(true);
    });
});

// ──────────────────────────────────────────────────────────────────────
// Vitals Observation Schema Tests
// ──────────────────────────────────────────────────────────────────────

describe('vitalsObservationSchema', () => {
    it('accepts valid observation', () => {
        const result = vitalsObservationSchema.safeParse(VALID_VITALS_OBS);
        expect(result.success).toBe(true);
    });

    it('rejects BP systolic below 50', () => {
        const data = { ...VALID_VITALS_OBS, bpSys: 49 };
        const result = vitalsObservationSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('rejects BP systolic above 300', () => {
        const data = { ...VALID_VITALS_OBS, bpSys: 301 };
        const result = vitalsObservationSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('rejects SpO2 above 100', () => {
        const data = { ...VALID_VITALS_OBS, spo2: 101 };
        const result = vitalsObservationSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('rejects SpO2 below 50', () => {
        const data = { ...VALID_VITALS_OBS, spo2: 49 };
        const result = vitalsObservationSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('accepts tempC as optional', () => {
        const { tempC, ...rest } = VALID_VITALS_OBS;
        const result = vitalsObservationSchema.safeParse(rest);
        expect(result.success).toBe(true);
    });

    it('rejects tempC below 33', () => {
        const data = { ...VALID_VITALS_OBS, tempC: 32.9 };
        const result = vitalsObservationSchema.safeParse(data);
        expect(result.success).toBe(false);
    });
});

// ──────────────────────────────────────────────────────────────────────
// Medication / Fluid / Drain Schema Tests
// ──────────────────────────────────────────────────────────────────────

describe('medicationItemSchema', () => {
    it('accepts valid medication', () => {
        const result = medicationItemSchema.safeParse({
            name: 'Morphine', dose: '2mg', route: 'IV', time: '14:30',
        });
        expect(result.success).toBe(true);
    });

    it('rejects short name', () => {
        const result = medicationItemSchema.safeParse({
            name: 'M', dose: '2mg', route: 'IV', time: '14:30',
        });
        expect(result.success).toBe(false);
    });

    it('rejects invalid time format', () => {
        const result = medicationItemSchema.safeParse({
            name: 'Morphine', dose: '2mg', route: 'IV', time: 'bad',
        });
        expect(result.success).toBe(false);
    });
});

describe('fluidItemSchema', () => {
    it('rejects negative volume', () => {
        const result = fluidItemSchema.safeParse({ type: 'NS', volumeMl: -1 });
        expect(result.success).toBe(false);
    });

    it('rejects volume above 10000', () => {
        const result = fluidItemSchema.safeParse({ type: 'NS', volumeMl: 10001 });
        expect(result.success).toBe(false);
    });
});

describe('drainItemSchema', () => {
    it('accepts valid drain', () => {
        const result = drainItemSchema.safeParse({ type: 'JP Drain', site: 'Left flank', outputMl: 50 });
        expect(result.success).toBe(true);
    });

    it('rejects negative output', () => {
        const result = drainItemSchema.safeParse({ type: 'JP Drain', site: 'Left flank', outputMl: -5 });
        expect(result.success).toBe(false);
    });
});

// ──────────────────────────────────────────────────────────────────────
// Discharge Readiness Schema Tests
// ──────────────────────────────────────────────────────────────────────

describe('dischargeReadinessSchema', () => {
    it('accepts valid discharge readiness', () => {
        const result = dischargeReadinessSchema.safeParse(VALID_DISCHARGE);
        expect(result.success).toBe(true);
    });

    it('rejects invalid discharge decision enum', () => {
        const data = { ...VALID_DISCHARGE, dischargeDecision: 'INVALID' };
        const result = dischargeReadinessSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('accepts all valid discharge decisions', () => {
        for (const decision of ['DISCHARGE_TO_WARD', 'DISCHARGE_HOME', 'HOLD']) {
            const data = {
                ...VALID_DISCHARGE,
                dischargeDecision: decision,
            };
            const result = dischargeReadinessSchema.safeParse(data);
            expect(result.success, `Decision ${decision} should be valid`).toBe(true);
        }
    });
});

// ──────────────────────────────────────────────────────────────────────
// getMissingRecoveryItems Tests
// ──────────────────────────────────────────────────────────────────────

describe('getMissingRecoveryItems', () => {
    it('returns empty array for complete data', () => {
        const missing = getMissingRecoveryItems(VALID_FINAL_DATA);
        expect(missing).toEqual([]);
    });

    it('returns missing items for empty data', () => {
        const missing = getMissingRecoveryItems({});
        expect(missing.length).toBeGreaterThan(0);
    });

    it('reports missing arrival fields', () => {
        const data = {
            ...VALID_FINAL_DATA,
            arrivalBaseline: {},
        };
        const missing = getMissingRecoveryItems(data);
        expect(missing.some(m => m.includes('arrivalBaseline'))).toBe(true);
    });

    it('reports missing discharge fields', () => {
        const data = {
            ...VALID_FINAL_DATA,
            dischargeReadiness: {},
        };
        const missing = getMissingRecoveryItems(data);
        expect(missing.some(m => m.includes('dischargeReadiness'))).toBe(true);
    });
});

// ──────────────────────────────────────────────────────────────────────
// getRecoverySectionCompletion Tests
// ──────────────────────────────────────────────────────────────────────

describe('getRecoverySectionCompletion', () => {
    it('returns all complete for valid data', () => {
        const completion = getRecoverySectionCompletion(VALID_FINAL_DATA);
        for (const [key, value] of Object.entries(completion)) {
            expect(value.complete, `Section ${key} should be complete`).toBe(true);
            expect(value.errors).toEqual([]);
        }
    });

    it('returns incomplete sections for empty data', () => {
        const completion = getRecoverySectionCompletion({});
        expect(completion.arrivalBaseline.complete).toBe(false);
        expect(completion.dischargeReadiness.complete).toBe(false);
    });

    it('interventions section is complete with empty arrays', () => {
        const data = {
            ...VALID_FINAL_DATA,
            interventions: { medications: [], fluids: [], drains: [] },
        };
        const completion = getRecoverySectionCompletion(data);
        expect(completion.interventions.complete).toBe(true);
    });

    it('vitals section is complete with observations', () => {
        const completion = getRecoverySectionCompletion(VALID_FINAL_DATA);
        expect(completion.vitalsMonitoring.complete).toBe(true);
    });
});

// ──────────────────────────────────────────────────────────────────────
// getCompletionGateItems Tests (COMPLETED transition safety gate)
// ──────────────────────────────────────────────────────────────────────

describe('getCompletionGateItems', () => {
    it('returns empty array when all safety items present', () => {
        const missing = getCompletionGateItems(VALID_FINAL_DATA);
        expect(missing).toEqual([]);
    });

    it('detects missing time arrived', () => {
        const data = {
            ...VALID_FINAL_DATA,
            arrivalBaseline: { ...VALID_ARRIVAL, timeArrivedRecovery: '' },
        };
        const missing = getCompletionGateItems(data);
        expect(missing.some(m => m.toLowerCase().includes('time arrived'))).toBe(true);
    });

    it('detects missing vitals observations AND no reason', () => {
        const data = {
            ...VALID_FINAL_DATA,
            vitalsMonitoring: { observations: [], vitalsNotRecordedReason: '' },
        };
        const missing = getCompletionGateItems(data);
        expect(missing.some(m => m.toLowerCase().includes('vitals'))).toBe(true);
    });

    it('does NOT flag vitals when reason provided (>= 5 chars)', () => {
        const data = {
            ...VALID_FINAL_DATA,
            vitalsMonitoring: { observations: [], vitalsNotRecordedReason: 'Transferred to ICU urgently' },
        };
        const missing = getCompletionGateItems(data);
        expect(missing.some(m => m.toLowerCase().includes('vitals'))).toBe(false);
    });

    it('detects missing discharge decision', () => {
        const data = {
            ...VALID_FINAL_DATA,
            dischargeReadiness: {
                ...VALID_DISCHARGE,
                dischargeDecision: undefined,
            },
        };
        const missing = getCompletionGateItems(data);
        expect(missing).toContain('Discharge decision not made');
    });

    it('detects HOLD decision blocks completion', () => {
        const data = {
            ...VALID_FINAL_DATA,
            dischargeReadiness: {
                ...VALID_DISCHARGE,
                dischargeDecision: 'HOLD',
            },
        };
        const missing = getCompletionGateItems(data);
        expect(missing.some(m => m.toLowerCase().includes('hold'))).toBe(true);
    });

    it('detects unmet discharge criteria (vitalsStable=false)', () => {
        const data = {
            ...VALID_FINAL_DATA,
            dischargeReadiness: {
                ...VALID_DISCHARGE,
                dischargeCriteria: { ...VALID_DISCHARGE.dischargeCriteria, vitalsStable: false },
            },
        };
        const missing = getCompletionGateItems(data);
        expect(missing.some(m => m.toLowerCase().includes('vitals not stable'))).toBe(true);
    });

    it('detects unmet discharge criteria (painControlled=false)', () => {
        const data = {
            ...VALID_FINAL_DATA,
            dischargeReadiness: {
                ...VALID_DISCHARGE,
                dischargeCriteria: { ...VALID_DISCHARGE.dischargeCriteria, painControlled: false },
            },
        };
        const missing = getCompletionGateItems(data);
        expect(missing.some(m => m.toLowerCase().includes('pain not controlled'))).toBe(true);
    });

    it('detects missing nurse signature', () => {
        const data = {
            ...VALID_FINAL_DATA,
            dischargeReadiness: {
                ...VALID_DISCHARGE,
                finalizedByName: '',
            },
        };
        const missing = getCompletionGateItems(data);
        expect(missing.some(m => m.toLowerCase().includes('nurse'))).toBe(true);
    });

    it('reports all issues when everything is missing', () => {
        const missing = getCompletionGateItems({});
        // Should have at minimum: time arrived, vitals, discharge decision, nurse signature
        expect(missing.length).toBeGreaterThanOrEqual(4);
    });

    it('reports multiple criteria issues when none met', () => {
        const data = {
            ...VALID_FINAL_DATA,
            dischargeReadiness: {
                ...VALID_DISCHARGE,
                dischargeCriteria: {
                    vitalsStable: false,
                    painControlled: false,
                    nauseaControlled: false,
                    bleedingControlled: false,
                    airwayStable: false,
                },
            },
        };
        const missing = getCompletionGateItems(data);
        expect(missing.filter(m => m.toLowerCase().includes('discharge criteria')).length).toBe(5);
    });
});
