import { Patient } from '../../entities/Patient';
import { Email } from '../../value-objects/Email';

export interface PatientFilters {
  search?: string;
  page: number;
  limit: number;
}

export interface PatientRegistryRecord {
  id: string;
  fileNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phone: string;
  profileImage?: string;
  colorCode?: string;
  createdAt: string;
  totalVisits: number;
  lastVisitAt: string | null;
  queueStatus: 'WAITING' | 'IN_CONSULTATION' | null;
  outstandingBalance: number;
}

export interface PatientListResult {
  records: PatientRegistryRecord[];
  totalRecords: number;
  totalPages: number;
  currentPage: number;
}

export interface PatientStats {
  totalRecords: number;
  newToday: number;
  newThisMonth: number;
}

export interface IPatientRepository {
  findById(id: string): Promise<Patient | null>;
  findByEmail(email: Email): Promise<Patient | null>;
  save(patient: Patient): Promise<void>;
  update(patient: Patient): Promise<void>;
  generateNextFileNumber(): Promise<string>;

  findWithFilters(filters: PatientFilters): Promise<PatientListResult>;
  getStats(): Promise<PatientStats>;
}
