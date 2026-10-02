"use client";

import { useEffect } from "react";

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
  { id: string; type: "ask" } | { email: string; id: string; type: "waiting" };

// Asks while `request` runs, and resolves with its result and the emails of the tabs that answered
// by the time it settled, or answerWindowMs after asking, whichever is later.
export async function askWaitingTabs<T>(request: Promise<T>) {
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
    return { emails, result };
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
      }
    };
    return () => channel.close();
  }, [email]);
}
