"use client";

import React from "react";
import { Button } from "./ui/button";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { tokenStorage } from "@/lib/auth/token";

export const LogoutButton = () => {
  const router = useRouter();
  const handleLogout = () => {
    tokenStorage.clear();
    router.push("/sign-in");
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
