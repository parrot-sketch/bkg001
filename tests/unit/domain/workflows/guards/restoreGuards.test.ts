import { describe, it, expect } from 'vitest';
import {
  G_064_DraftTimestampValid,
  G_065_DraftTimestampNewer,
  G_066_DraftStructureValid,
  G_067_DraftTimestampOlderOrEqual,
  G_068_DraftCorruptOrMissing,
} from '@/domain/workflows/guards/restoreGuards';
import { buildGuardContext } from '../buildGuardContext';

describe('restoreGuards', () => {
  const baseCtx = buildGuardContext({
    hasLocalDraft: true,
    localDraftTimestamp: Date.now(),
    notes: { structured: { chiefComplaint: 'Headache' } },
    metadata: {},
  });

  describe('G-064 DraftTimestampValid', () => {
    it('passes with valid timestamp', () => {
      expect(G_064_DraftTimestampValid(baseCtx).passed).toBe(true);
    });
    it('fails with null timestamp', () => {
      const ctx = buildGuardContext({ localDraftTimestamp: null, metadata: { draftTimestamp: null } });
      expect(G_064_DraftTimestampValid(ctx).passed).toBe(false);
      expect(G_064_DraftTimestampValid(ctx).clinicalRisk).toBe('low');
    });
    it('fails with zero timestamp', () => {
      const ctx = buildGuardContext({ localDraftTimestamp: 0, metadata: { draftTimestamp: 0 } });
      expect(G_064_DraftTimestampValid(ctx).passed).toBe(false);
    });
  });

  describe('G-065 DraftTimestampNewer', () => {
    it('passes when draft is newer', () => {
      const now = Date.now();
      const ctx = buildGuardContext({ localDraftTimestamp: now, lastSavedAt: now - 1000 });
      expect(G_065_DraftTimestampNewer(ctx).passed).toBe(true);
    });
    it('passes when timestamps missing', () => {
      const ctx = buildGuardContext({ localDraftTimestamp: undefined, lastSavedAt: undefined });
      expect(G_065_DraftTimestampNewer(ctx).passed).toBe(true);
    });
    it('fails when draft is older', () => {
      const now = Date.now();
      const ctx = buildGuardContext({ localDraftTimestamp: now - 1000, lastSavedAt: now });
      expect(G_065_DraftTimestampNewer(ctx).passed).toBe(false);
      expect(G_065_DraftTimestampNewer(ctx).clinicalRisk).toBe('low');
    });
  });

  describe('G-066 DraftStructureValid', () => {
    it('passes with structured notes', () => {
      expect(G_066_DraftStructureValid(baseCtx).passed).toBe(true);
    });
    it('passes with rawText in notes', () => {
      const ctx = buildGuardContext({ notes: { rawText: 'Some text' } });
      expect(G_066_DraftStructureValid(ctx).passed).toBe(true);
    });
    it('passes with draftStructured in metadata', () => {
      const ctx = buildGuardContext({ notes: {}, metadata: { draftStructured: { chiefComplaint: 'Headache' } } });
      expect(G_066_DraftStructureValid(ctx).passed).toBe(true);
    });
    it('fails with empty notes and no metadata', () => {
      const ctx = buildGuardContext({ notes: {} });
      expect(G_066_DraftStructureValid(ctx).passed).toBe(false);
      expect(G_066_DraftStructureValid(ctx).clinicalRisk).toBe('low');
    });
  });

  describe('G-067 DraftTimestampOlderOrEqual', () => {
    it('passes when draft is older', () => {
      const now = Date.now();
      const ctx = buildGuardContext({ localDraftTimestamp: now - 1000, lastSavedAt: now });
      expect(G_067_DraftTimestampOlderOrEqual(ctx).passed).toBe(true);
    });
    it('passes when timestamps missing', () => {
      expect(G_067_DraftTimestampOlderOrEqual(baseCtx).passed).toBe(true);
    });
    it('fails when draft is newer', () => {
      const now = Date.now();
      const ctx = buildGuardContext({ localDraftTimestamp: now, lastSavedAt: now - 1000 });
      expect(G_067_DraftTimestampOlderOrEqual(ctx).passed).toBe(false);
      expect(G_067_DraftTimestampOlderOrEqual(ctx).clinicalRisk).toBe('low');
    });
  });

  describe('G-068 DraftCorruptOrMissing', () => {
    it('passes when no local draft', () => {
      const ctx = buildGuardContext({ hasLocalDraft: false });
      expect(G_068_DraftCorruptOrMissing(ctx).passed).toBe(true);
    });
    it('passes with valid draft timestamp', () => {
      expect(G_068_DraftCorruptOrMissing(baseCtx).passed).toBe(true);
    });
    it('fails with null timestamp', () => {
      const ctx = buildGuardContext({ hasLocalDraft: true, localDraftTimestamp: null });
      expect(G_068_DraftCorruptOrMissing(ctx).passed).toBe(false);
      expect(G_068_DraftCorruptOrMissing(ctx).clinicalRisk).toBe('low');
    });
  });
});
