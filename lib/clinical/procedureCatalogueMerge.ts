/**
 * Merge the cosmetic procedure catalogue into surgical_procedure_options.
 *
 * The suggestion engine reads that table and nothing else. The JSON file is a
 * source list, not a second catalog. A name is inserted only when production
 * does not already have the same procedure under a different spelling.
 */

export interface CatalogueProcedure {
  category: string;
  procedure_name: string;
}

export interface ExistingProcedureName {
  name: string;
}

export interface ProcedureInsert {
  name: string;
  category: string;
  subcategory: string | null;
  sourceCategory: string;
}

export interface CatalogueMergePlan {
  insert: ProcedureInsert[];
  alreadyPresent: string[];
  duplicateInFile: string[];
}

const CATEGORY_MAP: Record<string, { category: string; subcategory: string | null }> = {
  'face & head': { category: 'FACIAL', subcategory: 'Face & Head' },
  breast: { category: 'BREAST', subcategory: null },
  'body & extremities': { category: 'BODY', subcategory: 'Body & Extremities' },
  injectables: { category: 'NON_SURGICAL', subcategory: 'Injectables' },
  'facial rejuvenation': { category: 'NON_SURGICAL', subcategory: 'Facial Rejuvenation' },
  'other non-surgical': { category: 'NON_SURGICAL', subcategory: 'Other Non-Surgical' },
  'other cosmetic procedures': { category: 'OTHER', subcategory: 'Other Cosmetic Procedures' },
};

export function catalogueMatchKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\bnon\s+/g, 'non')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+(surgery|procedure|procedures)$/g, '')
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

export function isSameProcedureName(leftName: string, rightName: string): boolean {
  const left = catalogueMatchKey(leftName);
  const right = catalogueMatchKey(rightName);
  if (!left || !right) return false;
  if (left === right) return true;

  const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left];
  if (longer.startsWith(shorter)) {
    const extra = longer.slice(shorter.length).trim();
    if (extra === 's' || extra === 'ation' || extra === 'ing') return true;
  }

  // One-character typos only. A wider distance treats "arm lift" and "arm lipo" as the same name.
  if (Math.abs(left.length - right.length) > 1) return false;
  return levenshtein(left, right) <= 1;
}

export function mapCatalogueCategory(sourceCategory: string): { category: string; subcategory: string | null } {
  const mapped = CATEGORY_MAP[sourceCategory.trim().toLowerCase()];
  if (mapped) return mapped;
  return { category: 'OTHER', subcategory: sourceCategory.trim() || null };
}

export function planCatalogueMerge(
  existing: ExistingProcedureName[],
  catalogue: CatalogueProcedure[],
): CatalogueMergePlan {
  const insert: ProcedureInsert[] = [];
  const alreadyPresent: string[] = [];
  const duplicateInFile: string[] = [];
  const accepted: ProcedureInsert[] = [];

  for (const row of catalogue) {
    const name = row.procedure_name.trim();
    if (!name) continue;

    if (accepted.some((item) => isSameProcedureName(item.name, name)) || insert.some((item) => isSameProcedureName(item.name, name))) {
      duplicateInFile.push(name);
      continue;
    }

    const match = existing.find((item) => isSameProcedureName(item.name, name));
    if (match) {
      alreadyPresent.push(name);
      accepted.push({ name, category: '', subcategory: null, sourceCategory: row.category });
      continue;
    }

    const mapped = mapCatalogueCategory(row.category);
    insert.push({
      name,
      category: mapped.category,
      subcategory: mapped.subcategory,
      sourceCategory: row.category,
    });
  }

  return { insert, alreadyPresent, duplicateInFile };
}
