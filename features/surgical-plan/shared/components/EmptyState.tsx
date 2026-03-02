/**
 * Empty State Component
 * 
 * Standardized empty state display for surgical plan feature.
 */

import { Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string | React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon = Package,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="bg-muted p-3 rounded-full mb-4">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mb-4 max-w-md text-center">
            {description}
          </p>
        )}
        {action && <div className="mt-2">{action}</div>}
      </CardContent>
    </Card>
  );
}
