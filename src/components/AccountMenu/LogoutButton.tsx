"use client";

import { useRouter } from "next/navigation";
import fetcher from "@kenstack/api/fetcher";

import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="text-foreground inline-flex h-8 w-full cursor-pointer items-center justify-start gap-1.5 rounded-lg border border-transparent px-2.5 text-sm font-medium whitespace-nowrap transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      type="button"
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
    </button>
  );
}
