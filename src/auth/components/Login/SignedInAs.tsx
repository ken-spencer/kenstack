"use client";

/*
 * Public entry point: the account a flow's submitting step acts for, "Signed in as" by default or
 * "Paying as" on a payment step, with "Not you?" to sign out. Exports only SignedInAs.
 */

import { useRouter } from "next/navigation";

import { useSignInChange, useUserInfo } from "@kenstack/auth/useUserInfo";
import Avatar from "@kenstack/components/Avatar";
import Button from "@kenstack/components/Button";
import { logout } from "@kenstack/auth/useUserInfo";
import { formatUserInitials } from "@kenstack/lib/user";
import { cn } from "@kenstack/lib/utils";

// It reassures a visitor the flow skipped sign-in for that it knows who they are. Signing out stays on
// the page: the refreshed render shows the visitor signed out, and in a flow the login step comes back.
// Whatever the old session held, such as a seat hold, goes with it, so the flow may resume earlier.
export default function SignedInAs({
  label = "Signed in as",
}: {
  label?: string;
}) {
  const router = useRouter();
  const user = useUserInfo();
  // While a sign-in change in another tab stands, the bar shows the old account greyed and "Not you?"
  // only brings back its dialog, as the account menu does: logging out would end the new account.
  const { hasChanged, reopen } = useSignInChange();
  if (user.state !== "authenticated" && user.state !== "proven") {
    return null;
  }
  // A user's name falls back to their email; only a given or family name is shown above it.
  const name =
    user.state === "authenticated" && (user.givenName || user.familyName)
      ? user.name
      : undefined;

  return (
    <div
      className={cn(
        "bg-muted flex items-center gap-3 rounded-lg px-4 py-3 text-sm",
        hasChanged && "opacity-50",
      )}
    >
      {user.state === "authenticated" ? (
        <Avatar initials={user.initials} url={user.avatar?.url} />
      ) : (
        <Avatar initials={formatUserInitials(user)} />
      )}
      <p className="min-w-0 flex-1">
        <span className="text-muted-foreground">{label}</span>{" "}
        <span className="text-foreground font-bold wrap-anywhere">
          {name ?? user.email}
        </span>
        {name ? (
          <span className="text-muted-foreground block wrap-anywhere">
            {user.email}
          </span>
        ) : null}
      </p>
      <Button
        type="button"
        variant="link"
        onClick={() => (hasChanged ? reopen() : logout(() => router.refresh()))}
      >
        Not you?
      </Button>
    </div>
  );
}
