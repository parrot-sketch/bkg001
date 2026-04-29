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
    source: undefined,
    bookingChannel: undefined,
    parentAppointmentId: undefined,
    parentConsultationId: undefined,
    ...params
  }),

  closeBookingDialog: () => set({ isOpen: false }),

  markBookingSuccess: () => set((s) => ({ lastSuccessNonce: s.lastSuccessNonce + 1 })),
}));
