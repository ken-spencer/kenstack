"use client";

import { useRouter } from "next/navigation";

import { LogOut } from "lucide-react";

import { logout } from "@kenstack/auth/useUserInfo";
import { cn } from "@kenstack/lib/utils";

export default function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      className={cn("menu-item", className)}
      type="button"
      onClick={() =>
        logout(() => {
          router.push("/");
          router.refresh();
        })
      }
    >
      <LogOut />
      Logout
    </button>
  );
}
