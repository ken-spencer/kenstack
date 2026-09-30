"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
  const { activate, isActive, setSkipped, visit } = useStep();
  const hasIdentity =
    userInfo.state === "authenticated" || userInfo.state === "proven";

  // A link may switch accounts, so even signed-in visits must verify it.
  // Only form completion releases this prerequisite; waiting for the step
  // to be left would deadlock. Capture the token, and whether the visit
  // arrived with an identity (signed in, or a proven email) that would
  // otherwise skip the step, before the form consumes the token and the
  // sign-in refresh changes the server's auth state.
  const [linkToken] = useState(useSearchParams().get("token"));
  const [startedWithLinkSignedIn] = useState(
    linkToken !== null &&
      (initialAuthState.state === "authenticated" ||
        initialAuthState.state === "proven"),
  );
  const handledToken = useHandledLinkToken();
  const keepsStepForLink =
    startedWithLinkSignedIn && handledToken !== linkToken;

  // A signed-in visitor skips the step, forward and Back. Losing identity, in
  // this tab or another, brings it forward, and signing in, in the flow or
  // another tab, skips it again so the flow resumes where it was.
  useLayoutEffect(() => {
    if (userInfo.state === "loading") {
      return;
    }

    setSkipped(hasIdentity && !keepsStepForLink);
  }, [hasIdentity, keepsStepForLink, setSkipped, userInfo.state, visit]);

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
