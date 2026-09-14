"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { PublicAuthState } from "@kenstack/auth/server/state";
import { useUserInfo } from "@kenstack/auth/useUserInfo";
import { useStep } from "@kenstack/components/StepFlow/context";

export default function LoginController({
  authState: initialAuthState,
}: {
  authState: PublicAuthState;
}) {
  const userInfo = useUserInfo(initialAuthState);
  const { activate, isActive, setSkipped } = useStep();
  // An emailed link returns to the flow's URL with its token. Until the link
  // signs the visitor in, the step is required and brought forward, as far as
  // the ledger allows, so the form verifies the link wherever the visitor
  // lands. The form's later removal of the token from the URL is not
  // observable here, so only its presence on arrival counts.
  const [hadLinkToken] = useState(useSearchParams().get("token") !== null);
  const serverHasIdentity =
    initialAuthState.state === "authenticated" ||
    initialAuthState.state === "proven";
  const hasIdentity =
    userInfo.state === "authenticated" || userInfo.state === "proven";
  const isLinkPending = hadLinkToken && !hasIdentity;

  useLayoutEffect(() => {
    if (userInfo.state === "loading") {
      return;
    }

    // Losing browser identity blocks immediately; gaining it waits for the
    // server refresh that supplies the dependent steps.
    setSkipped(!isLinkPending && serverHasIdentity && hasIdentity);
  }, [
    isLinkPending,
    serverHasIdentity,
    hasIdentity,
    setSkipped,
    userInfo.state,
  ]);

  // Bringing the step forward retries while the ledger still clamps it away,
  // and stops once the step has been shown, so Back works again afterwards.
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
