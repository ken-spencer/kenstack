"use client";

import { Fragment, type ReactNode, useEffect, useRef, useState } from "react";

import type { PublicAuthState } from "@kenstack/auth/server/state";
import { setUserInfo } from "@kenstack/auth/useUserInfo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@kenstack/components/Dialog";
import Notice from "@kenstack/components/Notice";
import { allowUnload } from "@kenstack/forms/NavigationBlocker";
import useConsumedSearchParam from "@kenstack/hooks/useConsumedSearchParam";

import { AuthorizationContext } from "./context";

type HeldRequest = {
  // Settles the caller with the original refusal.
  cancel: () => void;
  // Runs the request again; false while it is refused again for stale authorization.
  replay: () => Promise<boolean>;
};

// A quiet check refused because the emailed link is still signing in elsewhere tries again this long
// after the first refusal, while the tab stays in view.
const quietRetryOffsetsMs = [2000, 5000, 10000];

const usableControl =
  'input:not([type="hidden"]):not([readonly]):not(:disabled), textarea:not(:disabled), button:not(:disabled)';

export default function ReauthenticationFormClient({
  children,
  loginForm,
  message,
  userId,
}: {
  children: ReactNode;
  loginForm: ReactNode;
  message: string;
  userId: number;
}) {
  const heldRef = useRef<HeldRequest[]>([]);
  const [heldCount, setHeldCount] = useState(0);
  const [isReplaying, setIsReplaying] = useState(false);
  const replayingRef = useRef(false);
  const replayAgainRef = useRef(false);
  const cancelRequestedRef = useRef(false);
  const quietRetryTimerRef = useRef<number | undefined>(undefined);
  // A page left mid-replay schedules no further retry.
  const isMountedRef = useRef(false);
  const focusResultRef = useRef(false);
  const [isRefusedAgain, setIsRefusedAgain] = useState(false);
  // Each opening mounts the confirmation form afresh, and a confirmation from an earlier opening
  // replays nothing.
  const [opening, setOpening] = useState(0);
  const openingRef = useRef(opening);
  const dialogBodyRef = useRef<HTMLDivElement>(null);
  const protectedAreaRef = useRef<HTMLDivElement>(null);
  const isOpen = heldCount > 0;
  // Set by a confirmation link opened in a new tab; the change it confirms is held in the first one.
  const isConfirmedElsewhere =
    useConsumedSearchParam("identityConfirmed") !== null;
  const [hasSavedHere, setHasSavedHere] = useState(false);

  useEffect(() => {
    openingRef.current = opening;
  }, [opening]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      window.clearTimeout(quietRetryTimerRef.current);
    };
  }, []);

  // Focus goes to the first control the person can use, such as the password field; the email
  // field is the rendered account's and read-only. Opening the dialog moves focus itself, in a later
  // commit, so this waits until it is open.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    let frame = 0;
    const focusFirstUsable = () => {
      const body = dialogBodyRef.current;
      if (!body?.closest("dialog")?.open) {
        frame = requestAnimationFrame(focusFirstUsable);
        return;
      }
      body.querySelector<HTMLElement>(usableControl)?.focus();
    };
    frame = requestAnimationFrame(focusFirstUsable);
    return () => cancelAnimationFrame(frame);
  }, [isOpen, opening]);

  function hold(request: HeldRequest) {
    heldRef.current.push(request);
    if (heldRef.current.length === 1) {
      setIsRefusedAgain(false);
      setOpening((current) => current + 1);
    }
    setHeldCount(heldRef.current.length);
  }

  function track<T extends { code?: string; message?: string; status: string }>(
    request: () => Promise<T>,
  ) {
    return request().then((result) => {
      if (result.code === "account-changed") {
        // Another account signed in from elsewhere; nothing held may write to it.
        allowUnload();
        window.location.reload();
        return new Promise<T>(() => {});
      }
      if (result.code !== "reauthentication-required") {
        if (result.status === "success") {
          setHasSavedHere(true);
        }
        return result;
      }
      return new Promise<T>((resolve, reject) => {
        hold({
          cancel: () => resolve(result),
          replay: async () => {
            let replayed: T;
            try {
              replayed = await request();
            } catch (error) {
              // A network failure settles with that failure; it is never retried on its own.
              reject(error);
              return true;
            }
            if (replayed.code === "account-changed") {
              allowUnload();
              window.location.reload();
              return true;
            }
            if (replayed.code === "reauthentication-required") {
              return false;
            }
            if (replayed.status === "success") {
              setHasSavedHere(true);
            }
            resolve(replayed);
            return true;
          },
        });
      });
    });
  }

  // Held requests replay one at a time, each after the previous settles. One refused again stays
  // held; once nothing is held the dialog closes and focus moves to what the result shows. A quiet
  // replay, when the page comes back into view, checks whether a sign-in elsewhere confirmed this
  // session: it shows no progress and no refusal.
  async function replayHeld({
    quiet = false,
    quietRetry = 0,
    firstRefusedAt,
  }: { firstRefusedAt?: number; quiet?: boolean; quietRetry?: number } = {}) {
    if (replayingRef.current) {
      // A confirmation that lands mid-replay, such as a code accepted while a quiet check runs,
      // replays again once this one settles; a second quiet check adds nothing.
      if (!quiet) {
        replayAgainRef.current = true;
      }
      return;
    }
    if (!heldRef.current.length) {
      return;
    }
    window.clearTimeout(quietRetryTimerRef.current);
    replayingRef.current = true;
    let isQuietPass = quiet;
    let isRefused = false;
    do {
      replayAgainRef.current = false;
      if (!isQuietPass) {
        setIsReplaying(true);
        setIsRefusedAgain(false);
      }
      const replaying = heldRef.current.splice(0);
      const stillHeld: HeldRequest[] = [];
      for (const request of replaying) {
        if (!(await request.replay())) {
          stillHeld.push(request);
        }
      }
      isRefused = stillHeld.length > 0;
      heldRef.current = [...stillHeld, ...heldRef.current];
      // Only a confirmation asks for another pass, and it is never quiet.
      if (replayAgainRef.current) {
        isQuietPass = false;
      }
    } while (
      replayAgainRef.current &&
      heldRef.current.length &&
      !cancelRequestedRef.current
    );
    replayingRef.current = false;
    setIsReplaying(false);
    focusResultRef.current = !heldRef.current.length;
    if (cancelRequestedRef.current) {
      cancelRequestedRef.current = false;
      cancel();
      return;
    }
    if (isRefused && !isQuietPass) {
      setIsRefusedAgain(true);
    }
    if (
      isRefused &&
      isQuietPass &&
      isMountedRef.current &&
      quietRetry < quietRetryOffsetsMs.length
    ) {
      const refusedAt = firstRefusedAt ?? Date.now();
      quietRetryTimerRef.current = window.setTimeout(
        () => {
          if (isMountedRef.current && document.visibilityState === "visible") {
            void replayHeld({
              firstRefusedAt: refusedAt,
              quiet: true,
              quietRetry: quietRetry + 1,
            });
          }
        },
        Math.max(0, refusedAt + quietRetryOffsetsMs[quietRetry] - Date.now()),
      );
    }
    setHeldCount(heldRef.current.length);
  }

  // Closing settles every held request with its original refusal, so its form reports that nothing
  // was written. During a replay it waits for the replay to settle and applies to what is still held.
  function cancel() {
    if (replayingRef.current) {
      cancelRequestedRef.current = true;
      return;
    }
    window.clearTimeout(quietRetryTimerRef.current);
    for (const request of heldRef.current.splice(0)) {
      request.cancel();
    }
    setHeldCount(0);
  }

  function confirm(authState: PublicAuthState, fromOpening: number) {
    if (authState.state !== "authenticated" || authState.userId !== userId) {
      // Another account must not inherit this page's unsaved state.
      allowUnload();
      window.location.reload();
      return;
    }
    setUserInfo(authState);
    if (fromOpening === openingRef.current) {
      void replayHeld();
    }
  }

  return (
    <AuthorizationContext
      value={{
        cancel: () => {},
        confirm: () => {},
        replay: () => {},
        track,
        userId,
      }}
    >
      {isConfirmedElsewhere && !hasSavedHere ? (
        <Notice
          className="mb-6"
          message="You’re confirmed, but nothing has been saved yet. Go back to the tab where you started; it finishes by itself. If that tab is closed or on another device, make the change again here."
          status="information"
        />
      ) : null}
      {/* Keyed by account, so a page shown again for another account never carries a draft over. */}
      <div ref={protectedAreaRef}>
        <Fragment key={userId}>{children}</Fragment>
      </div>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            cancel();
          }
        }}
      >
        <DialogContent
          showCloseButton={!isReplaying}
          onClose={() => {
            // The protected area is inert until the dialog closes, and closing restores focus to a
            // control the result may have replaced.
            if (focusResultRef.current) {
              focusResultRef.current = false;
              protectedAreaRef.current
                ?.querySelector<HTMLElement>(usableControl)
                ?.focus();
            }
          }}
        >
          <div className="space-y-4" ref={dialogBodyRef}>
            <DialogTitle>{message}</DialogTitle>
            <DialogDescription>
              Use your password or a code sent to your email.
            </DialogDescription>
            {isRefusedAgain ? (
              <Notice
                message="Not confirmed yet. Enter your password or the emailed code."
                status="error"
              />
            ) : null}
            {isReplaying ? (
              <p aria-live="polite" className="text-sm">
                Continuing…
              </p>
            ) : null}
            <AuthorizationContext
              value={{
                cancel,
                confirm: (authState) => confirm(authState, opening),
                replay: () => void replayHeld({ quiet: true }),
                track: (request) => request(),
                userId,
              }}
            >
              {/* Mounted only while open: the form reads the URL and must not act for a closed dialog. */}
              {isOpen ? (
                <fieldset disabled={isReplaying}>
                  <Fragment key={opening}>{loginForm}</Fragment>
                </fieldset>
              ) : null}
            </AuthorizationContext>
          </div>
        </DialogContent>
      </Dialog>
    </AuthorizationContext>
  );
}
