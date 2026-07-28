import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryWrapper } from '@/tests/frontend/mocks/react-query';
import { ConsultationProvider, useConsultationContext } from '@/contexts/ConsultationContext';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/patient/useAuth', () => ({
  useAuth: () => ({ user: { id: 'doctor-1' } }),
}));

const ConsultationWrapper = ({ children, initialAppointmentId }: { children: React.ReactNode; initialAppointmentId?: number }) => (
  <QueryWrapper>
    <ConsultationProvider initialAppointmentId={initialAppointmentId}>
      {children}
    </ConsultationProvider>
  </QueryWrapper>
);

describe('ConsultationContext Browser Compatibility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  describe('Legacy Contract Shape', () => {
    it('exposes complete legacy state.workflow shape', async () => {
      const { result } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      const workflow = result.current.state.workflow;
      expect(workflow).toBeDefined();
      expect(typeof workflow.state).toBe('string');
      expect(workflow.error).toBeNull();
      expect(typeof workflow.isDirty).toBe('boolean');
      expect(workflow.appointmentId).toBeNull();
      expect(workflow.patientId).toBeNull();
      expect(workflow.consultationId).toBeNull();
      expect(workflow.lastSavedAt).toBeNull();
    });

    it('exposes complete legacy state object', async () => {
      const { result } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      const state = result.current.state;
      expect(state.workflow).toBeDefined();
      expect(state.appointment).toBeNull();
      expect(state.patient).toBeNull();
      expect(state.vitals).toBeNull();
      expect(state.consultation).toBeNull();
      expect(state.doctorId).toBeNull();
      expect(state.notes).toEqual({});
      expect(state.outcomeType).toBeNull();
      expect(state.patientDecision).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isSaving).toBe(false);
      expect(state.showCompleteDialog).toBe(false);
      expect(state.showStartDialog).toBe(false);
      expect(state.autoSaveStatus).toBe('idle');
    });

    it('exposes all legacy computed properties with correct types', async () => {
      const { result } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      expect(typeof result.current.isActive).toBe('boolean');
      expect(typeof result.current.isReadOnly).toBe('boolean');
      expect(typeof result.current.canSave).toBe('boolean');
      expect(typeof result.current.canComplete).toBe('boolean');
      expect(Array.isArray(result.current.waitingQueue)).toBe(true);
      expect(typeof result.current.refetchQueue).toBe('function');
      expect(typeof result.current.isQueueRefetching).toBe('boolean');
      expect(typeof result.current.loadWaitingQueue).toBe('function');
    });

    it('exposes all 13 legacy action callbacks', async () => {
      const { result } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      expect(typeof result.current.loadAppointment).toBe('function');
      expect(typeof result.current.startConsultation).toBe('function');
      expect(typeof result.current.closeStartDialog).toBe('function');
      expect(typeof result.current.saveDraft).toBe('function');
      expect(typeof result.current.saveNotes).toBe('function');
      expect(typeof result.current.updateNotes).toBe('function');
      expect(typeof result.current.setOutcome).toBe('function');
      expect(typeof result.current.setPatientDecision).toBe('function');
      expect(typeof result.current.openCompleteDialog).toBe('function');
      expect(typeof result.current.closeCompleteDialog).toBe('function');
      expect(typeof result.current.completeConsultation).toBe('function');
      expect(typeof result.current.switchToPatient).toBe('function');
      expect(typeof result.current.goToSurgeryPlanning).toBe('function');
    });
  });

  describe('Null Safety (Consumer page.tsx pattern)', () => {
    it('state.workflow.error is accessible without runtime error', async () => {
      const { result } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      expect(() => result.current.state.workflow.error).not.toThrow();
      expect(result.current.state.workflow.error).toBeNull();
    });

    it('state.consultation is null initially without runtime error', async () => {
      const { result } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      expect(() => result.current.state.consultation).not.toThrow();
      expect(result.current.state.consultation).toBeNull();
    });

    it('state.doctorId is null initially without runtime error', async () => {
      const { result } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      expect(() => result.current.state.doctorId).not.toThrow();
      expect(result.current.state.doctorId).toBeNull();
    });

    it('state.workflow nested properties are all accessible', async () => {
      const { result } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      expect(() => result.current.state.workflow.state).not.toThrow();
      expect(() => result.current.state.workflow.isDirty).not.toThrow();
      expect(() => result.current.state.workflow.appointmentId).not.toThrow();
      expect(() => result.current.state.workflow.patientId).not.toThrow();
      expect(() => result.current.state.workflow.consultationId).not.toThrow();
      expect(() => result.current.state.workflow.lastSavedAt).not.toThrow();
    });
  });

  describe('Dialog Compatibility (Consumer page.tsx pattern)', () => {
    it('showCompleteDialog reflects dialog state', async () => {
      const { result } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      expect(result.current.state.showCompleteDialog).toBe(false);
      expect(result.current.state.showStartDialog).toBe(false);
    });

    it('openCompleteDialog and closeCompleteDialog are callable', async () => {
      const { result } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      expect(() => result.current.openCompleteDialog()).not.toThrow();
      expect(() => result.current.closeCompleteDialog()).not.toThrow();
    });

    it('closeStartDialog is callable', async () => {
      const { result } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      expect(() => result.current.closeStartDialog()).not.toThrow();
    });
  });

  describe('Documentation Compatibility', () => {
    it('notes field is an object (not undefined)', async () => {
      const { result } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      expect(result.current.state.notes).toBeDefined();
      expect(typeof result.current.state.notes).toBe('object');
      expect(Object.keys(result.current.state.notes).length).toBe(0);
    });

    it('updateNotes and setOutcome are callable', async () => {
      const { result } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      expect(() => result.current.updateNotes('chiefComplaint', 'test')).not.toThrow();
      expect(() => result.current.setOutcome('OUTCOME_REQUIRES_CONSENT' as any)).not.toThrow();
    });

    it('setPatientDecision accepts null', async () => {
      const { result } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      expect(() => result.current.setPatientDecision(null)).not.toThrow();
    });
  });

  describe('Memoization (Performance Compatibility)', () => {
    it('state object is referentially stable across renders', async () => {
      const { result, rerender } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      const firstState = result.current.state;
      rerender();
      const secondState = result.current.state;

      expect(firstState).toBe(secondState);
    });

    it('workflow object is referentially stable across renders', async () => {
      const { result, rerender } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      const firstWorkflow = result.current.state.workflow;
      rerender();
      const secondWorkflow = result.current.state.workflow;

      expect(firstWorkflow).toBe(secondWorkflow);
    });

    it('context value is referentially stable when dependencies unchanged', async () => {
      const { result, rerender } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      const firstValue = result.current;
      rerender();
      const secondValue = result.current;

      expect(firstValue).toBe(secondValue);
    });
  });

  describe('Loading Flags', () => {
    it('isLoading is false initially', async () => {
      const { result } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      expect(result.current.state.isLoading).toBe(false);
    });

    it('isSaving is false initially', async () => {
      const { result } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      expect(result.current.state.isSaving).toBe(false);
    });

    it('autoSaveStatus is idle initially', async () => {
      const { result } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      expect(result.current.state.autoSaveStatus).toBe('idle');
    });
  });

  describe('Queue Delegation', () => {
    it('waitingQueue is an array', async () => {
      const { result } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      expect(Array.isArray(result.current.waitingQueue)).toBe(true);
    });

    it('refetchQueue is a function', async () => {
      const { result } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      expect(typeof result.current.refetchQueue).toBe('function');
    });

    it('loadWaitingQueue is a function', async () => {
      const { result } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      expect(typeof result.current.loadWaitingQueue).toBe('function');
    });
  });

  describe('Error Outside Provider', () => {
    it('throws when used outside ConsultationProvider', async () => {
      expect(() => {
        renderHook(() => useConsultationContext());
      }).toThrow('useConsultationContext must be used within ConsultationProvider');
    });
  });

  describe('Consumer Pattern: page.tsx error handling', () => {
    it('supports the page.tsx error destructuring pattern', async () => {
      const { result } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      // Pattern from page.tsx: if (state.workflow.error) { ... }
      const error = result.current.state.workflow.error;
      if (error) {
        expect(typeof error).toBe('string');
      }
      expect(error).toBeNull();
    });

    it('supports destructuring consultation and doctorId from state', async () => {
      const { result } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      const { consultation, doctorId } = result.current.state;
      expect(consultation).toBeNull();
      expect(doctorId).toBeNull();
    });
  });

  describe('Consumer Pattern: ConsultationWorkspaceOptimized', () => {
    it('supports the workspace state.consultation access pattern', async () => {
      const { result } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      const { state } = result.current;
      expect(() => state.consultation).not.toThrow();
      expect(state.consultation).toBeNull();
    });

    it('supports isActive and isReadOnly from workspace', async () => {
      const { result } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      const { isActive, isReadOnly } = result.current;
      expect(typeof isActive).toBe('boolean');
      expect(typeof isReadOnly).toBe('boolean');
    });

    it('supports openCompleteDialog from workspace', async () => {
      const { result } = renderHook(() => useConsultationContext(), {
        wrapper: ({ children }) => ConsultationWrapper({ children }),
      });

      expect(() => result.current.openCompleteDialog()).not.toThrow();
    });
  });
});
