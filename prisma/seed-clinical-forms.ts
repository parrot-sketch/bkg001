/**
 * Seed: Clinical Form Templates
 *
 * Seeds the ClinicalFormTemplate table with the NURSE_PREOP_WARD_CHECKLIST
 * based on the NSAC Perioperative Record pre-operative ward check-list.
 *
 * Run: npx tsx prisma/seed-clinical-forms.ts
 */

import { PrismaClient, Role } from '@prisma/client';

const db = new PrismaClient();

// ──────────────────────────────────────────────────────────────────────
// Template: NURSE_PREOP_WARD_CHECKLIST v1
// Source: NSAC Perioperative Record — "PRE-OPERATIVE WARD CHECK-LIST"
// ──────────────────────────────────────────────────────────────────────

const NURSE_PREOP_WARD_CHECKLIST_SCHEMA = {
    type: 'object',
    sections: {
        documentation: {
            title: 'Documentation',
            fields: {
                documentationComplete: { type: 'boolean', label: 'Documentation complete and correct', required: true },
                correctConsent: { type: 'boolean', label: 'Correct consent signed', required: true },
            },
        },
        bloodResults: {
            title: 'Blood & Lab Results',
            fields: {
                hbPcv: { type: 'string', label: 'Hb / PCV', required: false },
                uecs: { type: 'string', label: 'UECs', required: false },
                xMatchUnitsAvailable: { type: 'number', label: 'X-match units available', required: false, min: 0 },
                otherLabResults: { type: 'string', label: 'Other lab results / notes', required: false },
            },
        },
        medications: {
            title: 'Medications',
            fields: {
                preMedGiven: { type: 'boolean', label: 'Pre-med given', required: true },
                preMedDetails: { type: 'string', label: 'Pre-med details (drug, dose)', required: false },
                preMedTimeGiven: { type: 'string', label: 'Pre-med time given', required: false, format: 'HH:MM' },
                periOpMedsGiven: { type: 'boolean', label: 'Peri-operative medications given', required: false },
                periOpMedsDetails: { type: 'string', label: 'Peri-op medications details', required: false },
                regularMedsGiven: { type: 'boolean', label: 'Regular medications given', required: false },
                regularMedsDetails: { type: 'string', label: 'Regular medications details', required: false },
                regularMedsTimeGiven: { type: 'string', label: 'Regular meds time given', required: false, format: 'HH:MM' },
            },
        },
        allergiesNpo: {
            title: 'Allergies & NPO Status',
            fields: {
                allergiesDocumented: { type: 'boolean', label: 'Allergies documented', required: true },
                allergiesDetails: { type: 'string', label: 'Allergy details (list all)', required: false },
                npoStatus: { type: 'boolean', label: 'Patient is nil by mouth (NPO)', required: true },
                npoFastedFromTime: { type: 'string', label: 'Fasted from (time)', required: false, format: 'HH:MM' },
            },
        },
        preparation: {
            title: 'Peri-Operative Preparation',
            fields: {
                bathGown: { type: 'boolean', label: 'Bath / shower and gown', required: true },
                shaveSkinPrep: { type: 'boolean', label: 'Shave / skin prep done', required: false },
                idBandOn: { type: 'boolean', label: 'ID band on', required: true },
                correctPositioning: { type: 'boolean', label: 'Correct positioning verified', required: false },
                jewelryRemoved: { type: 'boolean', label: 'Jewelry removed', required: true },
                makeupNailPolishRemoved: { type: 'boolean', label: 'Makeup / nail polish removed', required: true },
            },
        },
        prosthetics: {
            title: 'Prosthetics Checks',
            fields: {
                contactLensRemoved: { type: 'boolean', label: 'Contact lenses removed', required: false },
                denturesRemoved: { type: 'boolean', label: 'Dentures removed', required: false },
                hearingAidRemoved: { type: 'boolean', label: 'Hearing aid removed', required: false },
                crownsBridgeworkNoted: { type: 'boolean', label: 'Crowns / bridgework noted', required: false },
                prostheticNotes: { type: 'string', label: 'Prosthetic notes', required: false },
            },
        },
        vitals: {
            title: 'Immediate Pre-Op Observations',
            fields: {
                bpSystolic: { type: 'number', label: 'BP Systolic (mmHg)', required: true, min: 60, max: 260 },
                bpDiastolic: { type: 'number', label: 'BP Diastolic (mmHg)', required: true, min: 30, max: 160 },
                pulse: { type: 'number', label: 'Pulse (bpm)', required: true, min: 30, max: 220 },
                respiratoryRate: { type: 'number', label: 'Respiratory rate (/min)', required: true, min: 6, max: 60 },
                temperature: { type: 'number', label: 'Temperature (°C)', required: true, min: 34.0, max: 42.0 },
                cvp: { type: 'string', label: 'CVP (if applicable)', required: false },
                bladderEmptied: { type: 'boolean', label: 'Bladder emptied', required: true },
                height: { type: 'number', label: 'Height (cm)', required: false, min: 50, max: 250 },
                weight: { type: 'number', label: 'Weight (kg)', required: true, min: 2, max: 350 },
                urinalysis: { type: 'string', label: 'Urinalysis results', required: false },
                xRaysScansPresent: { type: 'boolean', label: 'X-rays / scans present', required: false },
                otherFormsRequired: { type: 'string', label: 'Other forms required / notes', required: false },
            },
        },
        handover: {
            title: 'Handover',
            fields: {
                preparedByName: { type: 'string', label: 'Prepared by (name)', required: true },
                timeArrivedInTheatre: { type: 'string', label: 'Time arrived in theatre', required: false, format: 'HH:MM' },
                receivedByName: { type: 'string', label: 'Received by (name)', required: false },
                handedOverByName: { type: 'string', label: 'Handed over by (name)', required: false },
            },
        },
    },
};

