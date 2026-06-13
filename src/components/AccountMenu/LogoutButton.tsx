"use client";

import { useRouter } from "next/navigation";
import fetcher from "@kenstack/api/fetcher";

import { LogOut } from "lucide-react";
import { Button } from "@kenstack/components/ui/button";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      className="text-foreground w-full cursor-pointer justify-start"
      variant="link"
      tabIndex={-1} // stop Safari from automatically putting a focus style on this button
      onClick={() => {
        fetcher("/api/auth", {
          action: "logout",
        })
          .then((data) => {
            if (data?.status === "error") {
              window.alert(data.message);
            }
            if (data?.status === "success") {
              router.push("/");
              router.refresh();
            }
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
    </Button>
  );
}
