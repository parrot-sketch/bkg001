/**
 * Units of Measure Constants
 * 
 * Comprehensive list of common units of measure across healthcare inventory.
 * Categorized for better user experience.
 */

export const UNITS_OF_MEASURE = {
  COUNT: {
    label: 'Count',
    options: ['Piece', 'Unit', 'Item', 'Set', 'Pack', 'Box', 'Pair', 'Dozen'],
  },
  VOLUME: {
    label: 'Volume',
    options: ['ML', 'L', 'OZ', 'FL OZ', 'Bottle', 'Vial', 'Ampoule', 'Can', 'Jar'],
  },
  WEIGHT: {
    label: 'Weight',
    options: ['MG', 'G', 'KG', 'OZ', 'LB'],
  },
  LENGTH: {
    label: 'Length/Size',
    options: ['CM', 'M', 'INCH', 'FT', 'MM'],
  },
  AREA: {
    label: 'Area',
    options: ['M2', 'CM2', 'INCH2', 'FT2'],
  },
  CONTAINER: {
    label: 'Container',
    options: ['Tube', 'Jar', 'Bottle', 'Bag', 'Roll', 'Sheet', 'Spray', 'Applicator', 'Dispenser', 'Kit', 'Strip'],
  },
  MEDICAL: {
    label: 'Medical',
    options: ['Tablet', 'Capsule', 'Injection', 'Infusion', 'Drop', 'Dose', 'Strip', 'Patch', 'Inhalation'],
  },
} as const;

/**
 * Flattened list of all unit options for UI dropdowns
 */
export const ALL_UNITS_FLAT = Object.values(UNITS_OF_MEASURE)
  .flatMap(category => category.options)
  .sort();

/**
 * Create grouped options for select components
 * Returns an array of { label, options } for optgroup elements
 */
export const getUnitCategories = () => {
  return Object.values(UNITS_OF_MEASURE).map(category => ({
    label: category.label,
    options: category.options,
  }));
};

/**
 * Validate if a value is a known unit of measure
 */
export const isKnownUnit = (unit: string): boolean => {
  return ALL_UNITS_FLAT.some(u => u.toLowerCase() === unit.toLowerCase());
};