const NURSE_PREOP_WARD_CHECKLIST_UI = {
    layout: 'accordion',
    sectionOrder: [
        'documentation',
        'bloodResults',
        'medications',
        'allergiesNpo',
        'preparation',
        'prosthetics',
        'vitals',
        'handover',
    ],
    sectionIcons: {
        documentation: 'FileCheck',
        bloodResults: 'TestTube',
        medications: 'Pill',
        allergiesNpo: 'AlertTriangle',
        preparation: 'Scissors',
        prosthetics: 'Eye',
        vitals: 'Activity',
        handover: 'ArrowRightLeft',
    },
};

// ──────────────────────────────────────────────────────────────────────
// Template: NURSE_INTRAOP_RECORD v1
// Source: NSAC Perioperative Record — Intra-operative nurse documentation
// ──────────────────────────────────────────────────────────────────────

const NURSE_INTRAOP_RECORD_SCHEMA = {
    type: 'object',
    sections: {
        theatreSetup: {
            title: 'Theatre Setup',
            fields: {
                positioning: { type: 'string', label: 'Patient Positioning', required: true },
                skinPrepAgent: { type: 'string', label: 'Skin Prep Agent', required: true },
                drapeType: { type: 'string', label: 'Drape Type', required: true },
                tourniquetUsed: { type: 'boolean', label: 'Tourniquet Used', required: true },
                tourniquetPressure: { type: 'number', label: 'Tourniquet Pressure (mmHg)', required: false, min: 0, max: 500 },
                tourniquetTimeOn: { type: 'string', label: 'Tourniquet Time On', required: false, format: 'HH:MM' },
                tourniquetTimeOff: { type: 'string', label: 'Tourniquet Time Off', required: false, format: 'HH:MM' },
                cauteryUsed: { type: 'boolean', label: 'Cautery / Diathermy Used', required: true },
                cauterySettingsCut: { type: 'string', label: 'Cautery Cut Setting', required: false },
                cauterySettingsCoag: { type: 'string', label: 'Cautery Coag Setting', required: false },
                drainsUsed: { type: 'boolean', label: 'Drains Used', required: true },
                drainType: { type: 'string', label: 'Drain Type', required: false },
                drainLocation: { type: 'string', label: 'Drain Location', required: false },
                irrigationType: { type: 'string', label: 'Irrigation Type', required: false },
                irrigationVolumeMl: { type: 'number', label: 'Irrigation Volume (mL)', required: false, min: 0 },
                woundClass: { type: 'enum', label: 'Wound Classification', required: true, options: ['CLEAN', 'CLEAN_CONTAMINATED', 'CONTAMINATED', 'DIRTY_INFECTED'] },
            },
        },
        counts: {
            title: 'Swab / Instrument / Sharps Counts',
            critical: true,
            fields: {
                initialCountsCompleted: { type: 'boolean', label: 'Initial Counts Completed', required: true },
                initialCountsRecordedBy: { type: 'string', label: 'Initial Counts Recorded By', required: true },
                initialCountsTime: { type: 'string', label: 'Initial Counts Time', required: false, format: 'HH:MM' },
                swabsInitial: { type: 'number', label: 'Swabs (Initial)', required: false, min: 0 },
                sharpsInitial: { type: 'number', label: 'Sharps (Initial)', required: false, min: 0 },
                instrumentsInitial: { type: 'number', label: 'Instruments (Initial)', required: false, min: 0 },
                finalCountsCompleted: { type: 'boolean', label: 'Final Counts Completed', required: true },
                finalCountsRecordedBy: { type: 'string', label: 'Final Counts Recorded By', required: true },
                finalCountsTime: { type: 'string', label: 'Final Counts Time', required: false, format: 'HH:MM' },
                swabsFinal: { type: 'number', label: 'Swabs (Final)', required: false, min: 0 },
                sharpsFinal: { type: 'number', label: 'Sharps (Final)', required: false, min: 0 },
                instrumentsFinal: { type: 'number', label: 'Instruments (Final)', required: false, min: 0 },
                countDiscrepancy: { type: 'boolean', label: 'Count Discrepancy', required: true },
                discrepancyNotes: { type: 'string', label: 'Discrepancy Notes', required: false },
            },
        },
        specimens: {
            title: 'Specimens',
            fields: {
                specimens: { type: 'array', label: 'Specimen Items', required: false, itemFields: {
                    specimenType: { type: 'string', label: 'Specimen Type', required: true },
                    site: { type: 'string', label: 'Site', required: true },
                    destinationLab: { type: 'string', label: 'Destination Lab', required: true },
                    timeSent: { type: 'string', label: 'Time Sent', required: false, format: 'HH:MM' },
                    notes: { type: 'string', label: 'Notes', required: false },
                }},
            },
        },
        implantsUsed: {
            title: 'Implants / Prostheses Used',
            fields: {
                implantsConfirmed: { type: 'boolean', label: 'Implants Confirmed', required: true },
                items: { type: 'array', label: 'Implant Items', required: false, itemFields: {
                    name: { type: 'string', label: 'Implant Name', required: true },
                    manufacturer: { type: 'string', label: 'Manufacturer', required: false },
                    lotNumber: { type: 'string', label: 'Lot Number', required: false },
                    serialNumber: { type: 'string', label: 'Serial Number', required: false },
                    expiryDate: { type: 'string', label: 'Expiry Date', required: false },
                    used: { type: 'boolean', label: 'Used', required: true },
                    notes: { type: 'string', label: 'Notes', required: false },
                }},
            },
        },
        signOut: {
            title: 'Sign-Out & Completion',
            critical: true,
            fields: {
                signOutCompleted: { type: 'boolean', label: 'Sign-Out Completed', required: true },
                signOutTime: { type: 'string', label: 'Sign-Out Time', required: false, format: 'HH:MM' },
                signOutNurseName: { type: 'string', label: 'Sign-Out Nurse Name', required: true },
                postopInstructionsConfirmed: { type: 'boolean', label: 'Post-Op Instructions Confirmed', required: true },
                specimensLabeledConfirmed: { type: 'boolean', label: 'Specimens Labeled Confirmed', required: true },
                additionalNotes: { type: 'string', label: 'Additional Notes', required: false },
            },
        },
    },
};

