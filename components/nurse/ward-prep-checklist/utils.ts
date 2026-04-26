export function getAgeYears(dateOfBirth?: string | Date | null): string {
  if (!dateOfBirth) return '—';
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  if (Number.isNaN(dob.getTime())) return '—';
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  if (age < 0) return '—';
  return String(age);
}

export function formatSex(gender?: string | null): string {
  if (!gender) return '—';
  return gender.toUpperCase().startsWith('M') ? 'M' : gender.toUpperCase().startsWith('F') ? 'F' : gender;
}

export function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

