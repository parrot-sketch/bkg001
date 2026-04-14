'use client';

/**
 * useChargeSheet — Custom hook for surgical case charge sheet management.
 *
 * Encapsulates all data-fetching, state management, and business logic
 * for the charge sheet feature, shared between TheaterTechBilling and
 * ChargeSheetStep.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type {
  Service,
  InventoryItem,
  ChargeItem,
  RowDraft,
} from '@/components/theater-tech/charge-sheet.types';

// ── Hook Return Type ────────────────────────────────────────────────────────

export interface UseChargeSheetReturn {
  // State
  isLoading: boolean;
  isSaving: boolean;
  chargeItems: ChargeItem[];
  searchQuery: string;
  dropdownOpen: boolean;
  filteredServices: Service[];
  filteredInventory: InventoryItem[];
  rowDrafts: Record<string, RowDraft>;
  subtotal: number;
  discount: number;
  total: number;
  discountStr: string;

  // Actions
  setSearchQuery: (q: string) => void;
  setDropdownOpen: (open: boolean) => void;
  handleAddService: (service: Service) => void;
  handleAddInventory: (item: InventoryItem) => void;
  handleRemoveItem: (id: string) => void;
  handleQuantityChange: (id: string, value: string) => void;
  handleQuantityBlur: (id: string) => void;
  handleAmountChange: (id: string, value: string) => void;
  handleAmountBlur: (id: string) => void;
  handleDiscountChange: (value: string) => void;
  handleDiscountBlur: () => void;
  handleSave: () => Promise<void>;

  // Helpers
  getDraft: (item: ChargeItem) => RowDraft;
}

// ── Hook Implementation ─────────────────────────────────────────────────────

export function useChargeSheet(caseId: string): UseChargeSheetReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  const [chargeItems, setChargeItems] = useState<ChargeItem[]>([]);
  const [rowDrafts, setRowDrafts] = useState<Record<string, RowDraft>>({});

  const [discountStr, setDiscountStr] = useState('0');

  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // ── Load existing billing data ──────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const [billingRes, servicesRes, inventoryRes] = await Promise.all([
          fetch(`/api/surgical-cases/${caseId}/billing`),
          fetch('/api/services'),
          fetch('/api/inventory/items?limit=100'),
        ]);

        const [billingData, servicesData, inventoryData] = await Promise.all([
          billingRes.json(),
          servicesRes.json(),
          inventoryRes.json(),
        ]);

        if (billingData.success && billingData.data?.payment) {
          const items: ChargeItem[] =
            billingData.data.payment.billItems?.map((item: unknown) => {
              const rec = item as Record<string, unknown>;
              return {
                id: `existing-${rec.id}`,
                description: rec.serviceName as string,
                amount: (rec.unitCost as number) ?? 0,
                quantity: (rec.quantity as number) ?? 1,
                type:
                  rec.isInventory || rec.inventoryItemId
                    ? 'inventory'
                    : 'service',
                itemId: (rec.inventoryItemId ?? rec.serviceId) as
                  | number
                  | string,
              };
            }) ?? [];

          setChargeItems(items);

          const drafts: Record<string, RowDraft> = {};
          for (const it of items) {
            drafts[it.id] = {
              quantityStr: String(it.quantity),
              amountStr: String(it.amount),
            };
          }
          setRowDrafts(drafts);

          const disc = (billingData.data.payment.discount as number) ?? 0;
          setDiscountStr(String(disc));
        }

        if (servicesData.success) {
          setServices(servicesData.data ?? []);
        }

        if (inventoryData.success && inventoryData.data?.data) {
          const items: InventoryItem[] = inventoryData.data.data.map(
            (i: unknown) => {
              const rec = i as Record<string, unknown>;
              const uc = rec.unitCost;
              const unitCost = typeof uc === 'number' ? uc : Number(uc) || 0;
              return {
                id: String(rec.id),
                name: rec.name as string,
                sku: (rec.sku as string) ?? '',
                unit_cost: unitCost,
                category: (rec.category as string) ?? '',
              };
            }
          );
          setInventoryItems(items);
        }
      } catch (error) {
        console.error('Error loading billing data:', error);
        toast.error('Failed to load billing data');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [caseId]);

  // ── Filtered search results ─────────────────────────────────────────────
  const filteredServices = useMemo(() => {
    if (!searchQuery) return services.slice(0, 10);
    const q = searchQuery.toLowerCase();
    return services
      .filter(
        (s) =>
          s.service_name.toLowerCase().includes(q) ||
          s.category?.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [services, searchQuery]);

  const filteredInventory = useMemo(() => {
    if (!searchQuery) return inventoryItems.slice(0, 10);
    const q = searchQuery.toLowerCase();
    return inventoryItems
      .filter(
        (i) =>
          i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [inventoryItems, searchQuery]);

  // ── Totals ──────────────────────────────────────────────────────────────
  const subtotal = useMemo(
    () =>
      chargeItems.reduce(
        (sum, item) => sum + (item.amount || 0) * (item.quantity || 0),
        0
      ),
    [chargeItems]
  );

  const discount = useMemo(
    () => parseFloat(discountStr) || 0,
    [discountStr]
  );

  const total = useMemo(
    () => Math.max(0, subtotal - discount),
    [subtotal, discount]
  );

  // ── Add items ───────────────────────────────────────────────────────────
  const handleAddService = useCallback(
    (service: Service) => {
      if (
        chargeItems.some(
          (i) => i.type === 'service' && i.itemId === service.id
        )
      )
        return;

      const newItem: ChargeItem = {
        id: `service-${Date.now()}`,
        description: service.service_name,
        amount: service.price ?? 0,
        quantity: 1,
        type: 'service',
        itemId: service.id,
      };

      setChargeItems((prev) => [...prev, newItem]);
      setRowDrafts((prev) => ({
        ...prev,
        [newItem.id]: {
          quantityStr: '1',
          amountStr: String(newItem.amount),
        },
      }));
      setSearchQuery('');
      setDropdownOpen(false);
    },
    [chargeItems]
  );

  const handleAddInventory = useCallback(
    (item: InventoryItem) => {
      if (
        chargeItems.some(
          (i) => i.type === 'inventory' && i.itemId === item.id
        )
      )
        return;

      const newItem: ChargeItem = {
        id: `inv-${Date.now()}`,
        description: item.name,
        amount: item.unit_cost ?? 0,
        quantity: 1,
        type: 'inventory',
        itemId: item.id,
      };

      setChargeItems((prev) => [...prev, newItem]);
      setRowDrafts((prev) => ({
        ...prev,
        [newItem.id]: {
          quantityStr: '1',
          amountStr: String(newItem.amount),
        },
      }));
      setSearchQuery('');
      setDropdownOpen(false);
    },
    [chargeItems]
  );

  const handleRemoveItem = useCallback((id: string) => {
    setChargeItems((prev) => prev.filter((item) => item.id !== id));
    setRowDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  // ── Quantity editing ────────────────────────────────────────────────────
  const handleQuantityChange = useCallback((id: string, value: string) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    setRowDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], quantityStr: value },
    }));
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setChargeItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, quantity: parsed } : item
        )
      );
    }
  }, []);

  const handleQuantityBlur = useCallback((id: string) => {
    setRowDrafts((prev) => {
      const draft = prev[id];
      if (!draft) return prev;
      const parsed = parseInt(draft.quantityStr, 10);
      const safe = isNaN(parsed) || parsed < 1 ? 1 : parsed;
      setChargeItems((items) =>
        items.map((item) =>
          item.id === id ? { ...item, quantity: safe } : item
        )
      );
      return { ...prev, [id]: { ...draft, quantityStr: String(safe) } };
    });
  }, []);

  // ── Amount editing ──────────────────────────────────────────────────────
  const handleAmountChange = useCallback((id: string, value: string) => {
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;
    setRowDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], amountStr: value },
    }));
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      setChargeItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, amount: parsed } : item
        )
      );
    }
  }, []);

  const handleAmountBlur = useCallback((id: string) => {
    setRowDrafts((prev) => {
      const draft = prev[id];
      if (!draft) return prev;
      const parsed = parseFloat(draft.amountStr);
      const safe = isNaN(parsed) || parsed < 0 ? 0 : parsed;
      setChargeItems((items) =>
        items.map((item) =>
          item.id === id ? { ...item, amount: safe } : item
        )
      );
      return { ...prev, [id]: { ...draft, amountStr: String(safe) } };
    });
  }, []);

  // ── Discount editing ────────────────────────────────────────────────────
  const handleDiscountChange = useCallback((value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setDiscountStr(value);
    }
  }, []);

  const handleDiscountBlur = useCallback(() => {
    const parsed = parseFloat(discountStr);
    setDiscountStr(String(isNaN(parsed) || parsed < 0 ? 0 : parsed));
  }, [discountStr]);

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (chargeItems.length === 0) {
      toast.error('Add at least one item to save');
      return;
    }

    setIsSaving(true);
    try {
      const billingItems = chargeItems.map((item) =>
        item.type === 'inventory'
          ? {
              inventoryItemId: Number(item.itemId),
              quantity: item.quantity,
              unitCost: item.amount,
            }
          : {
              serviceId: Number(item.itemId),
              quantity: item.quantity,
              unitCost: item.amount,
            }
      );

      const res = await fetch(`/api/surgical-cases/${caseId}/billing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingItems, discount }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Charge sheet saved');
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Error saving billing:', error);
      toast.error('Failed to save charge sheet');
    } finally {
      setIsSaving(false);
    }
  }, [chargeItems, caseId, discount]);

  // ── Helper ──────────────────────────────────────────────────────────────
  const getDraft = useCallback(
    (item: ChargeItem): RowDraft =>
      rowDrafts[item.id] ?? {
        quantityStr: String(item.quantity),
        amountStr: String(item.amount),
      },
    [rowDrafts]
  );

  return {
    isLoading,
    isSaving,
    chargeItems,
    searchQuery,
    dropdownOpen,
    filteredServices,
    filteredInventory,
    rowDrafts,
    subtotal,
    discount,
    total,
    discountStr,

    setSearchQuery,
    setDropdownOpen,
    handleAddService,
    handleAddInventory,
    handleRemoveItem,
    handleQuantityChange,
    handleQuantityBlur,
    handleAmountChange,
    handleAmountBlur,
    handleDiscountChange,
    handleDiscountBlur,
    handleSave,

    getDraft,
  };
}
