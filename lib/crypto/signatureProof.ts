import { createHash } from 'crypto';
import { stableStringify } from './stableJson';

export type SignatureProof = {
  version: 1;
  algorithm: 'sha256';
  hash: string;
  signedByUserId: string;
  signedAt: string;
  userAgent?: string;
  ip?: string;
};

export function computeSignatureProof(args: {
  payload: unknown;
  signedByUserId: string;
  signedAtIso: string;
  userAgent?: string;
  ip?: string;
}): SignatureProof {
  const normalized = stableStringify({
    v: 1,
    signedByUserId: args.signedByUserId,
    signedAt: args.signedAtIso,
    payload: args.payload,
  });

  const hash = createHash('sha256').update(normalized).digest('hex');

  return {
    version: 1,
    algorithm: 'sha256',
    hash,
    signedByUserId: args.signedByUserId,
    signedAt: args.signedAtIso,
    userAgent: args.userAgent,
    ip: args.ip,
  };
}

