import { describe, expect, it } from 'vitest';
import { computeSignatureProof } from '@/lib/crypto/signatureProof';

describe('computeSignatureProof', () => {
  it('is deterministic for same payload', () => {
    const proof1 = computeSignatureProof({
      payload: { a: 1, b: 2 },
      signedByUserId: 'user_1',
      signedAtIso: '2026-04-24T00:00:00.000Z',
      userAgent: 'ua',
      ip: '127.0.0.1',
    });
    const proof2 = computeSignatureProof({
      payload: { b: 2, a: 1 }, // different key order
      signedByUserId: 'user_1',
      signedAtIso: '2026-04-24T00:00:00.000Z',
      userAgent: 'ua',
      ip: '127.0.0.1',
    });

    expect(proof1.hash).toBe(proof2.hash);
    expect(proof1.algorithm).toBe('sha256');
    expect(proof1.version).toBe(1);
  });

  it('changes when payload changes', () => {
    const proof1 = computeSignatureProof({
      payload: { a: 1 },
      signedByUserId: 'user_1',
      signedAtIso: '2026-04-24T00:00:00.000Z',
    });
    const proof2 = computeSignatureProof({
      payload: { a: 2 },
      signedByUserId: 'user_1',
      signedAtIso: '2026-04-24T00:00:00.000Z',
    });
    expect(proof1.hash).not.toBe(proof2.hash);
  });
});

