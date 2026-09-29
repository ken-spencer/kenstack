"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import fetcher from "@kenstack/api/fetcher";
import type { UserInfoResult } from "@kenstack/auth/api";
import { getSafeReturnToPath } from "@kenstack/auth/returnTo";
import { useUserInfo } from "@kenstack/auth/useUserInfo";
import Button from "@kenstack/components/Button";

export default function LoginReturn() {
  const router = useRouter();
  const returnTo = getSafeReturnToPath(useSearchParams().get("returnTo"));
  const userInfo = useUserInfo();
  // A kept route can show this step again after another account signs in, so the destination is
  // looked up per account and only for a signed-in visitor.
  const userId =
    userInfo.state === "authenticated" ? userInfo.userId : undefined;
  // The users module is server-only, so the server resolves the account's destination. It also
  // confirms the account, so a browser that still shows a session the server has ended reloads
  // instead of bouncing between this page and a returnTo that sends it back.
  const destinationQuery = useQuery({
    enabled: userId !== undefined,
    queryKey: ["login-destination", userId],
    queryFn: async ({ signal }) => {
      const result = await fetcher<UserInfoResult>(
        "/api/auth",
        { action: "user-info" },
        { signal },
      );
      if (result.status === "error") {
        throw new Error(result.message);
      }
      return result.authState.state === "authenticated" &&
        result.authState.userId === userId
        ? (result.loginDestination ?? null)
        : null;
    },
  });

  useEffect(() => {
    if (userId === undefined) {
      return;
    }
    const destination = destinationQuery.data;
    if (destination) {
      router.replace(returnTo ?? destination);
    } else if (destination === null) {
      // The server no longer sees the session this browser signed in, such as one revoked since; a
      // full load shows the page as it stands, sign-in included.
      window.location.reload();
    }
  }, [destinationQuery.data, returnTo, router, userId]);

  // The visitor leaves as soon as the destination is known, so nothing shows on the way.
  return destinationQuery.isError ? (
    <div className="mt-7">
      <p>You’re signed in.</p>
      <Button
        className="mt-4"
        disabled={destinationQuery.isFetching}
        type="button"
        variant="outline"
        onClick={() => void destinationQuery.refetch()}
      >
        Continue
      </Button>
    </div>
  ) : (
    <div aria-busy="true" className="mt-7 min-h-72" />
  );
}
