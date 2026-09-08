"use client";

import { useLayoutEffect } from "react";

import type { PublicAuthState } from "@kenstack/auth/server/state";
import { useUserInfo } from "@kenstack/auth/useUserInfo";
import { useStep } from "@kenstack/components/StepFlow/context";

export default function LoginController({
  authState: initialAuthState,
}: {
  authState: PublicAuthState;
}) {
  const userInfo = useUserInfo(initialAuthState);
  const { setSkipped } = useStep();
  const serverHasIdentity =
    initialAuthState.state === "authenticated" ||
    initialAuthState.state === "proven";
  const hasIdentity =
    userInfo.state === "authenticated" || userInfo.state === "proven";

  useLayoutEffect(() => {
    // Losing browser identity blocks immediately; gaining it waits for the
    // server refresh that supplies the dependent steps.
    setSkipped(serverHasIdentity && hasIdentity);
  }, [serverHasIdentity, hasIdentity, setSkipped]);

  return null;
}
