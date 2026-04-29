import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────
// Row Schemas (paper tables)
// ──────────────────────────────────────────────────────────────────────

export const medicationRowSchema = z.object({
  drug: z.string().optional().default(''),
  route: z.string().optional().default(''),
  time: z.string().optional().default(''),
  sign: z.string().optional().default(''),
  // Hidden inventory integration fields (not part of paper form UI)
  inventoryItemId: z.number().optional(),
  quantityUsed: z.number().optional(),
  notes: z.string().optional(),
  sku: z.string().optional(),
});
export type MedicationRow = z.infer<typeof medicationRowSchema>;

export const implantRowSchema = z.object({
  item: z.string().optional().default(''),
  lotNo: z.string().optional().default(''),
  size: z.string().optional().default(''),
  // Hidden inventory integration fields (not part of paper form UI)
  inventoryItemId: z.number().optional(),
  quantityUsed: z.number().optional(),
  notes: z.string().optional(),
  sku: z.string().optional(),
  unitCost: z.number().optional(),
});
export type ImplantRow = z.infer<typeof implantRowSchema>;

export const specimenRowSchema = z.object({
  type: z.string().optional().default(''),
  histology: z.boolean().optional().default(false),
  cytology: z.boolean().optional().default(false),
  notForAnalysis: z.boolean().optional().default(false),
  disposition: z.string().optional().default(''),
  // Hidden inventory integration fields (not part of paper form UI)
  inventoryItemId: z.number().optional(),
  sku: z.string().optional(),
});
export type SpecimenRow = z.infer<typeof specimenRowSchema>;

// ──────────────────────────────────────────────────────────────────────
// Swab Count Table
// ──────────────────────────────────────────────────────────────────────

export const swabCountSchema = z.object({
  abdominalSwabs: z.number().int().min(0).optional().default(0),
  raytecSwabs: z.number().int().min(0).optional().default(0),
  throatPacks: z.number().int().min(0).optional().default(0),
  other: z.number().int().min(0).optional().default(0),
});

export const swabsCountTableSchema = z.object({
  preliminaryCheck: swabCountSchema.optional().default({}),
  woundClosure: swabCountSchema.optional().default({}),
  finalCount: swabCountSchema.optional().default({}),
});

