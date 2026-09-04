"use client";

import { useEffect, useEffectEvent } from "react";

// Cmd/Ctrl+S for an admin editor. The browser's own save dialog is always
// suppressed; the editor decides whether a save is possible right now.
export function useSaveShortcut(onSave: () => void) {
  const save = useEffectEvent(onSave);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === "s"
      ) {
        event.preventDefault();
        // A field that commits on blur, such as a typed date, must reach the
        // form before the save decides; blur it, save once that state has
        // rendered, then hand focus back.
        const active = document.activeElement;
        if (active instanceof HTMLElement && active !== document.body) {
          active.blur();
        }
        timer = setTimeout(() => {
          save();
          if (active instanceof HTMLElement && active.isConnected) {
            active.focus();
          }
        }, 0);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
}
