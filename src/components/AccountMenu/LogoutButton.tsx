"use client";

import { useRouter } from "next/navigation";
import fetcher from "@kenstack/lib/fetcher";

import { LogOut } from "lucide-react";
import { Button } from "@kenstack/components/ui/button";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      className="w-full cursor-pointer justify-start"
      variant="link"
      tabIndex={-1} // stop Safari from automatically putting a focus style on this button
      onClick={() => {
        fetcher("/api/auth", {
          _action: "logout",
        }).then((data) => {
          if (data?.status === "error") {
            window.alert(data.message);
          }
          if (data?.status === "success") {
            router.push("/");
            router.refresh();
          }
        });
      }}
    >
      <LogOut />
      Logout
    </Button>
  );
}
