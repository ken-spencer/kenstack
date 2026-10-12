"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
import useConsumedSearchParam from "@kenstack/hooks/useConsumedSearchParam";

import LoginForm from "../Form";
import AnsweredDialog from "../Form/AnsweredDialog";
import useEmailLoginLink from "../Form/useEmailLoginLink";
import { useLinkStore } from "./linkStore";

export default function LoginController({
  authState: initialAuthState,
  skippable,
}: {
  authState: PublicAuthState;
  skippable: boolean;
}) {
  const userInfo = useUserInfo(initialAuthState);
  const { id, isActive, next, setSatisfied, setSkipped } = useStep();
  const hasIdentity =
    userInfo.state === "authenticated" || userInfo.state === "proven";

  // A signed-in visitor skips the step, forward and Back. Losing identity, in
  // this tab or another, brings it forward, and signing in, in the flow or
  // another tab, skips it again so the flow resumes where it was. A step that
  // isn't skippable stays shown, and only a sign-in made on it moves on.
  useLayoutEffect(() => {
    if (userInfo.state === "loading") {
      return;
    }

    setSkipped(skippable && hasIdentity);
    setSatisfied(hasIdentity);
  }, [hasIdentity, setSatisfied, setSkipped, skippable, userInfo.state]);

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
  // comes forward for it. The token leaves the address on arrival, so a reload
  // or Back never verifies it again; meanwhile the step's form shows that it is
  // signing in.
  const token = useConsumedSearchParam("token");
  const [linkFailure, setLinkFailure] = useState<{
    canRequestLink: boolean;
    message: string;
  }>();
  const [isLinkFailureOpen, setIsLinkFailureOpen] = useState(false);
  const [isRequestingLink, setIsRequestingLink] = useState(false);
  // Answered by a tab waiting on this sign-in, that tab carries on, and nothing here acts for it.
  const [isAnswered, setIsAnswered] = useState(false);
  const isVerifying = useEmailLoginLink(token, {
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
      // A shown step moves on as its form does after a sign-in; a skippable one is skipped instead.
      if (!skippable && isActive) {
        next();
      }
    },
  });
  useLayoutEffect(() => {
    useLinkStore.setState({ isVerifying });
    return () => useLinkStore.setState({ isVerifying: false });
  }, [isVerifying]);

  // A sign-in this tab takes on while the visitor asks for a new link, such as one handed to it by the
  // tab that opened that link, ends the request.
  if (isLinkFailureOpen && isRequestingLink && hasIdentity) {
    setIsLinkFailureOpen(false);
  }

  if (isAnswered) {
    return <AnsweredDialog />;
  }

  return (
    <AlertDialog open={isLinkFailureOpen} onOpenChange={setIsLinkFailureOpen}>
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
            onComplete={() => {
              setIsLinkFailureOpen(false);
              if (!skippable && isActive) {
                next();
              }
            }}
          />
        ) : null}
        <AlertDialogFooter>
          {linkFailure?.canRequestLink && !isRequestingLink ? (
            <Button type="button" onClick={() => setIsRequestingLink(true)}>
              Request a new link
            </Button>
          ) : null}
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
