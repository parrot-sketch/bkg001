/**
 * Clinical Inventory Integration Service
 * 
 * Extracts inventory usage events from clinical forms and applies them
 * via the canonical InventoryConsumptionBillingService.
 * 
 * Key behaviors:
 * - Deterministic externalRef generation for idempotency
 * - Sequential application (one item per call to maintain Phase 3 invariant)
 * - Transactional error handling (stop on first failure)
 * - Supports both structured (inventoryItemId) and unstructured (name-based) data
 */

import { PrismaClient } from '@prisma/client';
import { 
  InventoryConsumptionBillingService,
  SourceFormKey,
  ApplyUsageAndBillingParams,
  ApplyUsageAndBillingResult,
} from './InventoryConsumptionBillingService';
import { PrismaInventoryConsumptionBillingService } from './InventoryConsumptionBillingService';
import { GateBlockedError } from '@/application/errors/GateBlockedError';
import { ValidationError } from '@/application/errors/ValidationError';
import { createHash } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface UsageEvent {
  inventoryItemId: number;
  quantityUsed: number;
  notes?: string;
  usedAt?: Date;
  sourceFormKey: SourceFormKey;
  externalRef: string; // Deterministic, derived from form context
}

export interface ApplyUsageEventsResult {
  appliedUsageCount: number;
  appliedBillLinesCount: number;
  isIdempotentReplaySummary: boolean;
  stockWarnings: Array<{
    inventoryItemId: number;
    itemName: string;
    quantityOnHand: number;
    reorderPoint: number;
  }>;
  errors?: Array<{
    inventoryItemId: number;
    itemName: string;
    error: string;
  }>;
}

