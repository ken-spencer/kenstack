"use client";

import { useEffect, useEffectEvent } from "react";

// Confirmations and completed changes reach the account's other tabs here. "confirmed": a tab holding
// requests for the account replays them. "saved": a password reset or email change finished elsewhere,
// so what a tab holds for the account is dropped. One channel per tab, created on first use in the
// browser; a channel never hears its own posts, so this tab ignores what it sends.
const channelName = "kenstack-reauthentication";
let channel: BroadcastChannel | undefined;

type ReauthenticationMessage = {
  type: "confirmed" | "saved";
  userId: number;
};

function openChannel() {
  channel ??= new BroadcastChannel(channelName);
  return channel;
}

export function postReauthentication(message: ReauthenticationMessage) {
  openChannel().postMessage(message);
}

export function useReauthenticationMessages(
  onMessage: (message: ReauthenticationMessage) => void,
) {
  const handleMessage = useEffectEvent(onMessage);
  useEffect(() => {
    const listener = (event: MessageEvent<ReauthenticationMessage>) =>
      handleMessage(event.data);
    const target = openChannel();
    target.addEventListener("message", listener);
    return () => target.removeEventListener("message", listener);
  }, []);
}
