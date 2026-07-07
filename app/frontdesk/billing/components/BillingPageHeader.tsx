'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BillingPageHeaderProps {
  onBack?: () => void;
}

export function BillingPageHeader({ onBack }: BillingPageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className="text-white/70 hover:text-white -ml-2 rounded-lg"
    >
      <ArrowLeft className="h-4 w-4 mr-1.5" />
      Back
    </Button>
  );
}
