'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TheaterTechRoot() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/theater-tech/dayboard');
  }, [router]);

  return null;
}
