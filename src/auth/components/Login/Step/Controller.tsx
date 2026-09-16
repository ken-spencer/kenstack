"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { PublicAuthState } from "@kenstack/auth/server/state";
import { useUserInfo } from "@kenstack/auth/useUserInfo";
import { useStep } from "@kenstack/components/StepFlow/context";

import { useHandledLinkToken } from "./linkVerification";

export default function LoginController({
  authState: initialAuthState,
}: {
  authState: PublicAuthState;
}) {
  const userInfo = useUserInfo(initialAuthState);
  const { activate, isActive, setSkipped } = useStep();
  const startedSignedIn =
    initialAuthState.state === "authenticated" ||
    initialAuthState.state === "proven";
  const hasIdentity =
    userInfo.state === "authenticated" || userInfo.state === "proven";

  // A link may switch accounts, so even signed-in visits must verify it.
  // Only form completion releases this prerequisite; waiting for the step
  // to be left would deadlock. Capture the token before the form consumes it.
  const [linkToken] = useState(useSearchParams().get("token"));
  const handledToken = useHandledLinkToken();
  const keepsStepForLink =
    linkToken !== null &&
    initialAuthState.state === "authenticated" &&
    handledToken !== linkToken;

  // A visit that started signed in skips the step only while identity holds:
  // losing it, in this tab or another, brings the step forward, and signing
  // in again skips it and lets the flow resume where it was. A visit that
  // started signed out keeps the step as an ordinary one.
  useLayoutEffect(() => {
    if (!startedSignedIn || userInfo.state === "loading") {
      return;
    }

    setSkipped(hasIdentity && !keepsStepForLink);
  }, [
    hasIdentity,
    keepsStepForLink,
    setSkipped,
    startedSignedIn,
    userInfo.state,
  ]);

  // Bringing the step forward retries while the ledger still clamps it away,
  // and stops once the step has been shown, so Back works again afterwards.
  const isLinkPending =
    linkToken !== null && (!hasIdentity || keepsStepForLink);
  const hasBeenShownRef = useRef(false);
  useEffect(() => {
    if (isActive) {
      hasBeenShownRef.current = true;
    }
  }, [isActive]);
  useEffect(() => {
    if (isLinkPending && !hasBeenShownRef.current) {
      activate();
    }
  }, [activate, isLinkPending]);

  return null;
}
