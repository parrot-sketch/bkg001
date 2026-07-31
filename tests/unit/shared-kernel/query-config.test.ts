import { describe, it, expect } from 'vitest';
import {
  consultationKeys,
  consultationsKeys,
  patientHistoryKeys,
  doctorQueueKeys,
  policyConsultation,
  policyConsultations,
  policyPatientHistory,
  policyDoctorQueue,
  policyDefault,
  invalidationTriggers,
  pollingPolicy,
} from '@/shared-kernel/query-config';

describe('Consultation Query Key Factories', () => {
  it('produces consultation keys matching existing usage', () => {
    expect(consultationKeys.all).toEqual(['consultation']);
    expect(consultationKeys.detail(123)).toEqual(['consultation', 123]);
    expect(consultationKeys.detail('abc')).toEqual(['consultation', 'abc']);
  });

  it('produces consultations list keys matching existing usage', () => {
    expect(consultationsKeys.all).toEqual(['consultations']);
    expect(consultationsKeys.pending()).toEqual(['consultations', 'pending']);
    expect(consultationsKeys.byStatus(['PENDING', 'SUBMITTED'])).toEqual([
      'consultations',
      'status',
      'PENDING,SUBMITTED',
    ]);
  });

  it('produces patient history keys matching existing usage', () => {
    expect(patientHistoryKeys.byPatientId('patient-1')).toEqual([
      'patient-consultations',
      'patient-1',
    ]);
  });

  it('produces doctor queue keys matching existing usage', () => {
    expect(doctorQueueKeys.byDoctorId('doctor-1')).toEqual([
      'doctor',
      'queue',
      'doctor-1',
    ]);
  });
});

describe('Cache Policies', () => {
  it('policyConsultation matches current useConsultation behavior', () => {
    expect(policyConsultation.staleTime).toBe(0);
    expect(policyConsultation.retry).toBe(3);
    expect(policyConsultation.refetchOnWindowFocus).toBe(false);
    expect(policyConsultation.refetchOnReconnect).toBe(true);
    expect(policyConsultation.refetchOnMount).toBe(true);
    expect(policyConsultation.refetchInterval).toBeUndefined();
  });

  it('policyConsultations matches current useConsultations behavior', () => {
    expect(policyConsultations.staleTime).toBe(5 * 60 * 1000);
    expect(policyConsultations.gcTime).toBe(10 * 60 * 1000);
    expect(policyConsultations.retry).toBe(2);
    expect(policyConsultations.refetchOnWindowFocus).toBe(true);
    expect(policyConsultations.refetchOnReconnect).toBe(true);
    expect(policyConsultations.refetchOnMount).toBe(true);
  });

  it('policyPatientHistory matches current usePatientConsultationHistory behavior', () => {
    expect(policyPatientHistory.staleTime).toBe(5 * 60 * 1000);
    expect(policyPatientHistory.retry).toBe(2);
  });

  it('policyDoctorQueue matches current useDoctorQueue behavior', () => {
    expect(policyDoctorQueue.staleTime).toBe(30_000);
    expect(policyDoctorQueue.gcTime).toBe(2 * 60 * 1000);
    expect(policyDoctorQueue.retry).toBe(2);
    expect(policyDoctorQueue.refetchInterval).toBe(60_000);
    expect(policyDoctorQueue.networkMode).toBe('offlineFirst');
    expect(policyDoctorQueue.refetchOnWindowFocus).toBe(false);
    expect(policyDoctorQueue.refetchOnReconnect).toBe(true);
  });

  it('policyDefault provides sensible fallbacks', () => {
    expect(policyDefault.staleTime).toBe(5 * 60 * 1000);
    expect(policyDefault.gcTime).toBe(10 * 60 * 1000);
    expect(policyDefault.retry).toBe(2);
    expect(policyDefault.refetchOnWindowFocus).toBe(true);
    expect(policyDefault.refetchOnReconnect).toBe(true);
    expect(policyDefault.refetchOnMount).toBe(true);
  });

  it('all retry delays use capped exponential backoff', () => {
    for (const policy of [
      policyConsultation,
      policyConsultations,
      policyPatientHistory,
      policyDoctorQueue,
      policyDefault,
    ]) {
      expect(policy.retryDelay(0)).toBeGreaterThanOrEqual(1000);
      expect(policy.retryDelay(1)).toBeGreaterThanOrEqual(2000);
      expect(policy.retryDelay(5)).toBe(30000);
    }
  });
});

describe('Invalidation Triggers', () => {
  it('documents consultation start triggers', () => {
    const triggers = invalidationTriggers.consultationStarted.map((fnOrArr) =>
      typeof fnOrArr === 'function' ? fnOrArr('doctor-1') : fnOrArr
    );
    expect(triggers).toContainEqual(['doctor', 'queue', 'doctor-1']);
    expect(triggers).toContainEqual(['appointments']);
    expect(triggers).toContainEqual(['doctor']);
  });

  it('documents consultation completion triggers', () => {
    const triggers = invalidationTriggers.consultationCompleted.map((fnOrArr) =>
      typeof fnOrArr === 'function' ? fnOrArr('123') : fnOrArr
    );
    expect(triggers).toContainEqual(['consultation']);
    expect(triggers).toContainEqual(['consultation', '123']);
    expect(triggers).toContainEqual(['doctor']);
    expect(triggers).toContainEqual(['billing']);
    expect(triggers).toContainEqual(['appointment-billing']);
  });

  it('documents notes saved triggers', () => {
    const triggers = invalidationTriggers.notesSaved.map((fnOrArr) =>
      typeof fnOrArr === 'function' ? fnOrArr('123') : fnOrArr
    );
    expect(triggers).toContainEqual(['consultation', '123']);
  });
});

describe('Polling Policy', () => {
  it('documents doctor queue polling interval', () => {
    expect(pollingPolicy.doctorQueue.intervalMs).toBe(60_000);
    expect(pollingPolicy.doctorQueue.owner).toBe('useDoctorQueue');
  });

  it('documents that consultation polling is disabled', () => {
    expect(pollingPolicy.consultation.intervalMs).toBe(false);
    expect(pollingPolicy.consultation.owner).toBe('useConsultation');
  });
});
