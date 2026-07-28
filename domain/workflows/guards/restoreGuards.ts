/**
 * Guard implementations for draft restore transitions.
 *
 * G-064: DraftTimestampValid
 * G-065: DraftTimestampNewer
 * G-066: DraftStructureValid
 * G-067: DraftTimestampOlderOrEqual
 * G-068: DraftCorruptOrMissing
 */

import type { GuardContext } from '../GuardContext';
import type { GuardResult } from '../GuardResult';

export function G_064_DraftTimestampValid(ctx: GuardContext): GuardResult {
  const ts = ctx.localDraftTimestamp ?? ctx.metadata.draftTimestamp as number | undefined;
  const valid = ts !== undefined && ts !== null && !Number.isNaN(ts) && ts > 0;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-064', reason: 'Draft timestamp is missing or invalid', clinicalRisk: 'low' };
}

export function G_065_DraftTimestampNewer(ctx: GuardContext): GuardResult {
  const draftTs = ctx.localDraftTimestamp ?? (ctx.metadata.draftTimestamp as number | undefined);
  const serverTs = ctx.lastSavedAt ?? (ctx.metadata.serverUpdatedAt as number | undefined);
  if (draftTs === undefined || serverTs === undefined) {
    return { passed: true };
  }
  const valid = draftTs > serverTs;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-065', reason: 'Draft timestamp is not newer than server', clinicalRisk: 'low' };
}

export function G_066_DraftStructureValid(ctx: GuardContext): GuardResult {
  const hasRawText = !!(ctx.notes as { rawText?: string })?.rawText;
  const hasStructured = !!(ctx.metadata.draftStructured as Record<string, unknown> | undefined);
  const valid = hasRawText || hasStructured || Object.keys(ctx.notes).length > 0;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-066', reason: 'Draft structure is missing or corrupt', clinicalRisk: 'low' };
}

export function G_067_DraftTimestampOlderOrEqual(ctx: GuardContext): GuardResult {
  const draftTs = ctx.localDraftTimestamp ?? (ctx.metadata.draftTimestamp as number | undefined);
  const serverTs = ctx.lastSavedAt ?? (ctx.metadata.serverUpdatedAt as number | undefined);
  if (draftTs === undefined || serverTs === undefined) {
    return { passed: true };
  }
  const valid = draftTs <= serverTs;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-067', reason: 'Draft timestamp is newer than server (should not discard)', clinicalRisk: 'low' };
}

export function G_068_DraftCorruptOrMissing(ctx: GuardContext): GuardResult {
  const valid = !ctx.hasLocalDraft || (ctx.localDraftTimestamp !== null && ctx.localDraftTimestamp > 0);
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-068', reason: 'No draft found or draft is corrupt', clinicalRisk: 'low' };
}
