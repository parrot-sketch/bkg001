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
  initialDate?: string;
  initialTime?: string;
  source?: AppointmentSource | string;
  bookingChannel?: BookingChannel;
  parentAppointmentId?: number;
  parentConsultationId?: number;

  openBookingDialog: (params?: Partial<Omit<BookAppointmentState, 'isOpen' | 'openBookingDialog' | 'closeBookingDialog'>>) => void;
  closeBookingDialog: () => void;
}

export const useBookAppointmentStore = create<BookAppointmentState>((set) => ({
  isOpen: false,

  openBookingDialog: (params) => set({
    isOpen: true,
    initialPatientId: undefined,
    initialPatient: undefined,
    initialDoctorId: undefined,
    initialDoctor: undefined,
    initialDate: undefined,
    initialTime: undefined,
    source: undefined,
    bookingChannel: undefined,
    parentAppointmentId: undefined,
    parentConsultationId: undefined,
    ...params
  }),

  closeBookingDialog: () => set({ isOpen: false }),
}));
