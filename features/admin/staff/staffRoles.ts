import { Role } from '@/domain/enums/Role';

export const ADMIN_MANAGED_ROLES: readonly Role[] = [
  Role.DOCTOR,
  Role.NURSE,
  Role.FRONTDESK,
  Role.THEATER_TECHNICIAN,
  Role.LAB_TECHNICIAN,
  Role.CASHIER,
  Role.STORES,
  Role.ADMIN,
] as const;

export const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: 'Admin',
  [Role.DOCTOR]: 'Doctor',
  [Role.NURSE]: 'Nurse',
  [Role.FRONTDESK]: 'Frontdesk',
  [Role.THEATER_TECHNICIAN]: 'Theater Tech',
  [Role.LAB_TECHNICIAN]: 'Lab Tech',
  [Role.CASHIER]: 'Cashier',
  [Role.STORES]: 'Stores',
  [Role.PATIENT]: 'Patient',
};

export const ROLE_COLORS: Partial<Record<Role, string>> = {
  [Role.DOCTOR]: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  [Role.NURSE]: 'bg-sky-50 text-sky-700 border-sky-100',
  [Role.FRONTDESK]: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  [Role.THEATER_TECHNICIAN]: 'bg-violet-50 text-violet-700 border-violet-100',
  [Role.LAB_TECHNICIAN]: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  [Role.CASHIER]: 'bg-rose-50 text-rose-700 border-rose-100',
  [Role.STORES]: 'bg-orange-50 text-orange-700 border-orange-100',
  [Role.ADMIN]: 'bg-amber-50 text-amber-700 border-amber-100',
};

export const DOCTOR_SPECIALIZATION_PRESETS: readonly string[] = [
  'General Practice',
  'Surgery',
  'Anaesthesiology',
] as const;

