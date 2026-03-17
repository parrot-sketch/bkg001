/**
 * Hook: useUsers
 *
 * Fetches users from the API for selection in forms.
 */

import { useQuery } from '@tanstack/react-query';

export interface UserOption {
    id: string;
    name: string;
    email: string;
    role: string;
    phone: string | null;
}

async function fetchUsers(role?: string): Promise<UserOption[]> {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    
    const res = await fetch(`/api/users?${params.toString()}`);
    const json = await res.json();
    if (!json.success) {
        throw new Error(json.error || 'Failed to fetch users');
    }
    return json.data;
}

export function useUsers(role?: string) {
    return useQuery({
        queryKey: ['users', role],
        queryFn: () => fetchUsers(role),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useNurses() {
    return useUsers('NURSE');
}

export function useDoctors() {
    return useUsers('DOCTOR');
}
