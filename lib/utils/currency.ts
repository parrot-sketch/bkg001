export function formatCurrency(amount: number, currency: string = 'KES'): string {
  // We explicitly match the formatting expected by the user (KES XX,XXX.XX)
  // which might sometimes omit the "KES" prefix if they do it manually, but we'll include it.
  const formatter = new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  // Quick fix: the built in format natively prepends KES
  return formatter.format(amount);
}
