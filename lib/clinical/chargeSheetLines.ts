export interface ChargeLineIdentity {
  id: string;
  description: string;
  type: string;
  itemId: number | string;
}

export function chargeLineKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** The line already on the bill that this name or catalogue item would repeat. */
export function findDuplicateChargeLine<T extends ChargeLineIdentity>(
  items: T[],
  candidate: {
    name: string;
    serviceId?: number | null;
    inventoryId?: string | number | null;
    exceptId?: string;
  },
): T | null {
  const key = chargeLineKey(candidate.name);
  return (
    items.find((item) => {
      if (candidate.exceptId && item.id === candidate.exceptId) return false;
      if (key && chargeLineKey(item.description) === key) return true;
      if (candidate.serviceId != null && item.type === 'service' && Number(item.itemId) === candidate.serviceId) {
        return true;
      }
      if (
        candidate.inventoryId != null &&
        item.type === 'inventory' &&
        String(item.itemId) === String(candidate.inventoryId)
      ) {
        return true;
      }
      return false;
    }) ?? null
  );
}

export function hasDuplicateChargeLines(items: ChargeLineIdentity[]): boolean {
  return items.some((item) =>
    findDuplicateChargeLine(items, {
      name: item.description,
      serviceId: item.type === 'service' ? Number(item.itemId) : null,
      inventoryId: item.type === 'inventory' ? item.itemId : null,
      exceptId: item.id,
    }),
  );
}

export function duplicateChargeMessage(existingName: string): string {
  return `${existingName} is already on this bill. Update the quantity or price on that line.`;
}
