import type { OutboxEvent, OutboxStatus, Prisma, PrismaClient } from '@prisma/client';

/**
 * A Prisma client OR an interactive transaction client. Accepting both lets the
 * outbox row be written inside the SAME transaction as the aggregate change
 * (true transactional outbox) when a caller provides a `$transaction` client,
 * while still working with the plain client at the use-case boundary.
 */
export type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export interface CreateOutboxEventInput {
  /** Event type, e.g. "intake.session.created" */
  type: string;
  /** Serialized DomainEvent envelope (JSON string). */
  payload: string;
  /** Deduplication key — the event's eventId (Rule 7 idempotency). */
  idempotencyKey?: string;
}

/**
 * Repository port for the Transactional Outbox table.
 *
 * Mirrors architecture/05-roadmap/phase-1-event-infrastructure.md §1.1.
 */
export interface IOutboxEventRepository {
  /**
   * Persist a pending outbox event.
   * @param tx optional transaction/executor to enroll the write in an existing
   *           transaction (true transactional outbox). Defaults to the client.
   */
  create(input: CreateOutboxEventInput, tx?: PrismaExecutor): Promise<OutboxEvent>;

  /** Fetch candidate rows for dispatch (PENDING, oldest first). */
  findPending(limit: number): Promise<OutboxEvent[]>;

  /** Fetch previously-failed rows eligible for retry (retry_count < max). */
  findRetryable(limit: number, maxRetries: number): Promise<OutboxEvent[]>;

  /**
   * Atomically claim a row for processing. Returns true only if THIS caller
   * transitioned it out of a dispatchable state — prevents double dispatch.
   */
  claim(id: string): Promise<boolean>;

  /** Mark a claimed row as successfully published. */
  markProcessed(id: string): Promise<OutboxEvent>;

  /**
   * Mark a row as failed, storing the error and incrementing retry_count.
   * The row returns to a dispatchable state so it can be retried later.
   */
  markFailed(id: string, error: string): Promise<OutboxEvent>;

  /** Count rows by status (health/metrics). */
  countByStatus(status: OutboxStatus): Promise<number>;
}