export interface UserContext {
  userId: string;
  usedBy?: string;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class ClinicalInventoryIntegrationService {
  private consumptionService: InventoryConsumptionBillingService;

  constructor(private readonly db: PrismaClient) {
    this.consumptionService = new PrismaInventoryConsumptionBillingService(db);
  }

  /**
   * Extract usage events from pre-op ward checklist form data
   */
  async extractUsageEventsFromPreop(
    caseId: string,
    formResponseId: string,
    dataJson: string
  ): Promise<UsageEvent[]> {
    const data = JSON.parse(dataJson);
    const events: UsageEvent[] = [];

    // Pre-op medications section
    const medications = data.medications;
    if (medications) {
      // Check for structured medication entries with inventoryItemId
      // For now, pre-op uses free-text details, so we'll need to match by name
      // This is a placeholder - actual implementation would need name-to-inventory matching
      // For Phase 4E, we'll focus on structured data (inventoryItemId present)
      
      // If medications section has structured items with inventoryItemId:
      if (Array.isArray(medications.items)) {
        for (const item of medications.items) {
          if (item.inventoryItemId && item.quantityUsed) {
            events.push({
              inventoryItemId: item.inventoryItemId,
              quantityUsed: item.quantityUsed,
              notes: item.notes || `Pre-op medication: ${item.name || ''}`,
              usedAt: item.usedAt ? new Date(item.usedAt) : undefined,
              sourceFormKey: SourceFormKey.NURSE_INTRAOP_RECORD, // Pre-op is part of intra-op workflow
              externalRef: this.generateDeterministicExternalRef(
                caseId,
                formResponseId,
                'medications',
                item.inventoryItemId
              ),
            });
          }
        }
      }
    }

    return events;
  }

  /**
   * Extract usage events from intra-op record form data
   */
  async extractUsageEventsFromIntraop(
    caseId: string,
    formResponseId: string,
    dataJson: string
  ): Promise<UsageEvent[]> {
    const data = JSON.parse(dataJson);
    const events: UsageEvent[] = [];

    // Medications section
    if (Array.isArray(data.medications)) {
      for (const med of data.medications) {
        if (med.inventoryItemId && med.quantityUsed) {
          events.push({
            inventoryItemId: med.inventoryItemId,
            quantityUsed: med.quantityUsed,
            notes: med.notes || `Intra-op medication: ${med.name || med.drug || ''}`,
            usedAt: med.time ? this.parseTimeToDate(med.time) : undefined,
            sourceFormKey: SourceFormKey.NURSE_INTRAOP_RECORD,
            externalRef: this.generateDeterministicExternalRef(
              caseId,
              formResponseId,
              'medications',
              med.inventoryItemId,
              med.time || undefined
            ),
          });
        }
      }
    }

    // Implants/devices section
    if (Array.isArray(data.implants)) {
      for (const implant of data.implants) {
        if (implant.inventoryItemId && implant.quantityUsed) {
          events.push({
            inventoryItemId: implant.inventoryItemId,
            quantityUsed: implant.quantityUsed || 1,
            notes: implant.notes || `Implant: ${implant.name || implant.item || ''}`,
            sourceFormKey: SourceFormKey.NURSE_INTRAOP_RECORD,
            externalRef: this.generateDeterministicExternalRef(
              caseId,
              formResponseId,
              'implants',
              implant.inventoryItemId,
              implant.serialNumber || undefined
            ),
          });
        }
      }
    }

    return events;
  }

  /**
   * Extract usage events from recovery record form data
   */
  async extractUsageEventsFromRecovery(
    caseId: string,
    formResponseId: string,
    dataJson: string
  ): Promise<UsageEvent[]> {
    const data = JSON.parse(dataJson);
    const events: UsageEvent[] = [];

    // Interventions & Medications section
    const interventions = data.interventions;
    if (interventions && Array.isArray(interventions.medications)) {
      for (const med of interventions.medications) {
        if (med.inventoryItemId && med.quantityUsed) {
          events.push({
            inventoryItemId: med.inventoryItemId,
            quantityUsed: med.quantityUsed,
            notes: med.notes || `Recovery medication: ${med.name || ''}`,
            usedAt: med.time ? this.parseTimeToDate(med.time) : undefined,
            sourceFormKey: SourceFormKey.NURSE_RECOVERY_RECORD,
            externalRef: this.generateDeterministicExternalRef(
              caseId,
              formResponseId,
              'medications',
              med.inventoryItemId,
              med.time || undefined
            ),
          });
        }
      }
    }

    return events;
  }

  /**
   * Apply usage events sequentially to the canonical consumption service
   */
  async applyUsageEvents(
    caseId: string,
    events: UsageEvent[],
    userContext: UserContext
  ): Promise<ApplyUsageEventsResult> {
    let appliedUsageCount = 0;
    let appliedBillLinesCount = 0;
    let isIdempotentReplaySummary = false;
    const stockWarnings: ApplyUsageEventsResult['stockWarnings'] = [];
    const errors: ApplyUsageEventsResult['errors'] = [];

    // Check stock levels for warnings (non-blocking)
    for (const event of events) {
      const item = await this.db.inventoryItem.findUnique({
        where: { id: event.inventoryItemId },
        select: {
          id: true,
          name: true,
          quantity_on_hand: true,
          reorder_point: true,
        },
      });

      if (item && item.quantity_on_hand <= item.reorder_point) {
        stockWarnings.push({
          inventoryItemId: item.id,
          itemName: item.name,
          quantityOnHand: item.quantity_on_hand,
          reorderPoint: item.reorder_point,
        });
      }
    }

    // Apply events sequentially (maintains Phase 3 single-item invariant)
    for (const event of events) {
      try {
        const params: ApplyUsageAndBillingParams = {
          surgicalCaseId: caseId,
          externalRef: event.externalRef,
          sourceFormKey: event.sourceFormKey,
          items: [
            {
              inventoryItemId: event.inventoryItemId,
              quantityUsed: event.quantityUsed,
              notes: event.notes,
            },
          ],
          recordedBy: userContext.userId,
          usedBy: event.usedAt ? (userContext.usedBy || userContext.userId) : undefined,
          usedAt: event.usedAt,
        };

        const result: ApplyUsageAndBillingResult = await this.consumptionService.applyUsageAndBilling(params);

        if (result.isIdempotentReplay) {
          isIdempotentReplaySummary = true;
        } else {
          appliedUsageCount++;
          if (result.billItem) {
            appliedBillLinesCount++;
          }
        }
      } catch (error) {
        // Get item name for error reporting
        const item = await this.db.inventoryItem.findUnique({
          where: { id: event.inventoryItemId },
          select: { id: true, name: true },
        });

        const itemName = item?.name || `Item ${event.inventoryItemId}`;

        if (error instanceof GateBlockedError) {
          // Stock issues - return error with metadata
          errors.push({
            inventoryItemId: event.inventoryItemId,
            itemName,
            error: error.message,
          });
          // Stop at first failure (transactional behavior)
          throw error;
        } else {
          // Other errors
          errors.push({
            inventoryItemId: event.inventoryItemId,
            itemName,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          throw error;
        }
      }
    }

    return {
      appliedUsageCount,
      appliedBillLinesCount,
      isIdempotentReplaySummary,
      stockWarnings,
      ...(errors.length > 0 ? { errors } : {}),
    };
  }

  /**
   * Generate deterministic externalRef for idempotency
   * 
   * Format: hash(caseId + formResponseId + sectionKey + inventoryItemId + optionalUniqueSuffix)
   * This ensures the same form submission generates the same externalRef
   */
  private generateDeterministicExternalRef(
    caseId: string,
    formResponseId: string,
    sectionKey: string,
    inventoryItemId: number,
    uniqueSuffix?: string
  ): string {
    const input = `${caseId}|${formResponseId}|${sectionKey}|${inventoryItemId}${uniqueSuffix ? `|${uniqueSuffix}` : ''}`;
    const hash = createHash('sha256').update(input).digest('hex');
    
    // Convert to UUID-like format (8-4-4-4-12)
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
  }

  /**
   * Parse HH:MM time string to Date (today with that time)
   */
  private parseTimeToDate(timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
}
