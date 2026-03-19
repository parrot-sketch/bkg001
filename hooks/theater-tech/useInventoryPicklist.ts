/**
 * Hook: useInventoryPicklist
 *
 * Manages fetching surgical picklists and logging inventory consumption.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiResponse, isSuccess } from '@/lib/http/apiResponse';
import { toast } from 'sonner';
import { tokenStorage } from '@/lib/auth/token';

function getToken(): string | null {
    return tokenStorage.getAccessToken();
}

export interface PicklistItem {
    id: string;
    inventoryItemId: number;
    name: string;
    isImplant: boolean;
    requiredQty: number;
    consumedQty: number;
    status: 'PENDING' | 'PARTIAL' | 'FULFILLED';
    unitOfMeasure: string;
}

export interface ConsumptionInput {
    inventoryItemId: number;
    batchId: string;
    quantityUsed: number;
    notes?: string;
}

async function fetchPicklist(caseId: string): Promise<PicklistItem[]> {
    const token = getToken();
    const res = await fetch(`/api/theater-tech/inventory/picklist?caseId=${caseId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const json: ApiResponse<PicklistItem[]> = await res.json();
    if (!isSuccess(json)) {
        throw new Error(json.error || 'Failed to fetch picklist');
    }
    return json.data;
}

async function logConsumption(caseId: string, consumptions: ConsumptionInput[]): Promise<void> {
    const token = getToken();
    const res = await fetch('/api/theater-tech/inventory/consume', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ caseId, consumptions }),
    });
    const json: ApiResponse<any> = await res.json();
    if (!isSuccess(json)) {
        throw new Error(json.error || 'Failed to log consumption');
    }
}

export function useInventoryPicklist(caseId: string) {
    const queryClient = useQueryClient();

    const query = useQuery<PicklistItem[]>({
        queryKey: ['inventory-picklist', caseId],
        queryFn: () => fetchPicklist(caseId),
        enabled: !!caseId,
    });

    const mutation = useMutation({
        mutationFn: (consumptions: ConsumptionInput[]) => logConsumption(caseId, consumptions),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-picklist', caseId] });
            toast.success('Consumption logged successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    return {
        ...query,
        logConsumption: mutation.mutate,
        isLogging: mutation.isPending,
    };
}
