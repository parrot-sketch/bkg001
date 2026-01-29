import { useState, useEffect } from 'react';
import { servicesApi, ServiceDto } from '@/lib/api/services';
import { toast } from 'sonner';

export function useServices() {
    const [services, setServices] = useState<ServiceDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchServices() {
            try {
                setLoading(true);
                const response = await servicesApi.getAll();

                if (response.success) {
                    if (response.data) {
                        setServices(response.data);
                    }
                } else {
                    setError(response.error || 'Failed to fetch services');
                    toast.error('Failed to load procedures list');
                }
            } catch (err) {
                setError('An unexpected error occurred');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchServices();
    }, []);

    return { services, loading, error };
}
