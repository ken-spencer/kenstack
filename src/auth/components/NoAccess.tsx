"use client";

import { useRouter } from "next/navigation";

import Button from "@kenstack/components/Button";
import { logout } from "@kenstack/auth/useUserInfo";

// What a signed-in person sees on a page their roles don't open. Signing out refreshes the page, whose
// sign-in redirect brings them back here once they sign in with another account.
export default function NoAccess() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-md space-y-3 py-16 text-center">
      <h1 className="text-2xl font-semibold">No access</h1>
      <Button
        type="button"
        variant="link"
        onClick={() => logout(() => router.refresh())}
      >
        Sign in as someone else
      </Button>
    </div>
  );
}
