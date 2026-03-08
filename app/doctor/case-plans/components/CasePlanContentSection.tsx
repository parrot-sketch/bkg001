'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CasePlanContentSectionProps {
  title: string;
  icon: LucideIcon;
  content: string | null;
  className?: string;
  iconClassName?: string;
}

export function CasePlanContentSection({
  title,
  icon: Icon,
  content,
  className,
  iconClassName,
}: CasePlanContentSectionProps) {
  if (!content) return null;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className={cn("h-4 w-4", iconClassName)} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="prose prose-sm max-w-none text-foreground prose-p:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </CardContent>
    </Card>
  );
}
