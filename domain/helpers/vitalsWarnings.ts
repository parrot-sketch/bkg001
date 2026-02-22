/**
 * Domain Helper: Vitals Warnings
 *
 * Evaluates pre-op vitals and returns clinical soft-warning messages
 * for out-of-range values. Warnings do NOT block finalization —
 * they are advisory only, shown in the UI as yellow badges.
 *
 * All thresholds are deliberately conservative for a pre-op ward context.
 */

export interface VitalWarning {
    field: string;
    label: string;
    message: string;
    severity: 'warning' | 'critical';
}

export interface VitalsSnapshot {
    bpSystolic?: number;
    bpDiastolic?: number;
    pulse?: number;
    respiratoryRate?: number;
    temperature?: number;
    spo2?: number;
    weight?: number;
}

/**
 * Soft warning thresholds for pre-operative vitals.
 * These mirror common ward-level alert thresholds (non-clinical-decision).
 */
const WARNING_THRESHOLDS = {
    bpSystolic: { low: 90, highWarning: 140, highCritical: 180 },
    bpDiastolic: { low: 60, highWarning: 90, highCritical: 110 },
    pulse: { low: 50, highWarning: 100, highCritical: 130 },
    respiratoryRate: { low: 10, highWarning: 20, highCritical: 30 },
    temperature: { low: 36.0, highWarning: 37.5, highCritical: 38.5 },
    spo2: { lowWarning: 95, lowCritical: 90 },
};

/**
 * Returns an array of VitalWarning for any out-of-range vitals.
 * Returns an empty array if all values are within normal thresholds.
 */
export function getVitalsWarnings(vitals: VitalsSnapshot): VitalWarning[] {
    const warnings: VitalWarning[] = [];

    const { bpSystolic, bpDiastolic, pulse, respiratoryRate, temperature, spo2 } = vitals;

    // ── BP Systolic ──────────────────────────────────────────────
    if (bpSystolic !== undefined) {
        if (bpSystolic < WARNING_THRESHOLDS.bpSystolic.low) {
            warnings.push({
                field: 'bpSystolic',
                label: 'BP Systolic',
                message: `${bpSystolic} mmHg — low (< ${WARNING_THRESHOLDS.bpSystolic.low})`,
                severity: 'critical',
            });
        } else if (bpSystolic >= WARNING_THRESHOLDS.bpSystolic.highCritical) {
            warnings.push({
                field: 'bpSystolic',
                label: 'BP Systolic',
                message: `${bpSystolic} mmHg — critically elevated`,
                severity: 'critical',
            });
        } else if (bpSystolic >= WARNING_THRESHOLDS.bpSystolic.highWarning) {
            warnings.push({
                field: 'bpSystolic',
                label: 'BP Systolic',
                message: `${bpSystolic} mmHg — elevated`,
                severity: 'warning',
            });
        }
    }

    // ── BP Diastolic ─────────────────────────────────────────────
    if (bpDiastolic !== undefined) {
        if (bpDiastolic < WARNING_THRESHOLDS.bpDiastolic.low) {
            warnings.push({
                field: 'bpDiastolic',
                label: 'BP Diastolic',
                message: `${bpDiastolic} mmHg — low`,
                severity: 'warning',
            });
        } else if (bpDiastolic >= WARNING_THRESHOLDS.bpDiastolic.highCritical) {
            warnings.push({
                field: 'bpDiastolic',
                label: 'BP Diastolic',
                message: `${bpDiastolic} mmHg — critically elevated`,
                severity: 'critical',
            });
        } else if (bpDiastolic >= WARNING_THRESHOLDS.bpDiastolic.highWarning) {
            warnings.push({
                field: 'bpDiastolic',
                label: 'BP Diastolic',
                message: `${bpDiastolic} mmHg — elevated`,
                severity: 'warning',
            });
        }
    }

    // ── Pulse ────────────────────────────────────────────────────
    if (pulse !== undefined) {
        if (pulse < WARNING_THRESHOLDS.pulse.low) {
            warnings.push({
                field: 'pulse',
                label: 'Pulse',
                message: `${pulse} bpm — bradycardia`,
                severity: 'warning',
            });
        } else if (pulse >= WARNING_THRESHOLDS.pulse.highCritical) {
            warnings.push({
                field: 'pulse',
                label: 'Pulse',
                message: `${pulse} bpm — tachycardia (severe)`,
                severity: 'critical',
            });
        } else if (pulse >= WARNING_THRESHOLDS.pulse.highWarning) {
            warnings.push({
                field: 'pulse',
                label: 'Pulse',
                message: `${pulse} bpm — tachycardia`,
                severity: 'warning',
            });
        }
    }

    // ── Respiratory Rate ─────────────────────────────────────────
    if (respiratoryRate !== undefined) {
        if (respiratoryRate < WARNING_THRESHOLDS.respiratoryRate.low) {
            warnings.push({
                field: 'respiratoryRate',
                label: 'Resp. Rate',
                message: `${respiratoryRate}/min — low`,
                severity: 'warning',
            });
        } else if (respiratoryRate >= WARNING_THRESHOLDS.respiratoryRate.highCritical) {
            warnings.push({
                field: 'respiratoryRate',
                label: 'Resp. Rate',
                message: `${respiratoryRate}/min — critically elevated`,
                severity: 'critical',
            });
        } else if (respiratoryRate >= WARNING_THRESHOLDS.respiratoryRate.highWarning) {
            warnings.push({
                field: 'respiratoryRate',
                label: 'Resp. Rate',
                message: `${respiratoryRate}/min — elevated`,
                severity: 'warning',
            });
        }
    }

    // ── Temperature ──────────────────────────────────────────────
    if (temperature !== undefined) {
        if (temperature < WARNING_THRESHOLDS.temperature.low) {
            warnings.push({
                field: 'temperature',
                label: 'Temperature',
                message: `${temperature}°C — hypothermic`,
                severity: 'warning',
            });
        } else if (temperature >= WARNING_THRESHOLDS.temperature.highCritical) {
            warnings.push({
                field: 'temperature',
                label: 'Temperature',
                message: `${temperature}°C — high fever`,
                severity: 'critical',
            });
        } else if (temperature >= WARNING_THRESHOLDS.temperature.highWarning) {
            warnings.push({
                field: 'temperature',
                label: 'Temperature',
                message: `${temperature}°C — low-grade fever`,
                severity: 'warning',
            });
        }
    }

    // ── SpO₂ ─────────────────────────────────────────────────────
    if (spo2 !== undefined) {
        if (spo2 < WARNING_THRESHOLDS.spo2.lowCritical) {
            warnings.push({
                field: 'spo2',
                label: 'SpO₂',
                message: `${spo2}% — critically low (hypoxia)`,
                severity: 'critical',
            });
        } else if (spo2 < WARNING_THRESHOLDS.spo2.lowWarning) {
            warnings.push({
                field: 'spo2',
                label: 'SpO₂',
                message: `${spo2}% — below normal (< 95%)`,
                severity: 'warning',
            });
        }
    }

    return warnings;
}

/**
 * Returns a map of field -> warning for quick O(1) access in the UI.
 */
export function getVitalsWarningMap(vitals: VitalsSnapshot): Map<string, VitalWarning> {
    return new Map(getVitalsWarnings(vitals).map((w) => [w.field, w]));
}
