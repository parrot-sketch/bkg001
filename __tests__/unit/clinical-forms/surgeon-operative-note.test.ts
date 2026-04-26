import { describe, it, expect } from 'vitest';
import {
  buildSurgeonOperativeNoteFinalSchema,
  surgeonOperativeNoteDraftSchema,
} from '@/domain/clinical-forms/SurgeonOperativeNote';

describe('SurgeonOperativeNote schema', () => {
  it('accepts draft with empty sections', () => {
    const parsed = surgeonOperativeNoteDraftSchema.safeParse({});
    expect(parsed.success).toBe(true);
  });

  it('treats HTML operative steps as meaningful via text length', () => {
    const schema = buildSurgeonOperativeNoteFinalSchema(false);
    const result = schema.safeParse({
      header: {
        diagnosisPreOp: 'Pre-op dx',
        diagnosisPostOp: '',
        procedurePerformed: 'Procedure',
        side: '',
        surgeonId: 'doc-1',
        surgeonName: 'Dr. A',
        assistants: [],
        anesthesiologistId: '',
        anesthesiologistName: '',
        anesthesiaType: 'GENERAL',
      },
      findingsAndSteps: {
        findings: '',
        operativeSteps: '<p>Skin incision and dissection performed carefully.</p>',
      },
      operativeRecord: {
        operationRecord: '<p>Operative record details.</p>',
        postOperativeInstructions: '<p>Keep dressing dry. Follow up in 7 days.</p>',
        surgeonSignaturePng: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
      },
      intraOpMetrics: {
        estimatedBloodLossMl: 0,
      },
      implantsUsed: { implantsUsed: [] },
      specimens: { specimens: [] },
      complications: { complicationsOccurred: false, complicationsDetails: '' },
      countsConfirmation: { countsCorrect: true, countsExplanation: '' },
      postOpPlan: {},
    });

    expect(result.success).toBe(true);
  });

  it('fails finalization when operativeRecord signature is missing', () => {
    const schema = buildSurgeonOperativeNoteFinalSchema(false);
    const result = schema.safeParse({
      header: {
        diagnosisPreOp: 'Pre-op dx',
        diagnosisPostOp: '',
        procedurePerformed: 'Procedure',
        side: '',
        surgeonId: 'doc-1',
        surgeonName: 'Dr. A',
        assistants: [],
        anesthesiologistId: '',
        anesthesiologistName: '',
        anesthesiaType: 'GENERAL',
      },
      findingsAndSteps: {
        findings: '',
        operativeSteps: 'This is a meaningful operative steps narrative with sufficient length.',
      },
      operativeRecord: {
        operationRecord: 'Operative record details.',
        postOperativeInstructions: 'Follow up in 7 days.',
        surgeonSignaturePng: '',
      },
      intraOpMetrics: {
        estimatedBloodLossMl: 0,
      },
      implantsUsed: { implantsUsed: [] },
      specimens: { specimens: [] },
      complications: { complicationsOccurred: false, complicationsDetails: '' },
      countsConfirmation: { countsCorrect: true, countsExplanation: '' },
      postOpPlan: {},
    });

    expect(result.success).toBe(false);
  });
});
