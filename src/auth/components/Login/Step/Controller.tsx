"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getSafeReturnToPath } from "@kenstack/auth/returnTo";
import type { PublicAuthState } from "@kenstack/auth/server/state";
import {
  setLoginDestination,
  setUserInfo,
  useUserInfo,
} from "@kenstack/auth/useUserInfo";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@kenstack/components/AlertDialog";
import Button from "@kenstack/components/Button";
import { useStep } from "@kenstack/components/StepFlow/context";

import LoginForm from "../Form";
import AnsweredDialog from "../Form/AnsweredDialog";
import useEmailLoginLink from "../Form/useEmailLoginLink";

export default function LoginController({
  authState: initialAuthState,
}: {
  authState: PublicAuthState;
}) {
  const userInfo = useUserInfo(initialAuthState);
  const { id, setSkipped } = useStep();
  const hasIdentity =
    userInfo.state === "authenticated" || userInfo.state === "proven";

  // A signed-in visitor skips the step, forward and Back. Losing identity, in
  // this tab or another, brings it forward, and signing in, in the flow or
  // another tab, skips it again so the flow resumes where it was.
  useLayoutEffect(() => {
    if (userInfo.state === "loading") {
      return;
    }

    setSkipped(hasIdentity);
  }, [hasIdentity, setSkipped, userInfo.state]);

  // A sign-in inside the flow, by this step, an emailed link or account creation, refreshes the
  // server render without waiting, so the menus and other output that depends on identity update.
  const router = useRouter();
  const userId =
    userInfo.state === "authenticated" ? userInfo.userId : undefined;
  const signedInUserIdRef = useRef(userId);
  useEffect(() => {
    if (userId !== undefined && userId !== signedInUserIdRef.current) {
      router.refresh();
    }
    signedInUserIdRef.current = userId;
  }, [router, userId]);

  // An emailed link that lands on the flow is verified here, even for a
  // signed-in visit, since a link may sign in another account; the step never
  // comes forward for it. The token stays in the address until the link
  // settles: meanwhile the step shows it is signing in, and the return step
  // waits. A reload in that moment verifies it again. It leaves the address
  // whenever the flow's page shows it settled, so a page left mid-check and
  // shown again by Back lets go of it too. A failed link settles once its
  // dialog closes or a new link is requested (settleFailedLink below).
  const token = useSearchParams().get("token");
  const [isLinkSettled, setIsLinkSettled] = useState(false);
  useEffect(() => {
    if (token === null || !isLinkSettled) {
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    window.history.replaceState(null, "", url);
  }, [isLinkSettled, token]);
  const [linkFailure, setLinkFailure] = useState<{
    canRequestLink: boolean;
    message: string;
  }>();
  const [isLinkFailureOpen, setIsLinkFailureOpen] = useState(false);
  const [isRequestingLink, setIsRequestingLink] = useState(false);
  // Answered by a tab waiting on this sign-in, the link stays unsettled: that tab carries on, and
  // nothing here acts for it.
  const [isAnswered, setIsAnswered] = useState(false);
  useEmailLoginLink(token, {
    onAnswered: () => setIsAnswered(true),
    onFailure: ({ code, message }) => {
      const isSignedIn = userInfo.state === "authenticated";
      setLinkFailure({
        // A link opened in another browser is refused there; a visitor with
        // no identity yet can ask for a new one from this browser.
        canRequestLink: code === "wrong-browser" && !hasIdentity,
        message: isSignedIn ? "You’re already signed in." : message,
      });
      setIsLinkFailureOpen(true);
    },
    onSuccess: ({ authState, path }) => {
      setLoginDestination(authState, path);
      setUserInfo(authState);
      setIsLinkSettled(true);
    },
  });

  // A sign-in this tab takes on while the visitor asks for a new link, such as one handed to it by the
  // tab that opened that link, ends the request.
  if (isLinkFailureOpen && isRequestingLink && hasIdentity) {
    setIsLinkFailureOpen(false);
  }

  if (isAnswered) {
    return <AnsweredDialog />;
  }

  // The failed link leaves the address, and the confirmation mark leaves where the flow returns to,
  // so that page never says "You're confirmed". It settles when its dialog closes, or as soon as the
  // visitor asks for a new link, before that form takes the token and a sign-in there moves the flow on.
  function settleFailedLink() {
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    const returnTo = getSafeReturnToPath(url.searchParams.get("returnTo"));
    if (returnTo) {
      const destination = new URL(returnTo, url);
      destination.searchParams.delete("identityConfirmed");
      url.searchParams.set(
        "returnTo",
        destination.pathname + destination.search + destination.hash,
      );
    }
    window.history.replaceState(null, "", url);
  }

  function closeLinkFailure() {
    setIsLinkFailureOpen(false);
    settleFailedLink();
  }

  return (
    <AlertDialog
      open={isLinkFailureOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          closeLinkFailure();
        }
      }}
    >
      <AlertDialogContent showCloseButton={false}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isRequestingLink ? "Request a new link" : linkFailure?.message}
          </AlertDialogTitle>
        </AlertDialogHeader>
        {isRequestingLink ? (
          <LoginForm
            anchor={id}
            method="email"
            mode="embedded"
            onComplete={closeLinkFailure}
          />
        ) : null}
        <AlertDialogFooter>
          {linkFailure?.canRequestLink && !isRequestingLink ? (
            <Button
              type="button"
              onClick={() => {
                settleFailedLink();
                setIsRequestingLink(true);
              }}
            >
              Request a new link
            </Button>
          ) : null}
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
