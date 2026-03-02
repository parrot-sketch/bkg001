/**
 * Error State Component
 * 
 * Standardized error display for surgical plan feature.
 */

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorStateProps {
  error: Error | string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({ error, onRetry, retryLabel = 'Retry' }: ErrorStateProps) {
  const message = typeof error === 'string' ? error : error.message;

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-sm font-medium text-destructive mb-2">Error loading data</p>
        <p className="text-xs text-muted-foreground mb-4 max-w-md text-center">{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
