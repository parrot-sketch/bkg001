import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { outboxDispatcher, outboxRepository } from '@/lib/events';
import { IntakeError } from '@/domain/errors/IntakeErrors';
import { OutboxStatus } from '@prisma/client';

/**
 * Internal operations endpoint for the Transactional Outbox.
 *
 *   GET  /api/internal/outbox/dispatch  -> outbox health snapshot (counts)
 *   POST /api/internal/outbox/dispatch  -> run one dispatch tick, return summary
 *
 * ADMIN-only. This does not change any business workflow — it only lets an
 * operator observe and manually pump the event pipeline.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, ['ADMIN']);
    const [pending, processing, processed, failed] = await Promise.all([
      outboxRepository.countByStatus(OutboxStatus.PENDING),
      outboxRepository.countByStatus(OutboxStatus.PROCESSING),
      outboxRepository.countByStatus(OutboxStatus.PROCESSED),
      outboxRepository.countByStatus(OutboxStatus.FAILED),
    ]);
    return NextResponse.json({ pending, processing, processed, failed });
  } catch (error) {
    return handleError(error, 'OutboxHealth');
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, ['ADMIN']);
    const summary = await outboxDispatcher.runOnce();
    return NextResponse.json(summary);
  } catch (error) {
    return handleError(error, 'OutboxDispatch');
  }
}

function handleError(error: unknown, tag: string): NextResponse {
  if (error instanceof IntakeError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode },
    );
  }
  console.error(`[${tag}]`, error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
