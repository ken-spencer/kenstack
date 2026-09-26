"use client";

import { Fragment, type ReactNode, useRef, useState } from "react";
import fetcher from "@kenstack/api/fetcher";
import { AuthorizationContext } from "./context";
import type { Authorization } from "./server";
import ReauthenticationTimer from "./Timer";

export default function ReauthenticationFormClient({
  children,
  loginForm,
  message,
  authorization: serverAuthorization,
}: {
  children: ReactNode;
  loginForm: ReactNode;
  message: string;
  authorization: Authorization;
}) {
  const [authorization, setAuthorizationState] = useState(() => ({
    ...serverAuthorization,
    deadline: performance.now() + serverAuthorization.remainingMs,
  }));
  const [previousServerAuthorization, setPreviousServerAuthorization] =
    useState(serverAuthorization);
  const [clock, setClock] = useState(() => performance.now());
  const [pending, setPending] = useState<{ id: symbol; until: number }[]>([]);
  // A session belongs to one account, so its id identifies the authorization.
  const extending = useRef<number | null>(null);
  const retryAfter = useRef(0);

  // A fresh server render can rotate the session without replacing its children.
  if (previousServerAuthorization !== serverAuthorization) {
    setPreviousServerAuthorization(serverAuthorization);
    const isNewSession =
      previousServerAuthorization.sessionId !== serverAuthorization.sessionId;
    if (
      isNewSession ||
      (authorization.deadline > 0 &&
        Date.parse(serverAuthorization.authorizedUntil) >
          Date.parse(authorization.authorizedUntil))
    ) {
      setAuthorizationState(() => ({
        ...serverAuthorization,
        deadline: performance.now() + serverAuthorization.remainingMs,
      }));
      setClock(() => performance.now());
      if (isNewSession) setPending([]);
    }
  }

  function setAuthorization(grant: Authorization) {
    setClock(performance.now());
    setAuthorizationState((current) =>
      current.deadline > 0 &&
      current.sessionId === authorization.sessionId &&
      grant.sessionId === current.sessionId &&
      Date.parse(grant.authorizedUntil) > Date.parse(current.authorizedUntil)
        ? { ...grant, deadline: performance.now() + grant.remainingMs }
        : current,
    );
  }

  async function track<T extends { status: string }>(
    request: Promise<T>,
    { rotatesSession = false } = {},
  ) {
    setClock(performance.now());
    const id = Symbol();
    // Bounded UI waiting is not an authorization grant. The server still decides.
    const until = Math.min(
      performance.now() + 60_000,
      authorization.deadline + 60_000,
    );
    setPending((current) => [...current, { id, until }]);
    let rotated = false;
    try {
      const result = await request;
      rotated = rotatesSession && result.status === "success";
      return result;
    } finally {
      // A successful write rotates the cookie before its refreshed server tree
      // arrives. Preserve the mounted result until that tree or the bound arrives.
      setClock(performance.now());
      if (!rotated) {
        setPending((current) => current.filter((entry) => entry.id !== id));
      }
    }
  }

  async function onActivity() {
    const remainingMs = authorization.deadline - performance.now();
    if (
      remainingMs <= 0 ||
      remainingMs >= 120_000 ||
      performance.now() < retryAfter.current ||
      extending.current === authorization.sessionId
    ) {
      return;
    }
    const { sessionId } = authorization;
    extending.current = sessionId;
    try {
      const result = await track(
        fetcher<{ authorization: Authorization }>("/api/auth", {
          action: "extend-authorization",
          sessionId,
        }),
      );
      if (result.status === "success") {
        setAuthorization(result.authorization);
      } else if (result.code === "reauthentication-required") {
        setAuthorizationState((current) => {
          if (
            current.sessionId === sessionId &&
            current.authorizedUntil === authorization.authorizedUntil
          ) {
            return { ...current, deadline: 0 };
          }
          return current;
        });
      }
    } catch {
      // A transport failure supplies no grant or refusal; the existing deadline
      // stands. Pause so every keystroke while offline does not send a request.
      retryAfter.current = performance.now() + 5_000;
    } finally {
      if (extending.current === sessionId) extending.current = null;
    }
  }

  const deadline = Math.max(
    authorization.deadline,
    ...pending.map((request) => request.until),
  );
  const isExpired = deadline <= clock;
  return (
    <AuthorizationContext
      value={{ userId: authorization.userId, setAuthorization, track }}
    >
      <div
        onClickCapture={onActivity}
        onKeyDownCapture={onActivity}
        onInputCapture={onActivity}
      >
        <p role="status" className={isExpired ? "mb-4 max-w-lg" : "sr-only"}>
          {isExpired ? (
            <>{message} Use your password or a code sent to your email.</>
          ) : null}
        </p>
        {isExpired ? (
          <div className="w-full max-w-lg">{loginForm}</div>
        ) : (
          <>
            <ReauthenticationTimer
              deadline={deadline}
              onExpire={() => setClock(performance.now())}
            />
            <Fragment key={authorization.userId}>{children}</Fragment>
          </>
        )}
      </div>
    </AuthorizationContext>
  );
}
