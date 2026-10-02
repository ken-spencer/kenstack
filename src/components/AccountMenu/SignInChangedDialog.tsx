"use client";

import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { PublicAuthState } from "@kenstack/auth/server/state";
import { allowUnload } from "@kenstack/forms/NavigationBlocker";
import {
  adoptLogout,
  useSignInChange,
  useUserInfo,
} from "@kenstack/auth/useUserInfo";
import Button from "@kenstack/components/Button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@kenstack/components/AlertDialog";

// A site can mount both account menus (Civic's header has the desktop menu and the mobile links), and a
// dialog portals out of a hidden container, so only the first mounted menu renders it.
const hosts: object[] = [];
const hostListeners = new Set<() => void>();
// The address the last commit showed, path and query, shared by every host, so a host that a navigation
// mounts or shows again still sees that the page changed.
let shownAddress: string | undefined;

function subscribeToHosts(listener: () => void) {
  hostListeners.add(listener);
  return () => {
    hostListeners.delete(listener);
  };
}

function useIsFirstHost() {
  const [host] = useState(() => ({}));
  useEffect(() => {
    hosts.push(host);
    hostListeners.forEach((listener) => listener());
    return () => {
      hosts.splice(hosts.indexOf(host), 1);
      hostListeners.forEach((listener) => listener());
    };
  }, [host]);
  return useSyncExternalStore(
    subscribeToHosts,
    () => hosts[0] === host,
    () => false,
  );
}

export default function SignInChangedDialog({
  authState,
}: {
  // The account menu's server-rendered auth state.
  authState: PublicAuthState;
}) {
  const isFirstHost = useIsFirstHost();
  const { close, hasChanged, isOpen } = useSignInChange();

  // As the page changes, in the same commit: a completed logout shows with the page it leads to, and
  // while a sign-in change from another tab stands, the destination loads afresh. The page's account is
  // set once per document, so only a new document follows the current session, and nothing rendered for
  // the old account, such as a form a later Back restores, can act for the new one.
  const pathname = usePathname();
  const address = `${pathname}?${useSearchParams()}`;
  const reloadForPendingChange = useEffectEvent(() => {
    if (hasChanged) {
      // The page has been left, and unsaved input made for another account must not be kept.
      allowUnload();
      window.location.reload();
    }
  });
  useLayoutEffect(() => {
    adoptLogout(pathname);
    const previousAddress = shownAddress;
    shownAddress = address;
    if (previousAddress !== undefined && previousAddress !== address) {
      reloadForPendingChange();
    }
  }, [address, pathname]);

  // A page whose server render saw no account refreshes it once this tab has one, so a sign-in adopted
  // from another tab brings the menu's links. This tab's own sign-in in a flow is refreshed by the login
  // step too; the store can't tell the two apart, and a second refresh is harmless.
  const router = useRouter();
  const user = useUserInfo();
  const userId = user.state === "authenticated" ? user.userId : undefined;
  // Only a change in this tab's account fires it, not a later server render on its own.
  const refreshIfRenderedSignedOut = useEffectEvent(() => {
    if (authState.state !== "authenticated") {
      router.refresh();
    }
  });
  useEffect(() => {
    if (isFirstHost && userId !== undefined) {
      refreshIfRenderedSignedOut();
    }
  }, [isFirstHost, userId]);

  if (!isFirstHost) {
    return null;
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={close}>
      <AlertDialogContent showCloseButton={false}>
        <AlertDialogHeader>
          <AlertDialogTitle>Your sign-in changed</AlertDialogTitle>
          <AlertDialogDescription>
            You signed in or out in another tab. Reload the page to continue.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <Button type="button" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
