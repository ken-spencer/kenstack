import { Suspense } from "react";

import ReauthenticationForm from "@kenstack/auth/reauthentication/Form";
import { loadPublicAuthState } from "@kenstack/auth/server/state";
import { Skeleton } from "@kenstack/components/Skeleton";

import EmailChangeClient from "./Client";

// The sign-in email change, wrapped for a signed-in visitor, impersonation included, where the guard
// explains why a change is unavailable. Signed out, only its link outcomes show. The page hosting it
// is createEmailChange's linkPath or any signed-in page.
export default function EmailChange() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-lg space-y-3" aria-busy="true">
          <span className="sr-only">Loading</span>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-40" />
        </div>
      }
    >
      <EmailChangeLoader />
    </Suspense>
  );
}

async function EmailChangeLoader() {
  return (await loadPublicAuthState()).state === "authenticated" ? (
    <ReauthenticationForm message="To update your sign-in email, please confirm your identity.">
      <EmailChangeClient />
    </ReauthenticationForm>
  ) : (
    <EmailChangeClient />
  );
}
