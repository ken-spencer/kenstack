"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { accountChangedRefusal } from "@kenstack/auth/renderedAccount";
import { getSafeReturnToPath } from "@kenstack/auth/returnTo";
import {
  isUserInfoCurrent,
  useLoginDestination,
  useSignInChange,
  useUserInfo,
} from "@kenstack/auth/useUserInfo";
import Button from "@kenstack/components/Button";
import Notice from "@kenstack/components/Notice";
import {
  useStep,
  useStepLeavesPage,
} from "@kenstack/components/StepFlow/context";

// Leaves as soon as the flow reaches this step, while the step before it stays on screen. The
// destination comes from the sign-in, or the user-info reload that adopted it; a signed-in arrival
// uses the one the server resolved for the step.
export function LoginReturnController({
  destination: arrivalDestination,
}: {
  destination?: { path: string; userId: number };
}) {
  const router = useRouter();
  const returnTo = getSafeReturnToPath(useSearchParams().get("returnTo"));
  const { isActive } = useStep();
  const userInfo = useUserInfo();
  const userId =
    userInfo.state === "authenticated" ? userInfo.userId : undefined;
  const signInDestination = useLoginDestination();
  const destination =
    returnTo ??
    signInDestination ??
    (arrivalDestination?.userId === userId
      ? arrivalDestination?.path
      : undefined);
  // A sign-in that changed in another tab since this page took its account keeps the visitor here:
  // going on would bounce between this page and a destination that needs the session.
  const { hasChanged } = useSignInChange();
  useStepLeavesPage(!hasChanged);

  useEffect(() => {
    if (
      !isActive ||
      hasChanged ||
      userId === undefined ||
      destination === undefined
    ) {
      return;
    }
    let isCurrent = true;
    // A check in flight, such as the one a server render that no longer sees the session starts,
    // settles first; one that finds another account or none keeps the visitor here.
    void isUserInfoCurrent().then((isUnchanged) => {
      if (isCurrent && isUnchanged) {
        router.replace(destination);
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [destination, hasChanged, isActive, router, userId]);

  return null;
}

export default function LoginReturn() {
  const { hasChanged } = useSignInChange();

  // The refusal line and Reload a form shows.
  return hasChanged ? (
    <Notice
      className="mt-7"
      role="alert"
      message={accountChangedRefusal.message}
      action={
        <Button
          size="sm"
          type="button"
          onClick={() => window.location.reload()}
        >
          Reload
        </Button>
      }
    />
  ) : null;
}
