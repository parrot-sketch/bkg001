"use client";

import React from "react";
import { Button } from "./ui/button";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { tokenStorage } from "@/lib/auth/token";
import { authApi } from "@/lib/api/auth";

export const LogoutButton = () => {
  const router = useRouter();
  const handleLogout = () => {
    // Fire server-side revocation in background (fire-and-forget)
    if (tokenStorage.isAuthenticated()) {
      authApi.logout().catch((err) =>
        console.error('[AUTH] Background token revocation failed:', err)
      );
    }
    // Immediately clear client state and redirect
    tokenStorage.clear();
    router.push("/login");
  };
  return (
    <Button
      variant={"outline"}
      className="w-fit bottom-0 gap-2 px-0 md:px-4"
      onClick={handleLogout}
    >
      <LogOut />
      <span className="hidden lg:block">Logout</span>
    </Button>
  );
};
