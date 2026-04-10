'use server';

import { getCurrentUser } from '@/lib/auth/server-auth';
import db from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';
import { revalidatePath } from 'next/cache';

// ─────────────────────────────────────────────────────────────────────────────
// Theater Technician Case Items
// Domain: THEATER_TECHNICIAN only
// ─────────────────────────────────────────────────────────────────────────────

async function requireTheaterTech() {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' as const, user: null };
  if (user.role !== 'THEATER_TECHNICIAN' && user.role !== 'ADMIN') {
    return { error: 'Forbidden: Theater technician role required' as const, user: null };
  }
  return { error: null, user };
}

// ─────────────────────────────────────────────────────────────────────────────
// addCaseItem
// ─────────────────────────────────────────────────────────────────────────────

export async function addCaseItem(
  caseId: string,
  inventoryItemId: number,
  quantity: number = 1,
  notes?: string
) {
  try {
    const { error, user } = await requireTheaterTech();
    if (error || !user) return { success: false, msg: error ?? 'Unauthorized' };

    // Validate the case exists
    const sc = await db.surgicalCase.findUnique({ where: { id: caseId }, select: { id: true, status: true } });
    if (!sc) return { success: false, msg: 'Surgical case not found' };

    // Validate the inventory item exists and is active
    const item = await db.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      select: { id: true, name: true, unit_cost: true, is_billable: true, is_active: true },
    });
    if (!item || !item.is_active) return { success: false, msg: 'Inventory item not found or inactive' };
    if (quantity < 1) return { success: false, msg: 'Quantity must be at least 1' };

    // Upsert the SurgicalCaseItem
    const existing = await db.surgicalCaseItem.findUnique({
      where: { surgical_case_id_inventory_item_id: { surgical_case_id: caseId, inventory_item_id: inventoryItemId } },
    });

    let caseItem;
    if (existing) {
      caseItem = await db.surgicalCaseItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity, notes: notes ?? existing.notes },
      });
    } else {
      caseItem = await db.surgicalCaseItem.create({
        data: {
          surgical_case_id: caseId,
          inventory_item_id: inventoryItemId,
          quantity,
          added_by_user_id: user.userId,
          notes: notes ?? null,
        },
      });
    }

    // If item is billable, create a SurgicalBillingLineItem on the estimate
    if (item.is_billable) {
      const unitCostNum = typeof item.unit_cost === 'number' 
        ? item.unit_cost 
        : item.unit_cost.toNumber();
      await _upsertBillingLineItem(caseId, inventoryItemId, item.name, unitCostNum, quantity, user.userId);
    }

    revalidatePath(`/theater-tech/dashboard/${caseId}`);
    revalidatePath(`/doctor/surgical-cases/${caseId}/plan`);
    return { success: true, msg: `${item.name} added to case`, data: caseItem };
  } catch (err) {
    console.error('[addCaseItem]', err);
    return { success: false, msg: 'Failed to add item' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// removeCaseItem
// ─────────────────────────────────────────────────────────────────────────────

export async function removeCaseItem(itemId: string) {
  try {
    const { error, user } = await requireTheaterTech();
    if (error || !user) return { success: false, msg: error ?? 'Unauthorized' };

    const item = await db.surgicalCaseItem.findUnique({
      where: { id: itemId },
      include: { inventory_item: { select: { name: true } } },
    });
    if (!item) return { success: false, msg: 'Item not found' };

    await db.surgicalCaseItem.delete({ where: { id: itemId } });

    // Remove corresponding billing line item
    await db.surgicalBillingLineItem.deleteMany({
      where: { billing_estimate: { surgical_case_id: item.surgical_case_id }, inventory_item_id: item.inventory_item_id },
    });

    revalidatePath(`/theater-tech/dashboard/${item.surgical_case_id}`);
    revalidatePath(`/doctor/surgical-cases/${item.surgical_case_id}/plan`);
    return { success: true, msg: `${item.inventory_item.name} removed` };
  } catch (err) {
    console.error('[removeCaseItem]', err);
    return { success: false, msg: 'Failed to remove item' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateCaseItemQuantity
// ─────────────────────────────────────────────────────────────────────────────

export async function updateCaseItemQuantity(itemId: string, quantity: number) {
  try {
    const { error, user } = await requireTheaterTech();
    if (error || !user) return { success: false, msg: error ?? 'Unauthorized' };

    if (quantity < 1) return { success: false, msg: 'Quantity must be at least 1' };

    const item = await db.surgicalCaseItem.findUnique({
      where: { id: itemId },
      include: { inventory_item: { select: { name: true, unit_cost: true } } },
    });
    if (!item) return { success: false, msg: 'Item not found' };

    await db.surgicalCaseItem.update({ where: { id: itemId }, data: { quantity } });

    // Update billing line item
    const lineItem = await db.surgicalBillingLineItem.findFirst({
      where: {
        billing_estimate: { surgical_case_id: item.surgical_case_id },
        inventory_item_id: item.inventory_item_id,
      },
    });
    if (lineItem) {
      const totalPrice = Number(item.inventory_item.unit_cost) * quantity;
      await db.surgicalBillingLineItem.update({
        where: { id: lineItem.id },
        data: { quantity, total_price: totalPrice },
      });
    }

    revalidatePath(`/theater-tech/dashboard/${item.surgical_case_id}`);
    return { success: true, msg: 'Quantity updated' };
  } catch (err) {
    console.error('[updateCaseItemQuantity]', err);
    return { success: false, msg: 'Failed to update quantity' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL: upsert billing line item from theater tech item selection
// ─────────────────────────────────────────────────────────────────────────────

async function _upsertBillingLineItem(
  caseId: string,
  inventoryItemId: number,
  name: string,
  unitCost: number,
  quantity: number,
  addedByUserId: string
) {
  // Get or create billing estimate for the case
  let estimate = await db.surgicalBillingEstimate.findUnique({ where: { surgical_case_id: caseId } });

  if (!estimate) {
    // Find the primary surgeon to link as creator
    const sc = await db.surgicalCase.findUnique({
      where: { id: caseId },
      select: { primary_surgeon_id: true },
    });
    if (!sc) return;

    estimate = await db.surgicalBillingEstimate.create({
      data: {
        surgical_case_id: caseId,
        surgeon_fee: 0,
        anaesthesiologist_fee: 0,
        theatre_fee: 0,
        subtotal: 0,
        created_by_doctor_id: sc.primary_surgeon_id || '',
      },
    });
  }

  const totalPrice = unitCost * quantity;

  const existingLine = await db.surgicalBillingLineItem.findFirst({
    where: { billing_estimate_id: estimate.id, inventory_item_id: inventoryItemId },
  });

  if (existingLine) {
    await db.surgicalBillingLineItem.update({
      where: { id: existingLine.id },
      data: { quantity, total_price: totalPrice },
    });
  } else {
    await db.surgicalBillingLineItem.create({
      data: {
        billing_estimate_id: estimate.id,
        description: name,
        category: 'CONSUMABLE',
        quantity,
        unit_price: unitCost,
        total_price: totalPrice,
        inventory_item_id: inventoryItemId,
        is_from_inventory: true,
        added_by_role: 'THEATER_TECH',
      },
    });
  }
}
