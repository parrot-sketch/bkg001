'use client';

/**
 * Presentation Layer — BillingProvider
 *
 * Owns all billing-related presentation state for the consultation:
 * - Billing line items
 * - Billing total
 * - Discount
 * - Billing warnings
 * - Derived billing values
 *
 * This provider is purely presentational.
 * It does not perform API calls, business validation, or workflow transitions.
 * Billing data is passed in as props by the consumer.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface BillItem {
  readonly id?: number;
  readonly serviceId?: number;
  readonly inventoryItemId?: number;
  readonly serviceName: string;
  readonly quantity: number;
  readonly unitCost: number;
  readonly totalCost: number;
  readonly isInventory: boolean;
}

export interface BillingSummary {
  readonly billItems: BillItem[];
  readonly totalAmount: number;
  readonly discount: number;
  readonly status?: string;
}

interface BillingContextState {
  billingItems: BillItem[];
  billingTotal: number;
  discount: number;
  billingWarnings: string[];
}

interface BillingContextValue extends BillingContextState {
  setBillingItems: (items: BillItem[]) => void;
  setBillingTotal: (total: number) => void;
  setDiscount: (discount: number) => void;
  clearBillingWarnings: () => void;
  hasBilling: boolean;
  paymentStatus: string | undefined;
  consultationFee: number;
  netAmount: number;
}

const BillingContext = createContext<BillingContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface BillingProviderProps {
  children: ReactNode;
  existingBilling?: BillingSummary | null;
}

export function BillingProvider({
  children,
  existingBilling,
}: BillingProviderProps) {
  const [billingItems, setBillingItems] = useState<BillItem[]>([]);
  const [billingTotal, setBillingTotal] = useState(0);
  const [discount, setDiscount] = useState(() => existingBilling?.discount ?? 0);
  const [billingWarnings, setBillingWarnings] = useState<string[]>([]);

  const hasBilling = useMemo(() => {
    if (existingBilling?.billItems?.length) return true;
    if (billingItems.length > 0) return true;
    return false;
  }, [existingBilling, billingItems]);

  const paymentStatus = existingBilling?.status;

  const consultationFee = useMemo(() => {
    if (existingBilling?.totalAmount) return existingBilling.totalAmount;
    return billingTotal;
  }, [existingBilling, billingTotal]);

  const netAmount = useMemo(() => {
    return Math.max(0, consultationFee - discount);
  }, [consultationFee, discount]);

  const clearBillingWarnings = useCallback(() => {
    setBillingWarnings([]);
  }, []);

  const value = useMemo(() => ({
    billingItems,
    billingTotal,
    discount,
    billingWarnings,
    setBillingItems,
    setBillingTotal,
    setDiscount,
    clearBillingWarnings,
    hasBilling,
    paymentStatus,
    consultationFee,
    netAmount,
  }), [billingItems, billingTotal, discount, billingWarnings, clearBillingWarnings, hasBilling, paymentStatus, consultationFee, netAmount]);

  return (
    <BillingContext.Provider value={value}>
      {children}
    </BillingContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useBillingContext() {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBillingContext must be used within BillingProvider');
  }
  return context;
}
