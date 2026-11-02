import { create } from 'zustand';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';
import { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';

interface BookAppointmentState {
  isOpen: boolean;
  initialPatientId?: string;
  initialPatient?: PatientResponseDto;
  initialDoctorId?: string;
  initialDoctor?: DoctorResponseDto;
  lockDoctor?: boolean;
  initialDate?: string;
  initialTime?: string;
  initialType?: string;
  source?: AppointmentSource | string;
  bookingChannel?: BookingChannel;
  parentAppointmentId?: number;
  parentConsultationId?: number;
  lastSuccessNonce: number;

  openBookingDialog: (params?: Partial<Omit<BookAppointmentState, 'isOpen' | 'openBookingDialog' | 'closeBookingDialog'>>) => void;
  closeBookingDialog: () => void;
  markBookingSuccess: () => void;
}

export const useBookAppointmentStore = create<BookAppointmentState>((set) => ({
  isOpen: false,
  lastSuccessNonce: 0,

  openBookingDialog: (params) => set({
    isOpen: true,
    initialPatientId: undefined,
    initialPatient: undefined,
    initialDoctorId: undefined,
    initialDoctor: undefined,
    lockDoctor: undefined,
    initialDate: undefined,
    initialTime: undefined,
    initialType: undefined,
    source: undefined,
    bookingChannel: undefined,
    parentAppointmentId: undefined,
    parentConsultationId: undefined,
    ...params
  }),

  closeBookingDialog: () => set({ isOpen: false }),

  markBookingSuccess: () => set((s) => ({ lastSuccessNonce: s.lastSuccessNonce + 1 })),
}));

export function openFollowUpBooking(input: {
  appointmentId: number;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName?: string;
}) {
  const [firstName, ...rest] = input.patientName.trim().split(/\s+/);
  useBookAppointmentStore.getState().openBookingDialog({
    initialPatientId: input.patientId,
    initialPatient: {
      id: input.patientId,
      firstName: firstName || input.patientName,
      lastName: rest.join(' '),
      fullName: input.patientName,
    } as PatientResponseDto,
    initialDoctorId: input.doctorId,
    initialDoctor: {
      id: input.doctorId,
      name: input.doctorName || 'Doctor',
    } as DoctorResponseDto,
    lockDoctor: true,
    initialType: 'Follow-up',
    source: AppointmentSource.DOCTOR_FOLLOW_UP,
    parentAppointmentId: input.appointmentId,
  });
}

export function frontdeskChargeSheetPath(patientId: string, appointmentId: number) {
  return `/frontdesk/patient/${patientId}?tab=charges&appointmentId=${appointmentId}`;
}
