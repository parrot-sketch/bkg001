'use client';

import { useCallback } from 'react';
import { Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api/auth';
import { tokenStorage } from '@/lib/auth/token';
import { apiClient } from '@/lib/api/client';

/**
 * Opens the standalone print view in a new tab after refreshing
 * cookies so returning to the workspace does not hit a stale server session.
 */
export function OperativeNotePrintButton({ caseId }: { caseId: string }) {
  const openPrint = useCallback(async () => {
    const url = `/doctor/surgical-cases/${caseId}/operative-record/print`;

    // Best-effort cookie sync before leaving the authenticated shell
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        const response = await authApi.refreshToken({ refreshToken });
        if (response.success) {
          tokenStorage.setAccessToken(response.data.accessToken);
          tokenStorage.setRefreshToken(response.data.refreshToken);
          apiClient.setAuthTokenProvider(() => tokenStorage.getAccessToken());
        }
      } catch {
        // Print page itself does not require auth; continue anyway
      }
    }

    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      // Popup blocked — same-tab fallback
      window.location.assign(url);
    }
  }, [caseId]);

  return (
    <Button type="button" variant="outline" size="sm" onClick={() => void openPrint()} className="gap-1.5">
      <Printer className="h-4 w-4" />
      Print
    </Button>
  );
}
