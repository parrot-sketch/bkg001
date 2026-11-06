'use client';

/**
 * useChargeSheet — Custom hook for surgical case charge sheet management.
 *
 * Encapsulates all data-fetching, state management, and business logic
 * for the charge sheet feature, shared between TheaterTechBilling and
 * ChargeSheetStep.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import type {
  Service,
  InventoryItem,
  ChargeItem,
  RowDraft,
  ChargeSheetCaseInfo,
} from '@/components/theater-tech/charge-sheet.types';
import { duplicateChargeMessage, findDuplicateChargeLine, hasDuplicateChargeLines } from '@/lib/clinical/chargeSheetLines';

function chargeSheetHeaders(extra?: HeadersInit): HeadersInit {
  const headers = new Headers(extra);
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('hims_access_token');
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

// ── Hook Return Type ────────────────────────────────────────────────────────

export interface UseChargeSheetReturn {
  // State
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  lastSavedAt: Date | null;
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
  suggestedCount: number;
  suggestedServices: Service[];
  caseInfo: ChargeSheetCaseInfo | null;
  duplicateMessage: string | null;
  highlightedItemId: string | null;
  addBlocked: boolean;

  // Actions
  setSearchQuery: (q: string) => void;
  setDropdownOpen: (open: boolean) => void;
  handleAddService: (service: Service) => void;
  handleAddInventory: (item: InventoryItem) => void;
  handleAddCustom: (description: string, quantity: number, amount: number) => boolean;
  handleRemoveItem: (id: string) => void;
  handleQuantityChange: (id: string, value: string) => void;
  handleQuantityBlur: (id: string) => void;
  handleAmountChange: (id: string, value: string) => void;
  handleAmountBlur: (id: string) => void;
  handleDescriptionChange: (id: string, value: string) => void;
  handleDescriptionFocus: (id: string) => void;
  handleDescriptionBlur: (id: string) => void;
  handleDiscountChange: (value: string) => void;
  handleDiscountBlur: () => void;
  handleSave: () => Promise<boolean>;

  // Helpers
  getDraft: (item: ChargeItem) => RowDraft;
}

// ── Hook Implementation ─────────────────────────────────────────────────────

export function useChargeSheet(
  caseId: string,
  initialSuggestedServices?: Service[]
): UseChargeSheetReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastSavedHash, setLastSavedHash] = useState<string>('');

  const [services, setServices] = useState<Service[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  const [chargeItems, setChargeItems] = useState<ChargeItem[]>([]);
  const [rowDrafts, setRowDrafts] = useState<Record<string, RowDraft>>({});

  const [discountStr, setDiscountStr] = useState('0');

  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [suggestedCount, setSuggestedCount] = useState(0);
  const [suggestedServices, setSuggestedServices] = useState<Service[]>([]);
  const [caseInfo, setCaseInfo] = useState<ChargeSheetCaseInfo | null>(null);
  const descriptionSnapshots = useRef<Record<string, Pick<ChargeItem, 'description' | 'type' | 'itemId' | 'catalogAmount'>>>({});
  const suggestedRef = useRef(initialSuggestedServices);
  suggestedRef.current = initialSuggestedServices;

  // ── Load existing billing data ──────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const [billingRes, servicesRes, inventoryRes] = await Promise.all([
          fetch(`/api/surgical-cases/${caseId}/billing`, { headers: chargeSheetHeaders() }),
          fetch('/api/services', { headers: chargeSheetHeaders() }),
          fetch('/api/inventory/items?limit=100', { headers: chargeSheetHeaders() }),
        ]);

        const [billingData, servicesData, inventoryData] = await Promise.all([
          billingRes.json(),
          servicesRes.json(),
          inventoryRes.json(),
        ]);

        if (billingData.success && billingData.data?.surgicalCase) {
          const record = billingData.data.surgicalCase as Record<string, unknown>;
          setCaseInfo({
            patientName: String(record.patientName || 'Patient'),
            fileNumber: (record.patientFileNumber as string | null) ?? null,
            procedureName: (record.procedureName as string | null) ?? null,
            procedureDate: record.procedureDate ? String(record.procedureDate) : null,
            surgeonName: (record.surgeonName as string | null) ?? null,
            chargeSheetNo: (billingData.data.payment?.chargeSheetNo as string | null) ?? null,
          });
        }

        if (billingData.success && billingData.data?.payment) {
          let items: ChargeItem[] =
            billingData.data.payment.billItems?.map((item: unknown) => {
              const rec = item as Record<string, unknown>;
              const isCustom = (rec.isCustom as boolean) || !!rec.customDescription;
              return {
                id: `existing-${rec.id}`,
                description: rec.serviceName as string,
                amount: (rec.unitCost as number) ?? 0,
                quantity: (rec.quantity as number) ?? 1,
                type: isCustom ? 'custom' : (rec.isInventory ? 'inventory' : 'service'),
                itemId: (rec.inventoryItemId ?? rec.serviceId ?? `custom-${rec.id}`) as
                  | number
                  | string,
              };
            }) ?? [];

          const hasExistingCharges = billingData.data.payment.billItems?.length > 0;
          let loadedDiscount = (billingData.data.payment.discount as number) ?? 0;
          let count = 0;
          let suggested: Service[] = [];

          const linkedServices = suggestedRef.current ?? [];
          if (!hasExistingCharges && linkedServices.length > 0) {
            items = linkedServices.map(s => ({
              id: `suggested-${s.id}`,
              description: s.service_name,
              amount: s.price,
              quantity: 1,
              type: 'service',
              itemId: s.id,
            }));
            count = items.length;
            suggested = linkedServices;
          }

          setChargeItems(items);

          const drafts: Record<string, RowDraft> = {};
          for (const it of items) {
            drafts[it.id] = {
              quantityStr: String(it.quantity),
              amountStr: String(it.amount),
            };
          }
          setRowDrafts(drafts);
          setSuggestedCount(count);
          setSuggestedServices(suggested);

          setDiscountStr(String(loadedDiscount));
          // If we auto-populated items, they are not saved yet. Therefore the baseline is empty so isDirty = true.
          const baselineHash = count > 0 ? '' : JSON.stringify({ items, discount: loadedDiscount });
          setLastSavedHash(baselineHash);
          setLastSavedAt(new Date());
        } else if (billingData.success) {
          const suggested = suggestedRef.current ?? [];
          if (suggested.length > 0) {
            const items: ChargeItem[] = suggested.map((service) => ({
              id: `suggested-${service.id}`,
              description: service.service_name,
              amount: service.price,
              quantity: 1,
              type: 'service',
              itemId: service.id,
            }));
            const drafts: Record<string, RowDraft> = {};
            for (const item of items) {
              drafts[item.id] = { quantityStr: String(item.quantity), amountStr: String(item.amount) };
            }
            setChargeItems(items);
            setRowDrafts(drafts);
            setSuggestedCount(items.length);
            setSuggestedServices(suggested);
            setDiscountStr('0');
            setLastSavedHash('');
          }
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

  const currentHash = useMemo(
    () => JSON.stringify({ items: chargeItems, discount: parseFloat(discountStr) || 0 }),
    [chargeItems, discountStr],
  );

  const isDirty = useMemo(() => {
    // If we haven't established a baseline yet, treat as "not dirty" until load completes.
    if (isLoading) return false;
    // If no items and no baseline, not dirty.
    if (!lastSavedHash) return chargeItems.length > 0 || (parseFloat(discountStr) || 0) !== 0;
    return currentHash !== lastSavedHash;
  }, [chargeItems.length, currentHash, discountStr, isLoading, lastSavedHash]);

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

  const draftDuplicate = useMemo(() => {
    const exact = services.find((service) => service.service_name.toLowerCase() === searchQuery.trim().toLowerCase());
    const exactStock = inventoryItems.find((item) => item.name.toLowerCase() === searchQuery.trim().toLowerCase());
    return findDuplicateChargeLine(chargeItems, {
      name: searchQuery,
      serviceId: exact?.id ?? null,
      inventoryId: exactStock?.id ?? null,
    });
  }, [chargeItems, inventoryItems, searchQuery, services]);

  const rowDuplicate = useMemo(() => {
    for (const item of chargeItems) {
      const match = findDuplicateChargeLine(chargeItems, {
        name: item.description,
        serviceId: item.type === 'service' ? Number(item.itemId) : null,
        inventoryId: item.type === 'inventory' ? item.itemId : null,
        exceptId: item.id,
      });
      if (match) return item;
    }
    return null;
  }, [chargeItems]);

  const blockingLine = draftDuplicate ?? rowDuplicate;
  const duplicateMessage = blockingLine ? duplicateChargeMessage(blockingLine.description) : null;
  const highlightedItemId = blockingLine?.id ?? null;
  const addBlocked = draftDuplicate !== null;

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

  const handleAddCustom = useCallback(
    (description: string, quantity: number, amount: number) => {
      const trimmed = description.trim();
      if (!trimmed) return false;

      const exact = services.find((service) => service.service_name.toLowerCase() === trimmed.toLowerCase());
      const exactStock = inventoryItems.find((item) => item.name.toLowerCase() === trimmed.toLowerCase());
      const existing = findDuplicateChargeLine(chargeItems, {
        name: trimmed,
        serviceId: exact?.id ?? null,
        inventoryId: exactStock?.id ?? null,
      });
      if (existing) return false;

      const lineAmount = Number.isFinite(amount) ? amount : 0;
      const lineQty = quantity || 1;
      const newItem: ChargeItem = exact
        ? {
            id: `service-${Date.now()}`,
            description: exact.service_name,
            amount: lineAmount,
            catalogAmount: exact.price,
            quantity: lineQty,
            type: 'service',
            itemId: exact.id,
          }
        : exactStock
        ? {
            id: `inv-${Date.now()}`,
            description: exactStock.name,
            amount: lineAmount,
            catalogAmount: exactStock.unit_cost,
            quantity: lineQty,
            type: 'inventory',
            itemId: exactStock.id,
          }
        : {
            id: `custom-${Date.now()}`,
            description: trimmed,
            amount: lineAmount,
            quantity: lineQty,
            type: 'custom',
            itemId: `custom-${Date.now()}`,
          };

      setChargeItems((prev) => [...prev, newItem]);
      setRowDrafts((prev) => ({
        ...prev,
        [newItem.id]: {
          quantityStr: String(newItem.quantity),
          amountStr: String(newItem.amount),
        },
      }));
      setSearchQuery('');
      setDropdownOpen(false);
      return true;
    },
    [services, inventoryItems, chargeItems]
  );

  const handleDescriptionFocus = useCallback((id: string) => {
    const item = chargeItems.find((line) => line.id === id);
    if (!item) return;
    descriptionSnapshots.current[id] = {
      description: item.description,
      type: item.type,
      itemId: item.itemId,
      catalogAmount: item.catalogAmount,
    };
  }, [chargeItems]);

  const handleDescriptionBlur = useCallback((id: string) => {
    const item = chargeItems.find((line) => line.id === id);
    const snapshot = descriptionSnapshots.current[id];
    if (!item || !snapshot) return;
    const clash = findDuplicateChargeLine(chargeItems, {
      name: item.description,
      serviceId: item.type === 'service' ? Number(item.itemId) : null,
      inventoryId: item.type === 'inventory' ? item.itemId : null,
      exceptId: id,
    });
    if (!item.description.trim() || clash) {
      setChargeItems((prev) => prev.map((line) => (line.id === id ? { ...line, ...snapshot } : line)));
    }
  }, [chargeItems]);

  const handleDescriptionChange = useCallback((id: string, value: string) => {
    const trimmed = value.trim().toLowerCase();
    const serviceMatch = services.find((service) => service.service_name.toLowerCase() === trimmed);
    const stockMatch = inventoryItems.find((item) => item.name.toLowerCase() === trimmed);
    setChargeItems((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      if (serviceMatch) {
        return { ...item, description: value, type: 'service', itemId: serviceMatch.id, catalogAmount: serviceMatch.price };
      }
      if (stockMatch) {
        return { ...item, description: value, type: 'inventory', itemId: stockMatch.id, catalogAmount: stockMatch.unit_cost };
      }
      return { ...item, description: value, type: 'custom', itemId: `custom-${item.id}`, catalogAmount: undefined };
    }));
  }, [services, inventoryItems]);

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
      return false;
    }
    if (hasDuplicateChargeLines(chargeItems)) {
      toast.error('Each item can appear once. Update the quantity on the existing line.');
      return false;
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
          : item.type === 'custom'
          ? {
              customDescription: item.description,
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
        headers: chargeSheetHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ billingItems, discount }),
      });

      const data = await res.json();
      if (data.success) {
        const newCustomCount = chargeItems.filter((item) => item.type === 'custom').length;
        toast.success(
          newCustomCount > 0
            ? `Charge sheet saved. ${newCustomCount} new item${newCustomCount === 1 ? '' : 's'} added to the catalogue.`
            : 'Charge sheet saved',
        );
        setLastSavedAt(new Date());
        let nextItems = chargeItems;
        const servicesRes = await fetch('/api/services', { headers: chargeSheetHeaders() });
        const servicesJson = await servicesRes.json();
        if (servicesJson.success && Array.isArray(servicesJson.data)) {
          const list = servicesJson.data as Service[];
          setServices(list);
          nextItems = chargeItems.map((item) => {
            if (item.type !== 'custom') return item;
            const match = list.find((service) => service.service_name.toLowerCase() === item.description.toLowerCase());
            return match
              ? { ...item, type: 'service' as const, itemId: match.id, description: match.service_name, catalogAmount: match.price }
              : item;
          });
          setChargeItems(nextItems);
        }
        setLastSavedHash(JSON.stringify({ items: nextItems, discount: parseFloat(discountStr) || 0 }));
        if (data.data?.chargeSheetNo) {
          setCaseInfo((current) => current ? { ...current, chargeSheetNo: String(data.data.chargeSheetNo) } : current);
        }
        return true;
      } else {
        toast.error(data.error || 'Failed to save');
        return false;
      }
    } catch (error) {
      console.error('Error saving billing:', error);
      toast.error('Failed to save charge sheet');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [chargeItems, caseId, discount, discountStr]);

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
    isDirty,
    lastSavedAt,
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
    suggestedCount,
    suggestedServices,
    caseInfo,
    duplicateMessage,
    highlightedItemId,
    addBlocked,

    setSearchQuery,
    setDropdownOpen,
    handleAddService,
    handleAddInventory,
    handleAddCustom,
    handleRemoveItem,
    handleQuantityChange,
    handleQuantityBlur,
    handleAmountChange,
    handleAmountBlur,
    handleDescriptionChange,
    handleDescriptionFocus,
    handleDescriptionBlur,
    handleDiscountChange,
    handleDiscountBlur,
    handleSave,

    getDraft,
  };
}
