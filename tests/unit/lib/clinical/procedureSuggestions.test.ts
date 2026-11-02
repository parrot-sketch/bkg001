import { describe, expect, it } from 'vitest';
import {
  pickSuggestionOnEnter,
  rankProcedures,
  resolveCatalogCategory,
} from '@/lib/clinical/procedureSuggestions';

const catalog = [
  { id: '1', name: 'Rhinoplasty', category: 'FACIAL', subcategory: null },
  { id: '2', name: 'Breast Augmentation', category: 'BREAST', subcategory: null },
  { id: '3', name: 'Liposuction', category: 'BODY', subcategory: 'Body contouring' },
  { id: '4', name: 'Abdominoplasty', category: 'BODY', subcategory: null },
];

describe('rankProcedures', () => {
  it('ranks an exact name above partial matches', () => {
    const ranked = rankProcedures('Rhinoplasty', catalog);
    expect(ranked[0]?.id).toBe('1');
    expect(ranked[0]?.score).toBe(100);
  });

  it('suggests the catalog procedure when the typed name has a small typo', () => {
    const ranked = rankProcedures('rhinoplasyt', catalog);
    expect(ranked[0]?.name).toBe('Rhinoplasty');
    expect(ranked[0]?.closeMatch).toBe(true);
  });

  it('matches a prefix of a long procedure name', () => {
    const ranked = rankProcedures('abdom', catalog);
    expect(ranked[0]?.name).toBe('Abdominoplasty');
    expect(ranked[0]?.closeMatch).toBe(false);
  });
});

describe('pickSuggestionOnEnter', () => {
  it('accepts a typo correction so the user does not create a duplicate', () => {
    const ranked = rankProcedures('rhinoplasyt', catalog);
    expect(pickSuggestionOnEnter('rhinoplasyt', ranked)?.id).toBe('1');
  });

  it('leaves a weak contains-match for the user to click', () => {
    const ranked = rankProcedures('plast', catalog);
    expect(ranked.some((item) => item.name === 'Rhinoplasty')).toBe(true);
    expect(pickSuggestionOnEnter('plast', ranked)).toBeNull();
  });
});

describe('resolveCatalogCategory', () => {
  it('maps a known label onto the existing category enum', () => {
    expect(resolveCatalogCategory('Skin & Scar')).toEqual({
      category: 'SKIN_AND_SCAR',
      subcategory: null,
      label: 'Skin & Scar',
    });
  });

  it('stores an unknown category as Other plus the typed name', () => {
    expect(resolveCatalogCategory('Mommy makeover')).toEqual({
      category: 'OTHER',
      subcategory: 'Mommy makeover',
      label: 'Mommy makeover',
    });
  });
});
