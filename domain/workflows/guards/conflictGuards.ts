/**
 * Guard implementations for conflict resolution transitions.
 *
 * G-057: ServerDataAvailable
 * G-058: AuditLogged
 * G-059: LocalNotesPresent
 * G-060: LocalVersionTracked
 * G-061: AuditLogged
 * G-062: UserExplicitDismiss
 * G-063: DirtyFlagMaintained
 */

import type { GuardContext } from '../GuardContext';
import type { GuardResult } from '../GuardResult';

export function G_057_ServerDataAvailable(ctx: GuardContext): GuardResult {
  const refetchedNotes = (ctx.metadata.refetchedNotes as { readonly structured?: Record<string, unknown> } | null | undefined) ?? ctx.notes;
  const structured = (refetchedNotes as any)?.structured as Record<string, unknown> | undefined;
  const hasContent = refetchedNotes !== null && refetchedNotes !== undefined && structured !== undefined;
  return hasContent
    ? { passed: true }
    : { passed: false, guardId: 'G-057', reason: 'Server notes not available after refetch', clinicalRisk: 'medium' };
}

export function G_058_AuditLogged(ctx: GuardContext): GuardResult {
  const logged = (ctx.metadata.auditLogged as boolean | undefined) === true;
  return logged
    ? { passed: true }
    : { passed: false, guardId: 'G-058', reason: 'Resolution event not recorded', clinicalRisk: 'low' };
}

export function G_059_LocalNotesPresent(ctx: GuardContext): GuardResult {
  const valid = ctx.notes !== null && ctx.notes !== undefined;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-059', reason: 'Local notes object is missing', clinicalRisk: 'medium' };
}

export function G_060_LocalVersionTracked(ctx: GuardContext): GuardResult {
  const valid = ctx.version !== null && ctx.version !== undefined && ctx.version !== '';
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-060', reason: 'Local notes version not tracked for force-save', clinicalRisk: 'medium' };
}

export function G_061_AuditLogged(ctx: GuardContext): GuardResult {
  const logged = (ctx.metadata.auditLogged as boolean | undefined) === true;
  return logged
    ? { passed: true }
    : { passed: false, guardId: 'G-061', reason: 'Resolution event not recorded', clinicalRisk: 'low' };
}

export function G_062_UserExplicitDismiss(ctx: GuardContext): GuardResult {
  const valid = (ctx.metadata.userInitiated as boolean | undefined) === true;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-062', reason: 'Dismiss was not user-initiated', clinicalRisk: 'low' };
}

export function G_063_DirtyFlagMaintained(ctx: GuardContext): GuardResult {
  const valid = ctx.isDirty;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-063', reason: 'Local notes must remain dirty after dismiss', clinicalRisk: 'low' };
}
