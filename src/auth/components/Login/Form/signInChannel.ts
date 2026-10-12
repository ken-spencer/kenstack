"use client";

import { useEffect } from "react";

import type { FetchResult } from "@kenstack/api/fetcher";
import type { EmailLoginVerificationResult } from "@kenstack/auth/api";
import { postReauthentication } from "@kenstack/auth/reauthentication/channel";
import { refreshUserInfo } from "@kenstack/auth/useUserInfo";
import { normalizeEmail } from "@kenstack/fields/email";
import unsecureId from "@kenstack/lib/unsecureId";

// An emailed sign-in link opened in a new tab asks the site's other tabs whether one waits on that
// sign-in's code form. A waiting tab answers with its email, which is what both tabs know once the
// link is verified. The channel reaches only this site's tabs in this browser; no token or challenge
// crosses it.
const channelName = "kenstack-sign-in";
// Long enough for a live tab to answer. A tab the browser has suspended does not, and the link tab
// then carries on in place.
const answerWindowMs = 200;

type Message =
  | { id: string; type: "ask" }
  | { email: string; id: string; type: "waiting" | "signed-in" };

// Asks while `request` runs, and resolves with its result and whether a tab waiting on that sign-in
// answered by the time it settled, or answerWindowMs after asking, whichever is later. A sign-in a
// waiting tab answered is reported to it, and a confirmation held for the account replays.
export async function askWaitingTabs(
  request: Promise<FetchResult<EmailLoginVerificationResult>>,
) {
  const channel = new BroadcastChannel(channelName);
  const id = unsecureId();
  const emails = new Set<string>();
  channel.onmessage = ({ data }: MessageEvent<Message>) => {
    if (data.type === "waiting" && data.id === id) {
      emails.add(data.email);
    }
  };
  channel.postMessage({ id, type: "ask" } satisfies Message);
  try {
    const [result] = await Promise.all([
      request,
      new Promise((resolve) => setTimeout(resolve, answerWindowMs)),
    ]);
    if (
      result.status === "success" &&
      "email" in result.authState &&
      emails.has(result.authState.email)
    ) {
      channel.postMessage({
        email: result.authState.email,
        id,
        type: "signed-in",
      } satisfies Message);
      if (result.authState.state === "authenticated") {
        postReauthentication({
          type: "confirmed",
          userId: result.authState.userId,
        });
      }
      return { isAnswered: true, result };
    }
    return { isAnswered: false, result };
  } finally {
    channel.close();
  }
}

// A code form on screen answers for its email; null answers nothing.
export function useAnswerSignInAsks(email: string | null) {
  useEffect(() => {
    if (email === null) {
      return;
    }
    const channel = new BroadcastChannel(channelName);
    channel.onmessage = ({ data }: MessageEvent<Message>) => {
      if (data.type === "ask") {
        channel.postMessage({
          email: normalizeEmail(email),
          id: data.id,
          type: "waiting",
        } satisfies Message);
      } else if (
        data.type === "signed-in" &&
        data.email === normalizeEmail(email)
      ) {
        // The link tab signed in for this form, so its sign-in is adopted at once, hidden or not.
        // The message prompts a server check; it never supplies the identity the form adopts.
        void refreshUserInfo();
      }
    };
    return () => channel.close();
  }, [email]);
}
