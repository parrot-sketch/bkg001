import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import type { PatientApi } from '@/domain/interfaces/services/PatientApi';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { VitalsData } from '@/providers/patient/PatientContextProvider';
import { PatientContextProvider, usePatientContext } from '@/providers/patient/PatientContextProvider';

function makePatientApi(overrides: Partial<PatientApi> = {}): PatientApi {
  return {
    loadPatient: vi.fn().mockResolvedValue({ success: true, data: { id: '1', fileNumber: 'P001', firstName: 'John', lastName: 'Doe', fullName: 'John Doe', dateOfBirth: new Date(), age: 30, gender: 'Male', email: 'john@test.com', phone: '123', hasPrivacyConsent: true, hasServiceConsent: true, hasMedicalConsent: true } as PatientResponseDto }),
    loadPatientAppointments: vi.fn().mockResolvedValue({ success: true, data: [] }),
    loadUpcomingAppointments: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getPatientVitals: vi.fn().mockResolvedValue({ success: true, data: [] }),
    ...overrides,
  } as unknown as PatientApi;
}

const samplePatient = {
  id: '1',
  fileNumber: 'P001',
  firstName: 'John',
  lastName: 'Doe',
  fullName: 'John Doe',
  dateOfBirth: new Date('1990-01-01'),
  age: 30,
  gender: 'Male',
  email: 'john@test.com',
  phone: '123',
  hasPrivacyConsent: true,
  hasServiceConsent: true,
  hasMedicalConsent: true,
} as PatientResponseDto;

const sampleAppointment = {
  id: 1,
  patientId: '1',
  doctorId: 'doc-1',
  appointmentDate: new Date(),
  time: '10:00',
  status: 'CHECKED_IN',
  type: 'CONSULTATION',
} as AppointmentResponseDto;

const sampleVitals = {
  bodyTemperature: 36.5,
  systolic: 120,
  diastolic: 80,
  heartRate: '72',
  respiratoryRate: 16,
  oxygenSaturation: 98,
  weight: 70,
  height: 175,
  recordedAt: '2024-01-01T10:00:00Z',
  recordedBy: 'nurse-1',
} as VitalsData;

function wrapper(patientApi: PatientApi, props: { patient?: PatientResponse | null; appointment?: AppointmentResponse | null; vitals?: VitalsData | null; isLoading?: boolean; error?: string | null; consultationId?: number | null } = {}) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <PatientContextProvider
        patientApi={patientApi}
        patient={props.patient}
        appointment={props.appointment}
        vitals={props.vitals}
        isLoading={props.isLoading ?? false}
        error={props.error ?? null}
        consultationId={props.consultationId ?? 1}
      >
        {children}
      </PatientContextProvider>
    );
  };
}

describe('PatientContextProvider', () => {
  let patientApi: PatientApi;

  beforeEach(() => {
    vi.clearAllMocks();
    patientApi = makePatientApi();
  });

  it('returns initial state from props', async () => {
    const { result } = renderHook(() => usePatientContext(), {
      wrapper: wrapper(patientApi, { patient: samplePatient, appointment: sampleAppointment, vitals: sampleVitals }),
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.patient).toEqual(samplePatient);
    expect(result.current.appointment).toEqual(sampleAppointment);
    expect(result.current.vitals).toEqual(sampleVitals);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns empty state when no props provided', async () => {
    const { result } = renderHook(() => usePatientContext(), {
      wrapper: wrapper(patientApi, { patient: null, appointment: null, vitals: null }),
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.patient).toBeNull();
    expect(result.current.appointment).toBeNull();
    expect(result.current.vitals).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('refreshes patient data via PatientApi', async () => {
    const refreshedPatient = { ...samplePatient, firstName: 'Jane' };
    patientApi = makePatientApi({
      loadPatient: vi.fn().mockResolvedValue({ success: true, data: refreshedPatient }),
    });

    const { result } = renderHook(() => usePatientContext(), {
      wrapper: wrapper(patientApi, { patient: samplePatient, appointment: sampleAppointment, vitals: sampleVitals }),
    });

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.refreshPatient();
    });

    expect(patientApi.loadPatient).toHaveBeenCalledWith(samplePatient.id);
    expect(result.current.patient?.firstName).toBe('Jane');
  });

  it('handles patient refresh failure', async () => {
    patientApi = makePatientApi({
      loadPatient: vi.fn().mockResolvedValue({ success: false, error: { message: 'Not found' } }),
    });

    const { result } = renderHook(() => usePatientContext(), {
      wrapper: wrapper(patientApi, { patient: samplePatient, appointment: sampleAppointment, vitals: sampleVitals }),
    });

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.refreshPatient();
    });

    expect(result.current.error).toBe('Not found');
  });

  it('refreshes appointments via PatientApi', async () => {
    const newAppointment = { ...sampleAppointment, id: 2 };
    patientApi = makePatientApi({
      loadPatientAppointments: vi.fn().mockResolvedValue({ success: true, data: [newAppointment] }),
    });

    const { result } = renderHook(() => usePatientContext(), {
      wrapper: wrapper(patientApi, { patient: samplePatient, appointment: sampleAppointment, vitals: sampleVitals }),
    });

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.refreshAppointments();
    });

    expect(patientApi.loadPatientAppointments).toHaveBeenCalledWith(samplePatient.id);
    expect(result.current.appointment?.id).toBe(2);
  });

  it('refreshes vitals via PatientApi', async () => {
    const newVitals = {
      bodyTemperature: 37.0,
      systolic: 130,
      diastolic: 85,
      heartRate: '80',
      respiratoryRate: 18,
      oxygenSaturation: 99,
      weight: 72,
      height: 176,
      recordedAt: '2024-01-02T10:00:00Z',
      recordedBy: 'nurse-2',
    };
    patientApi = makePatientApi({
      getPatientVitals: vi.fn().mockResolvedValue({ success: true, data: [newVitals] }),
    });

    const { result } = renderHook(() => usePatientContext(), {
      wrapper: wrapper(patientApi, { patient: samplePatient, appointment: sampleAppointment, vitals: sampleVitals, consultationId: 1 }),
    });

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.refreshVitals();
    });

    expect(patientApi.getPatientVitals).toHaveBeenCalledWith(samplePatient.id, 1);
    expect(result.current.vitals?.bodyTemperature).toBe(37.0);
  });

  it('does not refresh when patient is null', async () => {
    const { result } = renderHook(() => usePatientContext(), {
      wrapper: wrapper(patientApi, { patient: null, appointment: null, vitals: null }),
    });

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.refreshPatient();
    });

    expect(patientApi.loadPatient).not.toHaveBeenCalled();
  });

  it('sets loading state during refresh', async () => {
    patientApi = makePatientApi({
      loadPatient: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true, data: samplePatient }), 100))),
    });

    const { result } = renderHook(() => usePatientContext(), {
      wrapper: wrapper(patientApi, { patient: samplePatient, appointment: sampleAppointment, vitals: sampleVitals }),
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.refreshPatient();
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('throws error when used outside provider', () => {
    expect(() => {
      renderHook(() => usePatientContext());
    }).toThrow('usePatientContext must be used within PatientContextProvider');
  });
});
