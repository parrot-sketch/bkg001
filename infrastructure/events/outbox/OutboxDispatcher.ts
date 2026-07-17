import type { OutboxEvent } from '@prisma/client';
import {
  DomainEvent,
  EventPublisher,
  deserializeEvent,
} from '@/domain/events/DomainEvent';
import { logEvent, logEventRaw } from '../EventLogger';
import { IOutboxEventRepository } from './IOutboxEventRepository';

export interface OutboxDispatcherOptions {
  /** Max rows to process per tick. */
  batchSize?: number;
  /** Max retry attempts before a row becomes a dead letter. */
  maxRetries?: number;
  /** Base backoff in ms for exponential retry (1s -> 2s -> 4s ...). */
  baseBackoffMs?: number;
  /** Interval between ticks when running as a background loop. */
  pollIntervalMs?: number;
}

/**
 * OutboxDispatcher — background publisher for the Transactional Outbox.
 *
 * Responsibilities (Deliverable 5):
 *   - poll dispatchable outbox rows (PENDING + retryable FAILED)
 *   - atomically claim each (PROCESSING) to prevent double dispatch
 *   - deserialize the envelope and publish it to the EventBus
 *   - mark PROCESSED on success, FAILED (with retry) on error
 *   - exponential backoff between retries (Rule 12)
 *   - dead-letter after maxRetries (row stays FAILED, logged DEAD_LETTER)
 *   - structured logging of every transition (Deliverable 7)
 *
 * Works both as a long-running loop (start/stop) and on-demand (runOnce) so it
 * functions in serverless environments where no persistent worker exists.
 */
export class OutboxDispatcher {
  private readonly batchSize: number;
  private readonly maxRetries: number;
  private readonly baseBackoffMs: number;
  private readonly pollIntervalMs: number;

  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false; // guards against overlapping ticks

  constructor(
    private readonly repo: IOutboxEventRepository,
    private readonly publisher: EventPublisher,
    options: OutboxDispatcherOptions = {},
  ) {
    this.batchSize = options.batchSize ?? 50;
    this.maxRetries = options.maxRetries ?? 5;
    this.baseBackoffMs = options.baseBackoffMs ?? 1000;
    this.pollIntervalMs = options.pollIntervalMs ?? 5000;
  }

  /** Start the background polling loop. Safe to call multiple times. */
  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.runOnce();
    }, this.pollIntervalMs);
    // Do not keep the Node process alive solely for this timer.
    if (typeof this.timer === 'object' && 'unref' in this.timer) {
      (this.timer as { unref?: () => void }).unref?.();
    }
  }

  /** Stop the background polling loop. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Process one batch. Returns a small summary (useful for tests / manual
   * trigger endpoints). Never throws — all errors are contained per-row.
   */
  async runOnce(): Promise<{ processed: number; failed: number; skipped: number }> {
    if (this.running) return { processed: 0, failed: 0, skipped: 0 };
    this.running = true;

    let processed = 0;
    let failed = 0;
    let skipped = 0;

    try {
      const candidates = await this.collectCandidates();
      for (const row of candidates) {
        const outcome = await this.dispatchRow(row);
        if (outcome === 'processed') processed++;
        else if (outcome === 'failed') failed++;
        else skipped++;
      }
    } catch (error) {
      logEventRaw({
        event: 'outbox.dispatch',
        status: 'FAILED',
        error: error instanceof Error ? error.message : String(error),
        detail: 'dispatcher tick error',
      });
    } finally {
      this.running = false;
    }

    return { processed, failed, skipped };
  }

  private async collectCandidates(): Promise<OutboxEvent[]> {
    const pending = await this.repo.findPending(this.batchSize);
    const remaining = this.batchSize - pending.length;

    let retryable: OutboxEvent[] = [];
    if (remaining > 0) {
      const failedRows = await this.repo.findRetryable(remaining, this.maxRetries);
      // Apply exponential backoff based on last-attempt time (updated_at).
      const now = Date.now();
      retryable = failedRows.filter((row) => {
        const backoff = this.baseBackoffMs * Math.pow(2, row.retry_count);
        const lastAttempt = new Date(row.updated_at).getTime();
        return now - lastAttempt >= backoff;
      });
    }

    return [...pending, ...retryable];
  }

  private async dispatchRow(
    row: OutboxEvent,
  ): Promise<'processed' | 'failed' | 'skipped'> {
    // Claim atomically — if we don't win the claim, another worker owns it.
    const claimed = await this.repo.claim(row.id);
    if (!claimed) return 'skipped';

    let event: DomainEvent<unknown>;
    try {
      event = deserializeEvent(row.payload);
    } catch (error) {
      const message = `Malformed payload: ${
        error instanceof Error ? error.message : String(error)
      }`;
      await this.repo.markFailed(row.id, message);
      logEventRaw({
        event: row.type,
        status: this.isDeadLetter(row) ? 'DEAD_LETTER' : 'FAILED',
        eventId: row.id,
        retryCount: row.retry_count + 1,
        error: message,
      });
      return 'failed';
    }

    logEvent(event, 'DISPATCHING', { retryCount: row.retry_count });

    try {
      await this.publisher.publish(event);
      await this.repo.markProcessed(row.id);
      logEvent(event, 'PROCESSED', { retryCount: row.retry_count });
      return 'processed';
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.repo.markFailed(row.id, message);
      const dead = this.isDeadLetter(row);
      logEvent(event, dead ? 'DEAD_LETTER' : 'RETRY', {
        retryCount: row.retry_count + 1,
        error: message,
      });
      return 'failed';
    }
  }

  private isDeadLetter(row: OutboxEvent): boolean {
    // After this failed attempt, retry_count becomes row.retry_count + 1.
    return row.retry_count + 1 >= this.maxRetries;
  }
}
