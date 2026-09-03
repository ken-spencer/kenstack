"use client";

import { useRouter } from "next/navigation";

import { LogOut } from "lucide-react";

import { logoutUser } from "@kenstack/auth/useUserInfo";
import { cn } from "@kenstack/lib/utils";

export default function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      className={cn("menu-item", className)}
      type="button"
      onClick={() => {
        logoutUser()
          .then(() => {
            router.push("/");
            router.refresh();
          })
          .catch((error) => {
            window.alert(
              "There was an unexpected problem handling your request. Please try again later.",
            );

            // eslint-disable-next-line no-console
            console.error(error);
          });
      }}
    >
      <LogOut />
      Logout
    </button>
  );
}