const NURSE_INTRAOP_RECORD_UI = {
    layout: 'accordion',
    sectionOrder: ['theatreSetup', 'counts', 'specimens', 'implantsUsed', 'signOut'],
    sectionIcons: {
        theatreSetup: 'Settings',
        counts: 'Hash',
        specimens: 'FlaskConical',
        implantsUsed: 'Package',
        signOut: 'ClipboardCheck',
    },
};

// ──────────────────────────────────────────────────────────────────────
// Template: NURSE_RECOVERY_RECORD v1
// Source: NSAC Perioperative Record — Post-Operative Recovery / PACU
// ──────────────────────────────────────────────────────────────────────

const NURSE_RECOVERY_RECORD_SCHEMA = {
    type: 'object',
    sections: {
        arrivalBaseline: {
            title: 'Arrival & Baseline Assessment',
            fields: {
                timeArrivedRecovery: { type: 'string', label: 'Time Arrived in Recovery', required: true, format: 'HH:MM' },
                airwayStatus: { type: 'enum', label: 'Airway Status', required: true, options: ['PATENT', 'ORAL_AIRWAY', 'NASAL_AIRWAY', 'LMA_IN_SITU', 'ETT_IN_SITU', 'OTHER'] },
                oxygenDelivery: { type: 'enum', label: 'Oxygen Delivery', required: true, options: ['ROOM_AIR', 'NASAL_CANNULA', 'FACE_MASK', 'NON_REBREATHER', 'VENTURI', 'OTHER'] },
                oxygenFlowRate: { type: 'string', label: 'O₂ Flow Rate', required: false },
                consciousness: { type: 'enum', label: 'Consciousness Level', required: true, options: ['ALERT', 'RESPONSIVE_TO_VOICE', 'RESPONSIVE_TO_PAIN', 'UNRESPONSIVE', 'DROWSY'] },
                painScore: { type: 'number', label: 'Pain Score (0–10)', required: true, min: 0, max: 10 },
                nauseaVomiting: { type: 'enum', label: 'Nausea / Vomiting', required: true, options: ['NONE', 'MILD_NAUSEA', 'MODERATE_NAUSEA', 'VOMITING', 'SEVERE_VOMITING'] },
                arrivalNotes: { type: 'string', label: 'Arrival Notes', required: false },
            },
        },
        vitalsMonitoring: {
            title: 'Vitals Monitoring',
            critical: true,
            fields: {
                observations: {
                    type: 'array', label: 'Vital Signs Observations', required: true, itemFields: {
                        time: { type: 'string', label: 'Time', required: true, format: 'HH:MM' },
                        bpSys: { type: 'number', label: 'BP Systolic (mmHg)', required: true, min: 50, max: 300 },
                        bpDia: { type: 'number', label: 'BP Diastolic (mmHg)', required: true, min: 20, max: 200 },
                        pulse: { type: 'number', label: 'Pulse (bpm)', required: true, min: 20, max: 250 },
                        rr: { type: 'number', label: 'Respiratory Rate (/min)', required: true, min: 4, max: 60 },
                        spo2: { type: 'number', label: 'SpO₂ (%)', required: true, min: 50, max: 100 },
                        tempC: { type: 'number', label: 'Temperature (°C)', required: false, min: 33.0, max: 42.0 },
                    },
                },
                vitalsNotRecordedReason: { type: 'string', label: 'Reason if Vitals Not Recorded', required: false },
            },
        },
        interventions: {
            title: 'Interventions & Medications',
            fields: {
                medications: {
                    type: 'array', label: 'Medications Given', required: false, itemFields: {
                        name: { type: 'string', label: 'Medication Name', required: true },
                        dose: { type: 'string', label: 'Dose', required: true },
                        route: { type: 'string', label: 'Route', required: true },
                        time: { type: 'string', label: 'Time Given', required: true, format: 'HH:MM' },
                    },
                },
                fluids: {
                    type: 'array', label: 'IV Fluids', required: false, itemFields: {
                        type: { type: 'string', label: 'Fluid Type', required: true },
                        volumeMl: { type: 'number', label: 'Volume (mL)', required: true, min: 0, max: 10000 },
                    },
                },
                urineOutputMl: { type: 'number', label: 'Urine Output (mL)', required: false, min: 0 },
                drains: {
                    type: 'array', label: 'Drains', required: false, itemFields: {
                        type: { type: 'string', label: 'Drain Type', required: true },
                        site: { type: 'string', label: 'Drain Site', required: true },
                        outputMl: { type: 'number', label: 'Output (mL)', required: true, min: 0, max: 5000 },
                    },
                },
                dressingStatus: { type: 'string', label: 'Dressing Status', required: false },
                interventionNotes: { type: 'string', label: 'Intervention Notes', required: false },
            },
        },
        dischargeReadiness: {
            title: 'Discharge Readiness & Handover',
            critical: true,
            fields: {
                dischargeCriteria: {
                    type: 'object', label: 'Discharge Criteria', required: true, subFields: {
                        vitalsStable: { type: 'boolean', label: 'Vitals Stable', required: true },
                        painControlled: { type: 'boolean', label: 'Pain Controlled', required: true },
                        nauseaControlled: { type: 'boolean', label: 'Nausea Controlled', required: true },
                        bleedingControlled: { type: 'boolean', label: 'Bleeding Controlled', required: true },
                        airwayStable: { type: 'boolean', label: 'Airway Stable', required: true },
                    },
                },
                dischargeDecision: { type: 'enum', label: 'Discharge Decision', required: true, options: ['DISCHARGE_TO_WARD', 'DISCHARGE_HOME', 'HOLD'] },
                nurseHandoverNotes: { type: 'string', label: 'Nurse Handover Notes', required: false },
                dischargeTime: { type: 'string', label: 'Discharge Time', required: false, format: 'HH:MM' },
                finalizedByName: { type: 'string', label: 'Finalized By (Nurse Name)', required: true },
                finalizedByUserId: { type: 'string', label: 'Finalized By (User ID)', required: false },
                finalizedAt: { type: 'string', label: 'Finalized At', required: false },
            },
        },
    },
};

