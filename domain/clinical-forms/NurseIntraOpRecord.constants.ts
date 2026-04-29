import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────

export const INTRAOP_TEMPLATE_KEY = 'NURSE_INTRAOP_RECORD' as const;
export const INTRAOP_TEMPLATE_VERSION = 2;

// ──────────────────────────────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────────────────────────────

export const yesNoEnum = z.enum(['Y', 'N']);
export type YesNo = z.infer<typeof yesNoEnum>;

export const arrivalModeEnum = z.enum(['Stretcher', 'Wheelchair', 'Walking']);
export type ArrivalMode = z.infer<typeof arrivalModeEnum>;

export const sexEnum = z.enum(['Male', 'Female', 'Other']);
export type Sex = z.infer<typeof sexEnum>;

export const asaClassEnum = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
export type ASAClass = z.infer<typeof asaClassEnum>;

export const cannulaPositionEnum = z.enum(['RA', 'LA', 'RL', 'LL', 'Other']);
export type CannulaPosition = z.infer<typeof cannulaPositionEnum>;

export const patientPositionEnum = z.enum(['Prone', 'Supine', 'Lateral', 'Lithotomy', 'Other']);
export type PatientPosition = z.infer<typeof patientPositionEnum>;

export const tourniquetSideEnum = z.enum(['Rt.', 'Lt.']);
export type TourniquetSide = z.infer<typeof tourniquetSideEnum>;

export const anaesthesiaTypeEnum = z.enum(['General', 'Spinal', 'Regional', 'Local']);
export type AnaesthesiaType = z.infer<typeof anaesthesiaTypeEnum>;

export const woundClassEnum = z.enum(['Clean', 'Clean Contaminated', 'Contaminated', 'Infected']);
export type WoundClass = z.infer<typeof woundClassEnum>;

export const skinPrepAgentEnum = z.enum([
  'Hibitane in Spirit',
  'Povidone Iodine',
  'Hibitane in Water',
  'Other',
]);
export type SkinPrepAgent = z.infer<typeof skinPrepAgentEnum>;

export const drainTypeEnum = z.enum(['Corrugated', 'Portovac', 'UWS', 'NG', 'Other']);
export type DrainType = z.infer<typeof drainTypeEnum>;

export const woundIrrigationEnum = z.enum(['Saline', 'Water', 'Povidone Iodine', 'Antibiotic', 'Other']);
export type WoundIrrigation = z.infer<typeof woundIrrigationEnum>;

// ──────────────────────────────────────────────────────────────────────
// Signatures (server-side)
// ──────────────────────────────────────────────────────────────────────

export const signatureProofSchema = z.object({
  version: z.literal(1),
  algorithm: z.literal('sha256'),
  hash: z.string().regex(/^[a-f0-9]{64}$/i, 'Invalid SHA256 hash'),
  signedByUserId: z.string().min(1),
  signedAt: z.string().min(10),
  userAgent: z.string().optional(),
  ip: z.string().optional(),
});

