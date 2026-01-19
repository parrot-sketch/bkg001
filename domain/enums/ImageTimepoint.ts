/**
 * Domain Enum: ImageTimepoint
 * 
 * Represents when a patient image was taken in relation to surgery.
 */
export enum ImageTimepoint {
  PRE_OP = 'PRE_OP',
  ONE_WEEK_POST_OP = 'ONE_WEEK_POST_OP',
  ONE_MONTH_POST_OP = 'ONE_MONTH_POST_OP',
  THREE_MONTHS_POST_OP = 'THREE_MONTHS_POST_OP',
  SIX_MONTHS_POST_OP = 'SIX_MONTHS_POST_OP',
  ONE_YEAR_POST_OP = 'ONE_YEAR_POST_OP',
  CUSTOM = 'CUSTOM',
}

export function isImageTimepoint(value: string): value is ImageTimepoint {
  return Object.values(ImageTimepoint).includes(value as ImageTimepoint);
}

export function getImageTimepointLabel(timepoint: ImageTimepoint): string {
  const labels: Record<ImageTimepoint, string> = {
    [ImageTimepoint.PRE_OP]: 'Pre-Operative',
    [ImageTimepoint.ONE_WEEK_POST_OP]: '1 Week Post-Op',
    [ImageTimepoint.ONE_MONTH_POST_OP]: '1 Month Post-Op',
    [ImageTimepoint.THREE_MONTHS_POST_OP]: '3 Months Post-Op',
    [ImageTimepoint.SIX_MONTHS_POST_OP]: '6 Months Post-Op',
    [ImageTimepoint.ONE_YEAR_POST_OP]: '1 Year Post-Op',
    [ImageTimepoint.CUSTOM]: 'Custom',
  };
  return labels[timepoint];
}
