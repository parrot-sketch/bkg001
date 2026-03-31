/**
 * PatientDetailDto — Full patient profile for detail view.
 *
 * Unlike PatientRegistryDto (list view, minimum necessary),
 * this DTO includes medical fields because the detail page
 * is an authorized, audited view of the full patient record.
 */
export interface PatientDetailDto {
  id: string;
  fileNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address?: string;
  maritalStatus?: string;
  occupation?: string;
  whatsappPhone?: string;
  bloodGroup?: string;
  allergies?: string;
  medicalConditions?: string;
  medicalHistory?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  relation?: string;
  profileImage?: string;
  colorCode?: string;
  createdAt: string;
  updatedAt: string;
  totalAppointments: number;
  lastVisitAt: string | null;
}
