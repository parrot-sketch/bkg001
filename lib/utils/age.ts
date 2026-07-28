export function calculateAge(dob: Date | string): number {
  const dobDate = typeof dob === 'string' ? new Date(dob) : dob;
  if (isNaN(dobDate.getTime())) return -1;
  const today = new Date();
  let age = today.getFullYear() - dobDate.getFullYear();
  const m = today.getMonth() - dobDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) age--;
  return age;
}

export function isMinor(dob: Date | string): boolean {
  return calculateAge(dob) < 18;
}

export function formatAge(dob: Date | string): string {
  const dobDate = typeof dob === 'string' ? new Date(dob) : dob;
  if (isNaN(dobDate.getTime())) return 'N/A';
  const today = new Date();
  let years = today.getFullYear() - dobDate.getFullYear();
  let months = today.getMonth() - dobDate.getMonth();
  if (months < 0) { years--; months += 12; }
  if (years === 0) return `${months} months`;
  if (months === 0) return `${years} years`;
  return `${years} years ${months} months`;
}
