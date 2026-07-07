"use client";

import { useCallback, useEffect, useRef } from "react";

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

function getTopOverlay() {
  return overlayStack.at(-1);
}

function handleOverlayKeyDown(event: KeyboardEvent) {
  if (event.key !== "Escape" || event.repeat) {
    return;
  }

  const topOverlay = getTopOverlay();

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
  const idRef = useRef<symbol>(Symbol("overlay"));
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const id = idRef.current;

    if (!open) {
      removeRegisteredOverlay(id);
      return;
    }

    removeRegisteredOverlay(id);
    addOverlay({
      close: () => onCloseRef.current(),
      id,
    });

    return () => {
      removeRegisteredOverlay(id);
    };
  }, [open]);

  return {
    isTopOverlay: useCallback(() => isTopOverlay(idRef.current), []),
  };
}
