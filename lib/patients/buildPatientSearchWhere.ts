import { Prisma } from '@prisma/client';

export function buildPatientSearchWhere(
  search?: string,
  createdToday?: boolean,
  createdThisMonth?: boolean,
): Prisma.PatientWhereInput {
  const andConditions: Prisma.PatientWhereInput[] = [];

  if (search?.trim()) {
    const s = search.trim();

    const normalizePhoneVariants = (input: string): string[] => {
      const raw = input.trim();
      if (!raw) return [];

      const digitsOnly = raw.replace(/[^\d]/g, '');
      const plusDigits = raw.replace(/[^\d+]/g, '');

      const variants = new Set<string>();
      variants.add(raw);
      variants.add(plusDigits);
      variants.add(digitsOnly);

      if (digitsOnly.length >= 9) {
        if (digitsOnly.startsWith('0') && digitsOnly.length >= 10) {
          const local = digitsOnly.slice(1);
          variants.add(`+254${local}`);
          variants.add(`254${local}`);
        }
        if (digitsOnly.startsWith('254')) {
          const rest = digitsOnly.slice(3);
          variants.add(`+254${rest}`);
          variants.add(`254${rest}`);
          variants.add(`0${rest}`);
        }
        if (digitsOnly.startsWith('7') && digitsOnly.length >= 9) {
          variants.add(`+254${digitsOnly}`);
          variants.add(`254${digitsOnly}`);
          variants.add(`0${digitsOnly}`);
        }
      }

      return Array.from(variants).filter(Boolean);
    };

    const phoneVariants = normalizePhoneVariants(s);
    const lowered = s.toLowerCase();
    const parts = s.split(/\s+/).filter(Boolean);

    const or: Prisma.PatientWhereInput[] = [
      { first_name: { contains: s, mode: 'insensitive' } },
      { last_name: { contains: s, mode: 'insensitive' } },
      { file_number: { contains: s, mode: 'insensitive' } },
      { email: { contains: lowered, mode: 'insensitive' } },
      { file_number: { equals: s, mode: 'insensitive' } },
      { email: { equals: lowered, mode: 'insensitive' } },
    ];

    for (const pv of phoneVariants) {
      or.push({ phone: { contains: pv, mode: 'insensitive' } });
      or.push({ phone: { equals: pv, mode: 'insensitive' } });
    }

    if (parts.length >= 2) {
      const [a, b] = [parts[0], parts.slice(1).join(' ')];
      or.push({ AND: [{ first_name: { contains: a, mode: 'insensitive' } }, { last_name: { contains: b, mode: 'insensitive' } }] });
      or.push({ AND: [{ first_name: { contains: b, mode: 'insensitive' } }, { last_name: { contains: a, mode: 'insensitive' } }] });
    }

    andConditions.push({ OR: or });
  }

  if (createdToday) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    andConditions.push({ created_at: { gte: startOfToday } });
  } else if (createdThisMonth) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    andConditions.push({ created_at: { gte: startOfMonth } });
  }

  if (andConditions.length === 0) return {};
  if (andConditions.length === 1) return andConditions[0];
  return { AND: andConditions };
}
