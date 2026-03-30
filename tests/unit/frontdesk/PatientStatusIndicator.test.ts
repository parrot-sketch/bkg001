/**
 * Unit Tests for PatientStatusIndicator
 * 
 * Tests the getPatientStatus utility function to ensure correct status determination
 * based on patient data (queue status, outstanding balance, last visit).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getPatientStatus } from '@/components/frontdesk/PatientStatusIndicator';

describe('getPatientStatus', () => {
  const baseDate = new Date('2024-01-15T10:00:00Z');
  
  beforeEach(() => {
    // Mock the current date to ensure consistent test results
    vi.useFakeTimers();
    vi.setSystemTime(baseDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Queue Status (Highest Priority)', () => {
    it('should return "In Queue" when patient is WAITING', () => {
      const status = getPatientStatus({
        lastVisit: new Date('2024-01-10'),
        currentQueueStatus: 'WAITING',
        outstandingBalance: 0,
      });

      expect(status.label).toBe('In Queue');
      expect(status.color).toBe('blue');
      expect(status.priority).toBe(1);
    });

    it('should return "In Queue" when patient is IN_CONSULTATION', () => {
      const status = getPatientStatus({
        lastVisit: new Date('2024-01-10'),
        currentQueueStatus: 'IN_CONSULTATION',
        outstandingBalance: 0,
      });

      expect(status.label).toBe('In Queue');
      expect(status.color).toBe('blue');
      expect(status.priority).toBe(1);
    });

    it('should prioritize queue status over outstanding balance', () => {
      const status = getPatientStatus({
        lastVisit: new Date('2024-01-10'),
        currentQueueStatus: 'WAITING',
        outstandingBalance: 500,
      });

      expect(status.label).toBe('In Queue');
      expect(status.color).toBe('blue');
      expect(status.priority).toBe(1);
    });
  });

  describe('Outstanding Balance (Priority 2)', () => {
    it('should return "Balance Due" when outstanding balance is positive', () => {
      const status = getPatientStatus({
        lastVisit: new Date('2024-01-10'),
        currentQueueStatus: null,
        outstandingBalance: 100,
      });

      expect(status.label).toBe('Balance Due');
      expect(status.color).toBe('red');
      expect(status.priority).toBe(2);
    });

    it('should return "Balance Due" for large outstanding balance', () => {
      const status = getPatientStatus({
        lastVisit: new Date('2024-01-10'),
        currentQueueStatus: null,
        outstandingBalance: 5000,
      });

      expect(status.label).toBe('Balance Due');
      expect(status.color).toBe('red');
      expect(status.priority).toBe(2);
    });

    it('should not return "Balance Due" when balance is zero', () => {
      const status = getPatientStatus({
        lastVisit: new Date('2024-01-10'),
        currentQueueStatus: null,
        outstandingBalance: 0,
      });

      expect(status.label).not.toBe('Balance Due');
    });
  });

  describe('Inactive Status (Priority 3)', () => {
    it('should return "Inactive" when last visit was more than 90 days ago', () => {
      const ninetyOneDaysAgo = new Date(baseDate);
      ninetyOneDaysAgo.setDate(ninetyOneDaysAgo.getDate() - 91);

      const status = getPatientStatus({
        lastVisit: ninetyOneDaysAgo,
        currentQueueStatus: null,
        outstandingBalance: 0,
      });

      expect(status.label).toBe('Inactive');
      expect(status.color).toBe('amber');
      expect(status.priority).toBe(3);
    });

    it('should return "Inactive" when patient has never visited', () => {
      const status = getPatientStatus({
        lastVisit: null,
        currentQueueStatus: null,
        outstandingBalance: 0,
      });

      expect(status.label).toBe('Inactive');
      expect(status.color).toBe('amber');
      expect(status.priority).toBe(3);
    });

    it('should return "Inactive" when last visit was exactly 91 days ago', () => {
      const ninetyOneDaysAgo = new Date(baseDate);
      ninetyOneDaysAgo.setDate(ninetyOneDaysAgo.getDate() - 91);

      const status = getPatientStatus({
        lastVisit: ninetyOneDaysAgo,
        currentQueueStatus: null,
        outstandingBalance: 0,
      });

      expect(status.label).toBe('Inactive');
    });
  });

  describe('Active Status (Default)', () => {
    it('should return "Active" when patient visited within 90 days', () => {
      const thirtyDaysAgo = new Date(baseDate);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const status = getPatientStatus({
        lastVisit: thirtyDaysAgo,
        currentQueueStatus: null,
        outstandingBalance: 0,
      });

      expect(status.label).toBe('Active');
      expect(status.color).toBe('emerald');
      expect(status.priority).toBe(4);
    });

    it('should return "Active" when last visit was exactly 90 days ago', () => {
      const ninetyDaysAgo = new Date(baseDate);
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const status = getPatientStatus({
        lastVisit: ninetyDaysAgo,
        currentQueueStatus: null,
        outstandingBalance: 0,
      });

      expect(status.label).toBe('Active');
    });

    it('should return "Active" when patient visited yesterday', () => {
      const yesterday = new Date(baseDate);
      yesterday.setDate(yesterday.getDate() - 1);

      const status = getPatientStatus({
        lastVisit: yesterday,
        currentQueueStatus: null,
        outstandingBalance: 0,
      });

      expect(status.label).toBe('Active');
    });
  });

  describe('Priority Order', () => {
    it('should prioritize queue status over inactive status', () => {
      const ninetyOneDaysAgo = new Date(baseDate);
      ninetyOneDaysAgo.setDate(ninetyOneDaysAgo.getDate() - 91);

      const status = getPatientStatus({
        lastVisit: ninetyOneDaysAgo,
        currentQueueStatus: 'WAITING',
        outstandingBalance: 0,
      });

      expect(status.label).toBe('In Queue');
      expect(status.priority).toBe(1);
    });

    it('should prioritize balance due over inactive status', () => {
      const ninetyOneDaysAgo = new Date(baseDate);
      ninetyOneDaysAgo.setDate(ninetyOneDaysAgo.getDate() - 91);

      const status = getPatientStatus({
        lastVisit: ninetyOneDaysAgo,
        currentQueueStatus: null,
        outstandingBalance: 100,
      });

      expect(status.label).toBe('Balance Due');
      expect(status.priority).toBe(2);
    });
  });
});
