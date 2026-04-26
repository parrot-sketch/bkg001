import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import { ClinicalFormStatus } from '@prisma/client';
import {
  TEMPLATE_KEY,
  TEMPLATE_VERSION,
  nursePreopWardChecklistDraftSchema,
  normalizeLegacyChecklistData,
  type NursePreopWardChecklistDraft,
} from '@/domain/clinical-forms/NursePreopWardChecklist';
import { computeSignatureProof } from '@/lib/crypto/signatureProof';
import { GateBlockedError } from '@/application/errors/GateBlockedError';

type SignatureRole = 'PREPARED_BY' | 'RECEIVED_BY' | 'HANDED_OVER_BY';

function getClientIp(request: NextRequest): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || undefined;
  return request.headers.get('x-real-ip') || undefined;
}

function makeServerSignatureSvgDataUrl(name: string, signedAtIso: string): string {
  const safeName = name.replace(/[<>&"]/g, '');
  const date = signedAtIso.slice(0, 10);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="220" viewBox="0 0 720 220">
  <rect width="720" height="220" fill="#ffffff"/>
  <text x="30" y="120" font-family="cursive" font-size="54" fill="#0f172a">${safeName}</text>
  <text x="30" y="170" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="16" fill="#64748b">Digitally signed • ${date}</text>
  <line x1="30" y1="185" x2="690" y2="185" stroke="#e2e8f0" stroke-width="2"/>
</svg>`;
  // encodeURIComponent is sufficient for data:image/svg+xml
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function POST(request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  try {
    const { caseId } = await context.params;
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    if (authResult.user.role !== Role.NURSE && authResult.user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
    }

    const { role, signerName, signatureDataUrl, draftData } = body as Record<string, unknown>;
    if (role !== 'PREPARED_BY' && role !== 'RECEIVED_BY' && role !== 'HANDED_OVER_BY') {
      return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
    }
    if (typeof signerName !== 'string' || signerName.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Signer name is required' }, { status: 400 });
    }
    const incomingSig = typeof signatureDataUrl === 'string' ? signatureDataUrl : '';

    const parsedDraft = nursePreopWardChecklistDraftSchema.safeParse(draftData);
    if (!parsedDraft.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: parsedDraft.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
        { status: 400 },
      );
    }

    const existing = await db.clinicalFormResponse.findUnique({
      where: {
        template_key_template_version_surgical_case_id: {
          template_key: TEMPLATE_KEY,
          template_version: TEMPLATE_VERSION,
          surgical_case_id: caseId,
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Checklist not found' }, { status: 404 });
    }
    if (existing.status === ClinicalFormStatus.FINAL) {
      return NextResponse.json(
        { success: false, error: 'Checklist is finalized. Start an amendment to update signatures.' },
        { status: 409 },
      );
    }

    const normalized = normalizeLegacyChecklistData(parsedDraft.data);
    const signedAt = new Date().toISOString();
    const userAgent = request.headers.get('user-agent') || undefined;
    const ip = getClientIp(request);
    const signerUserId = authResult.user.userId;

    const signatureValue = {
      signerName: signerName.trim(),
      signatureDataUrl: incomingSig && incomingSig.startsWith('data:image/')
        ? incomingSig
        : makeServerSignatureSvgDataUrl(signerName.trim(), signedAt),
      signedAt,
      signerUserId,
    };

    const nextDraft: NursePreopWardChecklistDraft = {
      ...normalized,
      handover: {
        ...(normalized.handover ?? {}),
        ...(role === 'PREPARED_BY'
          ? { preparedByName: signatureValue.signerName, preparedBySignature: signatureValue }
          : role === 'RECEIVED_BY'
            ? { receivedByName: signatureValue.signerName, receivedBySignature: signatureValue }
            : { handedOverByName: signatureValue.signerName, handedOverBySignature: signatureValue }),
      },
    };

    const proof = computeSignatureProof({
      payload: {
        caseId,
        formResponseId: existing.id,
        role,
        data: nextDraft,
      },
      signedByUserId: signerUserId,
      signedAtIso: signedAt,
      userAgent,
      ip,
    });

    // Attach tamper-evident proof inside the signature object too.
    if (role === 'PREPARED_BY' && nextDraft.handover?.preparedBySignature) {
      nextDraft.handover.preparedBySignature = { ...nextDraft.handover.preparedBySignature, proof };
    }
    if (role === 'RECEIVED_BY' && nextDraft.handover?.receivedBySignature) {
      nextDraft.handover.receivedBySignature = { ...nextDraft.handover.receivedBySignature, proof };
    }
    if (role === 'HANDED_OVER_BY' && nextDraft.handover?.handedOverBySignature) {
      nextDraft.handover.handedOverBySignature = { ...nextDraft.handover.handedOverBySignature, proof };
    }

    const updated = await db.clinicalFormResponse.update({
      where: { id: existing.id },
      data: {
        data_json: JSON.stringify(nextDraft),
        updated_by_user_id: signerUserId,
      },
    });

    // Keep billing/stock integration cohesive: applying usage events is idempotent.
    try {
      const { getClinicalInventoryIntegrationService } = await import('@/lib/factories/clinicalInventoryIntegrationFactory');
      const integrationService = getClinicalInventoryIntegrationService();
      const events = await integrationService.extractUsageEventsFromPreop(caseId, updated.id, JSON.stringify(nextDraft));
      if (events.length > 0) {
        await integrationService.applyUsageEvents(caseId, events, { userId: signerUserId });
      }
    } catch (error) {
      if (error instanceof GateBlockedError) {
        return NextResponse.json(
          { success: false, error: error.message, code: 'GATE_BLOCKED', metadata: error.metadata },
          { status: 422 },
        );
      }
      console.error('[API] Pre-op signature integration error:', error);
    }

    await db.clinicalAuditEvent.create({
      data: {
        actor_user_id: signerUserId,
        action_type: 'PREOP_CHECKLIST_SIGNATURE_CAPTURED',
        entity_type: 'ClinicalFormResponse',
        entity_id: updated.id,
        metadata: JSON.stringify({
          surgicalCaseId: caseId,
          role,
          signatureHash: proof.hash,
          algorithm: proof.algorithm,
          signedAt,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        role: role as SignatureRole,
        proof,
        form: {
          id: updated.id,
          status: updated.status,
          data: nextDraft,
        },
      },
    });
  } catch (error) {
    console.error('[API] POST preop-ward signature error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
