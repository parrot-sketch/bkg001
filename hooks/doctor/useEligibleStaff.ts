
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/use-debounce';
import { SurgicalRole } from '@prisma/client';
import { casePlanApi } from '@/lib/api/case-plan';

interface EligibleStaffParams {
    caseId: string;
    surgicalRole?: SurgicalRole | null;
    query?: string;
    page?: number;
}

interface StaffMember {
    id: string;
    fullName: string;
    email: string;
    role: string;
    specialization?: string;
    licenseNumber?: string;
    department?: string;
}

interface EligibleStaffResponse {
    items: StaffMember[];
    meta: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

async function fetchEligibleStaff(params: EligibleStaffParams): Promise<EligibleStaffResponse> {
    if (!params.caseId || !params.surgicalRole) return { items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };

    const response = await casePlanApi.getEligibleStaff({
        caseId: params.caseId,
        surgicalRole: params.surgicalRole,
        q: params.query,
        page: params.page,
        pageSize: 20 // Default
    });

    if (!response.success) throw new Error(response.error);
    return response.data;
}

export function useEligibleStaff(params: EligibleStaffParams) {
    const debouncedQuery = useDebounce(params.query, 300);

    return useQuery({
        queryKey: ['eligible-staff', params.caseId, params.surgicalRole, debouncedQuery, params.page],
        queryFn: () => fetchEligibleStaff({ ...params, query: debouncedQuery }),
        enabled: !!params.caseId && !!params.surgicalRole,
        staleTime: 1000 * 60, // 1 minute
    });
}
