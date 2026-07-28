import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { BillingProvider, useBillingContext } from '@/providers/billing/BillingProvider';
import { QueryWrapper } from '@/tests/frontend/mocks/react-query';
import type { BillItem } from '@/providers/billing/BillingProvider';

function wrapper({ children, existingBilling }: { children: React.ReactNode; existingBilling?: any }) {
  return function Wrapper({ children: innerChildren }: { children: React.ReactNode }) {
    return (
      <QueryWrapper>
        <BillingProvider existingBilling={existingBilling}>
          {innerChildren}
        </BillingProvider>
      </QueryWrapper>
    );
  };
}

describe('BillingProvider', () => {
  it('returns initial empty state', () => {
    const { result } = renderHook(() => useBillingContext(), {
      wrapper: wrapper({}),
    });

    expect(result.current.billingItems).toEqual([]);
    expect(result.current.billingTotal).toBe(0);
    expect(result.current.discount).toBe(0);
    expect(result.current.billingWarnings).toEqual([]);
    expect(result.current.hasBilling).toBe(false);
    expect(result.current.paymentStatus).toBeUndefined();
    expect(result.current.consultationFee).toBe(0);
    expect(result.current.netAmount).toBe(0);
  });

  it('derives billing values from existingBilling', () => {
    const existingBilling = {
      billItems: [{ id: 1, name: 'Consultation', quantity: 1, unitPrice: 100, total: 100 }],
      totalAmount: 100,
      discount: 20,
      status: 'PAID',
    };

    const { result } = renderHook(() => useBillingContext(), {
      wrapper: wrapper({ existingBilling }),
    });

    expect(result.current.hasBilling).toBe(true);
    expect(result.current.consultationFee).toBe(100);
    expect(result.current.paymentStatus).toBe('PAID');
    expect(result.current.netAmount).toBe(80);
  });

  it('computes netAmount correctly', () => {
    const existingBilling = {
      totalAmount: 200,
      discount: 50,
    };

    const { result } = renderHook(() => useBillingContext(), {
      wrapper: wrapper({ existingBilling }),
    });

    expect(result.current.netAmount).toBe(150);
  });

  it('updates billing items', () => {
    const items = [{ id: 1, name: 'Test', quantity: 1, unitPrice: 50, total: 50 }];

    const { result } = renderHook(() => useBillingContext(), {
      wrapper: wrapper({}),
    });

    act(() => {
      result.current.setBillingItems(items);
    });

    expect(result.current.billingItems).toEqual(items);
    expect(result.current.hasBilling).toBe(true);
  });

  it('updates billing total', () => {
    const { result } = renderHook(() => useBillingContext(), {
      wrapper: wrapper({}),
    });

    act(() => {
      result.current.setBillingTotal(150);
    });

    expect(result.current.billingTotal).toBe(150);
    expect(result.current.consultationFee).toBe(150);
  });

  it('updates discount', () => {
    const { result } = renderHook(() => useBillingContext(), {
      wrapper: wrapper({}),
    });

    act(() => {
      result.current.setBillingTotal(100);
      result.current.setDiscount(25);
    });

    expect(result.current.discount).toBe(25);
    expect(result.current.netAmount).toBe(75);
  });

  it('clears billing warnings', () => {
    const { result } = renderHook(() => useBillingContext(), {
      wrapper: wrapper({}),
    });

    expect(result.current.billingWarnings).toEqual([]);

    act(() => {
      result.current.clearBillingWarnings();
    });

    expect(result.current.billingWarnings).toEqual([]);
  });

  it('hasBilling returns true when billingItems exist', () => {
    const { result } = renderHook(() => useBillingContext(), {
      wrapper: wrapper({}),
    });

    expect(result.current.hasBilling).toBe(false);

    act(() => {
      result.current.setBillingItems([{ id: 1, name: 'Item', quantity: 1, unitPrice: 10, total: 10 }]);
    });

    expect(result.current.hasBilling).toBe(true);
  });

  it('throws error when used outside provider', () => {
    expect(() => {
      renderHook(() => useBillingContext());
    }).toThrow('useBillingContext must be used within BillingProvider');
  });
});
