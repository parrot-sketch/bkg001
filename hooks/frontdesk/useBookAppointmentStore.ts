import { create } from 'zustand';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';

interface BookAppointmentState {
  isOpen: boolean;
  initialPatientId?: string;
  initialDoctorId?: string;
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
    initialDoctorId: undefined,
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
