/**
 * Procedure and category suggestions for scheduling.
 *
 * The catalog already lives in `surgical_procedure_options` (about a hundred
 * active rows plus anything staff add later). Scheduling loads that list once
 * and ranks it here as the user types. No extra table or search extension:
 * prefix, contains, and a short edit-distance pass catch the long names that
 * are easy to mistype. If the catalog grows past a few hundred rows, the same
 * ranking can move behind the existing `GET /api/admin/procedure-options?search=`
 * query without changing the dialog.
 */

export const PROCEDURE_CATEGORY_LABELS: Record<string, string> = {
  FACIAL: 'Facial',
  BODY: 'Body',
  BREAST: 'Breast',
  SKIN_AND_SCAR: 'Skin & Scar',
  NON_SURGICAL: 'Non-Surgical',
  OTHER: 'Other',
};

export interface ProcedureCatalogItem {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
}

export interface RankedProcedure extends ProcedureCatalogItem {
  score: number;
  /** True when the match is an edit-distance correction rather than a substring. */
  closeMatch: boolean;
}

export interface ResolvedProcedureCategory {
  /** Value stored on `SurgicalProcedureOption.category`. Always a known enum code. */
  category: string;
  /** Free-text category stored in `subcategory` when it is not one of the enum labels. */
  subcategory: string | null;
  /** Human label stored on the surgical case. */
  label: string;
}

export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 3) return 99;
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

function scoreText(query: string, text: string): { score: number; closeMatch: boolean } {
  const q = normalizeSearchText(query);
  const name = normalizeSearchText(text);
  if (!q || !name) return { score: 0, closeMatch: false };
  if (name === q) return { score: 100, closeMatch: false };
  if (name.startsWith(q)) return { score: 86, closeMatch: false };
  if (name.split(' ').some((word) => word.startsWith(q))) return { score: 72, closeMatch: false };
  if (name.includes(q)) return { score: 60, closeMatch: false };

  if (q.length < 4) return { score: 0, closeMatch: false };

  let best = levenshtein(q, name);
  for (const word of name.split(' ')) {
    if (Math.abs(word.length - q.length) > 3) continue;
    best = Math.min(best, levenshtein(q, word));
  }
  if (best <= 2) return { score: 48 - best * 4, closeMatch: true };
  return { score: 0, closeMatch: false };
}

export function rankProcedures(
  query: string,
  catalog: ProcedureCatalogItem[],
  limit = 8,
): RankedProcedure[] {
  const q = query.trim();
  if (q.length < 2) return [];

  const ranked: RankedProcedure[] = [];
  for (const item of catalog) {
    const nameScore = scoreText(q, item.name);
    const categoryScore = item.subcategory ? scoreText(q, item.subcategory) : { score: 0, closeMatch: false };
    const score = Math.max(nameScore.score, categoryScore.score > 0 ? Math.min(categoryScore.score, 36) : 0);
    if (score <= 0) continue;
    ranked.push({
      ...item,
      score,
      closeMatch: nameScore.closeMatch && nameScore.score >= categoryScore.score,
    });
  }

  ranked.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return ranked.slice(0, limit);
}

/**
 * Enter should accept a confident catalog match (exact, prefix, or a near typo)
 * so a mistyped long name does not create a duplicate procedure.
 * A weak "contains" hit stays a suggestion the user can click.
 */
export function pickSuggestionOnEnter(query: string, ranked: RankedProcedure[]): RankedProcedure | null {
  const top = ranked[0];
  if (!top) return null;
  const q = normalizeSearchText(query);
  if (!q) return null;
  if (normalizeSearchText(top.name) === q) return top;
  if (top.score >= 72 && q.length >= 3) return top;
  if (top.closeMatch) return top;
  return null;
}

export function rankTextSuggestions(query: string, labels: string[], limit = 8): string[] {
  const q = query.trim();
  const unique = [...new Set(labels.map((label) => label.trim()).filter(Boolean))];
  if (!q) return unique.slice(0, limit);

  return unique
    .map((label) => ({ label, score: scoreText(q, label).score }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map((item) => item.label);
}

export function resolveCatalogCategory(input: string): ResolvedProcedureCategory {
  const trimmed = input.trim();
  if (!trimmed) {
    return { category: 'OTHER', subcategory: null, label: PROCEDURE_CATEGORY_LABELS.OTHER };
  }

  const byLabel = Object.entries(PROCEDURE_CATEGORY_LABELS).find(
    ([code, label]) => label.toLowerCase() === trimmed.toLowerCase() || code.toLowerCase() === trimmed.toLowerCase(),
  );
  if (byLabel) {
    return { category: byLabel[0], subcategory: null, label: byLabel[1] };
  }

  const compact = trimmed.toUpperCase().replace(/&/g, ' AND ').replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (PROCEDURE_CATEGORY_LABELS[compact]) {
    return { category: compact, subcategory: null, label: PROCEDURE_CATEGORY_LABELS[compact] };
  }

  return { category: 'OTHER', subcategory: trimmed, label: trimmed };
}

export function categoryLabel(category: string, subcategory?: string | null): string {
  if (subcategory && subcategory.trim()) return subcategory.trim();
  return PROCEDURE_CATEGORY_LABELS[category] ?? category;
}
