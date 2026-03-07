'use client';

/**
 * useSignedImageUrl
 *
 * Fetches a short-lived Cloudinary signed URL for a private medical image.
 * The URL is valid for 15 minutes. React Query caches it for 12 minutes,
 * ensuring re-fetches happen before expiry.
 *
 * Usage:
 *   const { url, isLoading } = useSignedImageUrl('medical/patient-abc/pre-op-front');
 */

import { useQuery } from '@tanstack/react-query';

async function fetchSignedUrl(publicId: string): Promise<string> {
    const res = await fetch(
        `/api/images/signed-url?publicId=${encodeURIComponent(publicId)}`
    );
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to get image URL');
    return json.data.url as string;
}

export function useSignedImageUrl(publicId: string | null | undefined) {
    return useQuery({
        queryKey: ['signed-image-url', publicId],
        queryFn: () => fetchSignedUrl(publicId!),
        enabled: !!publicId && publicId.startsWith('medical/'),
        // Cache for 12 minutes — sign lifetime is 15 min
        staleTime: 1000 * 60 * 12,
        gcTime: 1000 * 60 * 14,
        retry: 1,
    });
}

/**
 * isMedicalImage — checks if a stored imageUrl is a public_id (secure) or
 * a legacy public Cloudinary URL.
 */
export function isMedicalPublicId(value: string): boolean {
    return value.startsWith('medical/');
}