const NURSE_RECOVERY_RECORD_UI = {
    layout: 'accordion',
    sectionOrder: ['arrivalBaseline', 'vitalsMonitoring', 'interventions', 'dischargeReadiness'],
    sectionIcons: {
        arrivalBaseline: 'HeartPulse',
        vitalsMonitoring: 'Activity',
        interventions: 'Syringe',
        dischargeReadiness: 'ClipboardCheck',
    },
};

// ──────────────────────────────────────────────────────────────────────
// Template: SURGEON_OPERATIVE_NOTE v1
// Surgeon-owned intra/post-op documentation (Operative Note + Procedure Summary)
// ──────────────────────────────────────────────────────────────────────

const SURGEON_OPERATIVE_NOTE_SCHEMA = {
    type: 'object',
    sections: {
        header: {
            title: 'Case Header',
            fields: {
                diagnosisPreOp: { type: 'string', label: 'Pre-Operative Diagnosis', required: true },
                diagnosisPostOp: { type: 'string', label: 'Post-Operative Diagnosis', required: false },
                procedurePerformed: { type: 'string', label: 'Procedure Performed', required: true },
                side: { type: 'string', label: 'Laterality / Side', required: false },
                surgeonId: { type: 'string', label: 'Surgeon ID', required: true },
                surgeonName: { type: 'string', label: 'Surgeon Name', required: false },
                assistants: { type: 'array', label: 'Assistants', required: false, itemFields: {
                    userId: { type: 'string', label: 'User ID', required: false },
                    name: { type: 'string', label: 'Name', required: true },
                    role: { type: 'string', label: 'Role', required: false },
                }},
                anesthesiaType: { type: 'enum', label: 'Anesthesia Type', required: true, options: ['GENERAL', 'REGIONAL', 'LOCAL', 'SEDATION', 'TIVA', 'MAC'] },
            },
        },
        findingsAndSteps: {
            title: 'Findings & Operative Steps',
            fields: {
                findings: { type: 'string', label: 'Intra-Operative Findings', required: false },
                operativeSteps: { type: 'string', label: 'Operative Steps / Description', required: true, minLength: 20 },
            },
        },
        intraOpMetrics: {
            title: 'Intra-Operative Metrics',
            fields: {
                estimatedBloodLossMl: { type: 'number', label: 'Estimated Blood Loss (mL)', required: true, min: 0, max: 20000 },
                fluidsGivenMl: { type: 'number', label: 'Fluids Given (mL)', required: false, min: 0, max: 50000 },
                urineOutputMl: { type: 'number', label: 'Urine Output (mL)', required: false, min: 0, max: 10000 },
                tourniquetTimeMinutes: { type: 'number', label: 'Tourniquet Time (minutes)', required: false, min: 0, max: 300 },
            },
        },
        implantsUsed: {
            title: 'Implants Used',
            fields: {
                implantsUsed: { type: 'array', label: 'Implants / Prostheses', required: false, itemFields: {
                    name: { type: 'string', label: 'Implant Name', required: true },
                    manufacturer: { type: 'string', label: 'Manufacturer', required: false },
                    lotNumber: { type: 'string', label: 'Lot Number', required: false },
                    serialNumber: { type: 'string', label: 'Serial Number', required: false },
                    expiryDate: { type: 'string', label: 'Expiry Date', required: false },
                }},
            },
        },
        specimens: {
            title: 'Specimens',
            fields: {
                specimens: { type: 'array', label: 'Specimen Items', required: false, itemFields: {
                    type: { type: 'string', label: 'Specimen Type', required: true },
                    site: { type: 'string', label: 'Site', required: true },
                    destinationLab: { type: 'string', label: 'Destination Lab', required: true },
                    timeSent: { type: 'string', label: 'Time Sent', required: false, format: 'HH:MM' },
                }},
            },
        },
        complications: {
            title: 'Complications',
            fields: {
                complicationsOccurred: { type: 'boolean', label: 'Complications Occurred', required: true },
                complicationsDetails: { type: 'string', label: 'Complications Details', required: false },
            },
        },
        countsConfirmation: {
            title: 'Counts Confirmation',
            critical: true,
            fields: {
                countsCorrect: { type: 'boolean', label: 'All Counts Correct', required: true },
                countsExplanation: { type: 'string', label: 'Counts Explanation (if incorrect)', required: false },
            },
        },
        postOpPlan: {
            title: 'Post-Operative Plan',
            fields: {
                dressingInstructions: { type: 'string', label: 'Dressing Instructions', required: false },
                drainCare: { type: 'string', label: 'Drain Care', required: false },
                meds: { type: 'string', label: 'Medications / Prescriptions', required: false },
                followUpPlan: { type: 'string', label: 'Follow-Up Plan', required: false },
                dischargeDestination: { type: 'enum', label: 'Discharge Destination', required: false, options: ['WARD', 'HOME', 'ICU', 'HDU', 'OTHER'] },
            },
        },
    },
};

