'use client';

import React from 'react';
import { Button } from './ui/button';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/patient/useAuth';

export const LogoutButton = () => {
  const { logout } = useAuth();
  return (
    <Button
      variant={'outline'}
      className="w-fit bottom-0 gap-2 px-0 md:px-4"
      onClick={() => logout()}
    >
      <LogOut />
      <span className="hidden lg:block">Logout</span>
    </Button>
  );
};
