import { describe, expect, it } from 'vitest';
import { isSameProcedureName, planCatalogueMerge } from '@/lib/clinical/procedureCatalogueMerge';

describe('isSameProcedureName', () => {
  it('treats spelling, plurals, and a trailing surgery as the same procedure', () => {
    expect(isSameProcedureName('Breast Reduction Surgery', 'BREAST REDUCTION')).toBe(true);
    expect(isSameProcedureName('Mommy Makeover', 'MOMM MAKEOVER')).toBe(true);
    expect(isSameProcedureName('Chemical Peel', 'Chemical peels')).toBe(true);
    expect(isSameProcedureName('Non-Surgical Fat Reduction', 'Nonsurgical Fat Reduction')).toBe(true);
    expect(isSameProcedureName('Hair Transplantation', 'HAIR TRANSPLANT')).toBe(true);
  });

  it('keeps a lay name that is not the same procedure string', () => {
    expect(isSameProcedureName('Nose Surgery', 'Rhinoplasty')).toBe(false);
    expect(isSameProcedureName('Ear Surgery', 'Otoplasty')).toBe(false);
    expect(isSameProcedureName('Liposuction - Assisted', 'Liposuction')).toBe(false);
    expect(isSameProcedureName('Upper Arm Lift', 'UPPER ARM LIPO')).toBe(false);
    expect(isSameProcedureName('Butt Lift', 'BUTT LIPO')).toBe(false);
  });
});

describe('planCatalogueMerge', () => {
  it('inserts only catalogue names that are not already stored', () => {
    const plan = planCatalogueMerge(
      [{ name: 'RHINOPLASTY' }, { name: 'MOMM MAKEOVER' }, { name: 'BOTOX' }],
      [
        { category: 'Face & Head', procedure_name: 'Rhinoplasty' },
        { category: 'Face & Head', procedure_name: 'Nose Surgery' },
        { category: 'Body & Extremities', procedure_name: 'Mommy Makeover' },
        { category: 'Injectables', procedure_name: 'Calcium Hydroxylapatite' },
        { category: 'Injectables', procedure_name: 'Botox' },
      ],
    );

    expect(plan.insert.map((row) => row.name)).toEqual(['Nose Surgery', 'Calcium Hydroxylapatite']);
    expect(plan.insert.find((row) => row.name === 'Calcium Hydroxylapatite')).toMatchObject({
      category: 'NON_SURGICAL',
      subcategory: 'Injectables',
    });
    expect(plan.alreadyPresent).toEqual(['Rhinoplasty', 'Mommy Makeover', 'Botox']);
  });
});
