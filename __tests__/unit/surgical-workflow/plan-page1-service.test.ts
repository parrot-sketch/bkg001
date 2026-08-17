import { describe, it, expect } from 'vitest';
import { normalizePage1TeamInput } from '@/application/services/SurgicalCasePlanPage1Service';

describe('SurgicalCasePlanPage1Service.normalizePage1TeamInput', () => {
  it('prefers explicit primarySurgeonId/assistantSurgeonIds over legacy surgeonIds', () => {
    const out = normalizePage1TeamInput({
      primarySurgeonId: 'doc-primary',
      assistantSurgeonIds: ['doc-a1', 'doc-a2'],
      surgeonIds: ['legacy-primary', 'legacy-a1'],
      anesthesiologistUserId: 'user-an',
      scrubNurseUserId: 'user-sn',
      circulatingNurseUserId: 'user-cn',
      customPrimarySurgeonName: null,
      customAssistantSurgeonNames: [],
      customProcedureCategory: null,
      customProcedureNames: [],
      customAnesthesiologistName: null,
      customScrubNurseName: null,
      customCirculatingNurseName: null,
    });

    expect(out.primarySurgeonDoctorId).toBe('doc-primary');
    expect(out.assistantSurgeonDoctorIds).toEqual(['doc-a1', 'doc-a2']);
    expect(out.surgeonDoctorIds).toEqual(['doc-primary', 'doc-a1', 'doc-a2']);
    expect(out.anesthesiologistUserId).toBe('user-an');
    expect(out.scrubNurseUserId).toBe('user-sn');
    expect(out.circulatingNurseUserId).toBe('user-cn');
    expect(out.customPrimarySurgeonName).toBeNull();
    expect(out.customAssistantSurgeonNames).toEqual([]);
    expect(out.customProcedureCategory).toBeNull();
    expect(out.customProcedureNames).toEqual([]);
    expect(out.customAnesthesiologistName).toBeNull();
    expect(out.customScrubNurseName).toBeNull();
    expect(out.customCirculatingNurseName).toBeNull();
  });

  it('falls back to legacy surgeonIds when explicit fields are missing', () => {
    const out = normalizePage1TeamInput({
      surgeonIds: ['doc-primary', 'doc-a1'],
      anesthesiologistUserId: '   ',
      customAnesthesiologistName: '  ',
      customScrubNurseName: '',
      customCirculatingNurseName: undefined,
      customPrimarySurgeonName: '',
      customAssistantSurgeonNames: [],
      customProcedureCategory: '',
      customProcedureNames: [],
    });

    expect(out.primarySurgeonDoctorId).toBe('doc-primary');
    expect(out.assistantSurgeonDoctorIds).toEqual(['doc-a1']);
    expect(out.surgeonDoctorIds).toEqual(['doc-primary', 'doc-a1']);
    expect(out.anesthesiologistUserId).toBeNull();
    expect(out.scrubNurseUserId).toBeNull();
    expect(out.circulatingNurseUserId).toBeNull();
    expect(out.customPrimarySurgeonName).toBeNull();
    expect(out.customAssistantSurgeonNames).toEqual([]);
    expect(out.customProcedureCategory).toBeNull();
    expect(out.customProcedureNames).toEqual([]);
  });

  it('extracts custom team member names', () => {
    const out = normalizePage1TeamInput({
      primarySurgeonId: 'doc-primary',
      assistantSurgeonIds: [],
      anesthesiologistUserId: null,
      scrubNurseUserId: null,
      circulatingNurseUserId: null,
      customPrimarySurgeonName: 'Dr. External Surgeon',
      customAssistantSurgeonNames: ['Dr. External Assistant'],
      customProcedureCategory: 'Custom Category',
      customProcedureNames: ['Custom Procedure X'],
      customAnesthesiologistName: 'Dr. Custom Anesth',
      customScrubNurseName: 'Nurse Custom Scrub',
      customCirculatingNurseName: 'Nurse Custom Circ',
    });

    expect(out.customPrimarySurgeonName).toBe('Dr. External Surgeon');
    expect(out.customAssistantSurgeonNames).toEqual(['Dr. External Assistant']);
    expect(out.customProcedureCategory).toBe('Custom Category');
    expect(out.customProcedureNames).toEqual(['Custom Procedure X']);
    expect(out.customAnesthesiologistName).toBe('Dr. Custom Anesth');
    expect(out.customScrubNurseName).toBe('Nurse Custom Scrub');
    expect(out.customCirculatingNurseName).toBe('Nurse Custom Circ');
  });
});

