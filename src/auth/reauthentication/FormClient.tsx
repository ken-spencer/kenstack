"use client";

import { Fragment, type ReactNode, useEffect, useRef, useState } from "react";

import LoginForm from "@kenstack/auth/components/Login/Form";
import type { LoginMethod } from "@kenstack/auth/components/Login/method";
import { accountChangedRefusal } from "@kenstack/auth/renderedAccount";
import type { PublicAuthState } from "@kenstack/auth/server/state";
import { setUserInfo, useUserInfo } from "@kenstack/auth/useUserInfo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@kenstack/components/Dialog";
import Notice from "@kenstack/components/Notice";
import useConsumedSearchParam from "@kenstack/hooks/useConsumedSearchParam";

import { postReauthentication, useReauthenticationMessages } from "./channel";
import { AuthorizationContext } from "./context";

type Refusal = { code?: string; message: string };

type HeldRequest = {
  // Settles the caller with the original refusal, or with the one given.
  cancel: (refusal?: Refusal) => void;
  // Runs the request again; false while it is refused again for stale authorization.
  replay: () => Promise<boolean>;
};

const usableControl =
  'input:not([type="hidden"]):not([readonly]):not(:disabled), textarea:not(:disabled), button:not(:disabled)';

// Focus goes to the first control the person can use, such as the password field; the email field is
// the rendered account's and read-only.
function focusFirstUsable(dialog: HTMLDialogElement) {
  dialog.querySelector<HTMLElement>(usableControl)?.focus();
}

export default function ReauthenticationFormClient({
  children,
  email: renderedEmail,
  message,
  method,
  userId,
}: {
  children: ReactNode;
  email: string;
  message: string;
  method?: LoginMethod;
  userId: number;
}) {
  const userInfo = useUserInfo();
  // The account's current email, which a change finished in another tab moves; a code sent to the
  // old address would sign the visitor out on Civic.
  const email =
    userInfo.state === "authenticated" && userInfo.userId === userId
      ? userInfo.email
      : renderedEmail;
  const heldRef = useRef<HeldRequest[]>([]);
  const [heldCount, setHeldCount] = useState(0);
  const [isReplaying, setIsReplaying] = useState(false);
  const replayingRef = useRef(false);
  const replayAgainRef = useRef(false);
  // Set when held requests are cancelled mid-replay, with the refusal to settle them with; none means
  // their original refusal.
  const cancelRequestedRef = useRef<{ refusal?: Refusal }>(undefined);
  const focusResultRef = useRef(false);
  const [isRefusedAgain, setIsRefusedAgain] = useState(false);
  // Each opening mounts the confirmation form afresh, and a confirmation from an earlier opening
  // replays nothing.
  const [opening, setOpening] = useState(0);
  const openingRef = useRef(opening);
  const protectedAreaRef = useRef<HTMLDivElement>(null);
  const isOpen = heldCount > 0;
  // Set by a confirmation link opened in a new tab; the change it confirms is held in the first one.
  const isConfirmedElsewhere =
    useConsumedSearchParam("identityConfirmed") !== null;
  const [hasSavedHere, setHasSavedHere] = useState(false);

  useEffect(() => {
    if (isConfirmedElsewhere) {
      postReauthentication({ type: "confirmed", userId });
    }
  }, [isConfirmedElsewhere, userId]);

  // A confirmation in another tab confirms this browser, so what is held replays. A password reset
  // or email change finished elsewhere signed the account in afresh, so what is held here must not
  // run: it is dropped.
  useReauthenticationMessages((received) => {
    if (received.userId !== userId) {
      return;
    }
    if (received.type === "confirmed") {
      void replayHeld();
    } else {
      cancel(accountChangedRefusal);
    }
  });

  function hold(request: HeldRequest) {
    heldRef.current.push(request);
    if (heldRef.current.length === 1) {
      setIsRefusedAgain(false);
      openingRef.current += 1;
      setOpening(openingRef.current);
    }
    setHeldCount(heldRef.current.length);
  }

  function track<T extends { code?: string; status: string }>(
    request: () => Promise<T>,
  ) {
    return request().then((result) => {
      if (result.code !== "reauthentication-required") {
        if (result.status === "success") {
          setHasSavedHere(true);
        }
        return result;
      }
      return new Promise<T>((resolve, reject) => {
        hold({
          cancel: (refusal) =>
            resolve(refusal ? { ...result, ...refusal } : result),
          replay: async () => {
            let replayed: T;
            try {
              replayed = await request();
            } catch (error) {
              // A network failure settles with that failure; it is never retried on its own.
              reject(error);
              return true;
            }
            if (replayed.code === "reauthentication-required") {
              return false;
            }
            if (replayed.status === "success") {
              setHasSavedHere(true);
            }
            // A refusal for another account or no session settles here, like any other result.
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
  async function replayHeld({ quiet = false }: { quiet?: boolean } = {}) {
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
      cancelRequestedRef.current === undefined
    );
    replayingRef.current = false;
    setIsReplaying(false);
    focusResultRef.current = !heldRef.current.length;
    if (cancelRequestedRef.current !== undefined) {
      const { refusal } = cancelRequestedRef.current;
      cancelRequestedRef.current = undefined;
      cancel(refusal);
      return;
    }
    if (isRefused && !isQuietPass) {
      setIsRefusedAgain(true);
    }
    setHeldCount(heldRef.current.length);
  }

  // Closing settles every held request with its original refusal, so its form reports that nothing
  // was written; a change finished elsewhere settles them with its own. During a replay it waits for
  // the replay to settle and applies to what is still held.
  function cancel(refusal?: Refusal) {
    if (replayingRef.current) {
      cancelRequestedRef.current = { refusal };
      return;
    }
    for (const request of heldRef.current.splice(0)) {
      request.cancel(refusal);
    }
    setHeldCount(0);
  }

  function confirm(authState: PublicAuthState, fromOpening: number) {
    // Another account, or none, is never this page's: replaying lets the server refuse each held
    // request for it, and nothing is written.
    if (authState.state === "authenticated" && authState.userId === userId) {
      setUserInfo(authState);
      postReauthentication({ type: "confirmed", userId });
    }
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
          onShow={focusFirstUsable}
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
          <div className="space-y-4">
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
                  <Fragment key={opening}>
                    {/* The form captures its email once; an email change while open starts it again
                        for the new address, keeping what is held and the page's draft. */}
                    <LoginForm
                      key={email}
                      email={email}
                      method={method}
                      mode="reauthentication"
                    />
                  </Fragment>
                </fieldset>
              ) : null}
            </AuthorizationContext>
          </div>
        </DialogContent>
      </Dialog>
    </AuthorizationContext>
  );
}
