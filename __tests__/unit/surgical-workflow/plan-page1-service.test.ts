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
    });

    expect(out.primarySurgeonDoctorId).toBe('doc-primary');
    expect(out.assistantSurgeonDoctorIds).toEqual(['doc-a1', 'doc-a2']);
    expect(out.surgeonDoctorIds).toEqual(['doc-primary', 'doc-a1', 'doc-a2']);
    expect(out.anesthesiologistUserId).toBe('user-an');
    expect(out.scrubNurseUserId).toBe('user-sn');
    expect(out.circulatingNurseUserId).toBe('user-cn');
  });

  it('falls back to legacy surgeonIds when explicit fields are missing', () => {
    const out = normalizePage1TeamInput({
      surgeonIds: ['doc-primary', 'doc-a1'],
      anesthesiologistUserId: '   ',
    });

    expect(out.primarySurgeonDoctorId).toBe('doc-primary');
    expect(out.assistantSurgeonDoctorIds).toEqual(['doc-a1']);
    expect(out.surgeonDoctorIds).toEqual(['doc-primary', 'doc-a1']);
    expect(out.anesthesiologistUserId).toBeNull();
  });
});

