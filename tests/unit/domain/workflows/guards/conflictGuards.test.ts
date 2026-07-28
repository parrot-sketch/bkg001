import { describe, it, expect } from 'vitest';
import {
  G_057_ServerDataAvailable,
  G_058_AuditLogged as G_058_ServerAuditLogged,
  G_059_LocalNotesPresent,
  G_060_LocalVersionTracked,
  G_061_AuditLogged as G_061_LocalAuditLogged,
  G_062_UserExplicitDismiss,
  G_063_DirtyFlagMaintained,
} from '@/domain/workflows/guards/conflictGuards';
import { buildGuardContext } from '../buildGuardContext';

describe('conflictGuards', () => {
  const baseCtx = buildGuardContext({ documentationWorkflowState: 'Conflict', notes: { structured: { chiefComplaint: 'Headache' } } });

  describe('G-057 ServerDataAvailable', () => {
    it('passes with non-empty notes', () => {
      expect(G_057_ServerDataAvailable(baseCtx).passed).toBe(true);
    });
    it('passes when refetchedNotes provided in metadata', () => {
      const ctx = buildGuardContext({ notes: {}, metadata: { refetchedNotes: { structured: {} } } });
      expect(G_057_ServerDataAvailable(ctx).passed).toBe(true);
    });
    it('fails with empty notes and no refetch', () => {
      const ctx = buildGuardContext({ notes: {} });
      expect(G_057_ServerDataAvailable(ctx).passed).toBe(false);
      expect(G_057_ServerDataAvailable(ctx).clinicalRisk).toBe('medium');
    });
  });

  describe('G-058 AuditLogged', () => {
    it('passes when audit is logged', () => {
      const ctx = buildGuardContext({ metadata: { auditLogged: true } });
      expect(G_058_ServerAuditLogged(ctx).passed).toBe(true);
    });
    it('fails when audit not logged', () => {
      expect(G_058_ServerAuditLogged(baseCtx).passed).toBe(false);
      expect(G_058_ServerAuditLogged(baseCtx).clinicalRisk).toBe('low');
    });
  });

  describe('G-059 LocalNotesPresent', () => {
    it('passes with notes present', () => {
      expect(G_059_LocalNotesPresent(baseCtx).passed).toBe(true);
    });
    it('fails with null notes', () => {
      const ctx = buildGuardContext({ notes: null as any });
      expect(G_059_LocalNotesPresent(ctx).passed).toBe(false);
      expect(G_059_LocalNotesPresent(ctx).clinicalRisk).toBe('medium');
    });
  });

  describe('G-060 LocalVersionTracked', () => {
    it('passes with version present', () => {
      expect(G_060_LocalVersionTracked(baseCtx).passed).toBe(true);
    });
    it('fails with null version', () => {
      const ctx = buildGuardContext({ version: null });
      expect(G_060_LocalVersionTracked(ctx).passed).toBe(false);
      expect(G_060_LocalVersionTracked(ctx).clinicalRisk).toBe('medium');
    });
  });

  describe('G-061 AuditLogged', () => {
    it('passes when audit is logged', () => {
      const ctx = buildGuardContext({ metadata: { auditLogged: true } });
      expect(G_061_LocalAuditLogged(ctx).passed).toBe(true);
    });
    it('fails when audit not logged', () => {
      expect(G_061_LocalAuditLogged(baseCtx).passed).toBe(false);
      expect(G_061_LocalAuditLogged(baseCtx).clinicalRisk).toBe('low');
    });
  });

  describe('G-062 UserExplicitDismiss', () => {
    it('passes when user-initiated', () => {
      const ctx = buildGuardContext({ metadata: { userInitiated: true } });
      expect(G_062_UserExplicitDismiss(ctx).passed).toBe(true);
    });
    it('fails when not user-initiated', () => {
      expect(G_062_UserExplicitDismiss(baseCtx).passed).toBe(false);
      expect(G_062_UserExplicitDismiss(baseCtx).clinicalRisk).toBe('low');
    });
  });

  describe('G-063 DirtyFlagMaintained', () => {
    it('passes when dirty', () => {
      const ctx = buildGuardContext({ isDirty: true });
      expect(G_063_DirtyFlagMaintained(ctx).passed).toBe(true);
    });
    it('fails when not dirty', () => {
      expect(G_063_DirtyFlagMaintained(baseCtx).passed).toBe(false);
      expect(G_063_DirtyFlagMaintained(baseCtx).clinicalRisk).toBe('low');
    });
  });
});
