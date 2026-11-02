import { describe, expect, it } from 'vitest';
import { duplicateChargeMessage, findDuplicateChargeLine, hasDuplicateChargeLines } from '@/lib/clinical/chargeSheetLines';

const lines = [
  { id: 'a', description: 'Theatre drape', type: 'custom', itemId: 'custom-a' },
  { id: 'b', description: 'Botox (Per Unit)', type: 'service', itemId: 6 },
];

describe('findDuplicateChargeLine', () => {
  it('matches the same item name regardless of case or spacing', () => {
    expect(findDuplicateChargeLine(lines, { name: '  theatre   DRAPE ' })?.id).toBe('a');
  });

  it('matches a catalogue item already on the bill', () => {
    expect(findDuplicateChargeLine(lines, { name: 'Botulinum', serviceId: 6 })?.id).toBe('b');
  });

  it('allows the line being edited to keep its own name', () => {
    expect(findDuplicateChargeLine(lines, { name: 'Theatre drape', exceptId: 'a' })).toBeNull();
  });

  it('allows a different item', () => {
    expect(findDuplicateChargeLine(lines, { name: 'Skin marker' })).toBeNull();
  });

  it('spots a bill that already repeats an item', () => {
    expect(hasDuplicateChargeLines(lines)).toBe(false);
    expect(hasDuplicateChargeLines([...lines, { id: 'c', description: 'theatre drape', type: 'custom', itemId: 'c' }])).toBe(true);
  });
});

describe('duplicateChargeMessage', () => {
  it('tells the user to change the existing line', () => {
    expect(duplicateChargeMessage('Theatre drape')).toBe(
      'Theatre drape is already on this bill. Update the quantity or price on that line.',
    );
  });
});