const SURGEON_OPERATIVE_NOTE_UI = {
    layout: 'accordion',
    sectionOrder: [
        'header',
        'findingsAndSteps',
        'intraOpMetrics',
        'implantsUsed',
        'specimens',
        'complications',
        'countsConfirmation',
        'postOpPlan',
    ],
    sectionIcons: {
        header: 'FileText',
        findingsAndSteps: 'Stethoscope',
        intraOpMetrics: 'Activity',
        implantsUsed: 'Package',
        specimens: 'FlaskConical',
        complications: 'AlertTriangle',
        countsConfirmation: 'Hash',
        postOpPlan: 'ClipboardCheck',
    },
};

async function main() {
    console.log('Seeding clinical form templates...');

    // ── NURSE_PREOP_WARD_CHECKLIST v1 ─────────────────────────────────
    const existingPreop = await db.clinicalFormTemplate.findUnique({
        where: { key_version: { key: 'NURSE_PREOP_WARD_CHECKLIST', version: 1 } },
    });

    if (existingPreop) {
        console.log('  ✓ NURSE_PREOP_WARD_CHECKLIST v1 already exists (id=%d), skipping.', existingPreop.id);
    } else {
        const template = await db.clinicalFormTemplate.create({
            data: {
                key: 'NURSE_PREOP_WARD_CHECKLIST',
                version: 1,
                title: 'Pre-Operative Ward Checklist',
                role_owner: Role.NURSE,
                schema_json: JSON.stringify(NURSE_PREOP_WARD_CHECKLIST_SCHEMA),
                ui_json: JSON.stringify(NURSE_PREOP_WARD_CHECKLIST_UI),
                is_active: true,
            },
        });
        console.log('  ✓ Created NURSE_PREOP_WARD_CHECKLIST v1 (id=%d)', template.id);
    }

    // ── NURSE_INTRAOP_RECORD v1 ───────────────────────────────────────
    const existingIntraop = await db.clinicalFormTemplate.findUnique({
        where: { key_version: { key: 'NURSE_INTRAOP_RECORD', version: 1 } },
    });

    if (existingIntraop) {
        console.log('  ✓ NURSE_INTRAOP_RECORD v1 already exists (id=%d), skipping.', existingIntraop.id);
    } else {
        const template = await db.clinicalFormTemplate.create({
            data: {
                key: 'NURSE_INTRAOP_RECORD',
                version: 1,
                title: 'Intra-Operative Nurse Record',
                role_owner: Role.NURSE,
                schema_json: JSON.stringify(NURSE_INTRAOP_RECORD_SCHEMA),
                ui_json: JSON.stringify(NURSE_INTRAOP_RECORD_UI),
                is_active: true,
            },
        });
        console.log('  ✓ Created NURSE_INTRAOP_RECORD v1 (id=%d)', template.id);
    }

    // ── NURSE_RECOVERY_RECORD v1 ─────────────────────────────────────
    const existingRecovery = await db.clinicalFormTemplate.findUnique({
        where: { key_version: { key: 'NURSE_RECOVERY_RECORD', version: 1 } },
    });

    if (existingRecovery) {
        console.log('  ✓ NURSE_RECOVERY_RECORD v1 already exists (id=%d), skipping.', existingRecovery.id);
    } else {
        const template = await db.clinicalFormTemplate.create({
            data: {
                key: 'NURSE_RECOVERY_RECORD',
                version: 1,
                title: 'Post-Operative Recovery / PACU Record',
                role_owner: Role.NURSE,
                schema_json: JSON.stringify(NURSE_RECOVERY_RECORD_SCHEMA),
                ui_json: JSON.stringify(NURSE_RECOVERY_RECORD_UI),
                is_active: true,
            },
        });
        console.log('  ✓ Created NURSE_RECOVERY_RECORD v1 (id=%d)', template.id);
    }

    // ── SURGEON_OPERATIVE_NOTE v1 ────────────────────────────────────
    const existingOpNote = await db.clinicalFormTemplate.findUnique({
        where: { key_version: { key: 'SURGEON_OPERATIVE_NOTE', version: 1 } },
    });

    if (existingOpNote) {
        console.log('  ✓ SURGEON_OPERATIVE_NOTE v1 already exists (id=%d), skipping.', existingOpNote.id);
    } else {
        const template = await db.clinicalFormTemplate.create({
            data: {
                key: 'SURGEON_OPERATIVE_NOTE',
                version: 1,
                title: 'Surgeon Operative Note & Procedure Summary',
                role_owner: Role.DOCTOR,
                schema_json: JSON.stringify(SURGEON_OPERATIVE_NOTE_SCHEMA),
                ui_json: JSON.stringify(SURGEON_OPERATIVE_NOTE_UI),
                is_active: true,
            },
        });
        console.log('  ✓ Created SURGEON_OPERATIVE_NOTE v1 (id=%d)', template.id);
    }

    console.log('Done.');
}

main()
    .catch((e) => {
        console.error('Seed error:', e);
        process.exit(1);
    })
    .finally(() => db.$disconnect());
