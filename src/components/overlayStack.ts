"use client";

import { useCallback, useEffect, useEffectEvent, useRef } from "react";

type OverlayEntry = {
  close: () => void;
  id: symbol;
};

const overlayStack: OverlayEntry[] = [];

function removeOverlay(id: symbol) {
  const index = overlayStack.findIndex((entry) => entry.id === id);

  if (index >= 0) {
    overlayStack.splice(index, 1);
  }
}

function isTopOverlay(id: symbol) {
  return overlayStack.at(-1)?.id === id;
}

function handleOverlayKeyDown(event: KeyboardEvent) {
  if (event.key !== "Escape" || event.repeat) {
    return;
  }

  const topOverlay = overlayStack.at(-1);

  if (!topOverlay) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  topOverlay.close();
}

function addOverlay(entry: OverlayEntry) {
  const shouldAttachListener = overlayStack.length === 0;

  overlayStack.push(entry);

  if (shouldAttachListener) {
    document.addEventListener("keydown", handleOverlayKeyDown, true);
  }
}

function removeRegisteredOverlay(id: symbol) {
  removeOverlay(id);

  if (overlayStack.length === 0) {
    document.removeEventListener("keydown", handleOverlayKeyDown, true);
  }
}

export function useOverlayStack({
  onClose,
  open,
}: {
  onClose: () => void;
  open: boolean;
}) {
  const idRef = useRef(Symbol("overlay"));
  const onCloseEvent = useEffectEvent(onClose);

  useEffect(() => {
    if (!open) {
      return;
    }

    const id = idRef.current;
    addOverlay({
      close: () => onCloseEvent(),
      id,
    });

    return () => removeRegisteredOverlay(id);
  }, [open]);

  return {
    isTopOverlay: useCallback(() => isTopOverlay(idRef.current), []),
  };
}
