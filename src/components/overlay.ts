"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

export function useControllableOpen({
  defaultOpen = false,
  onOpenChange,
  open: openProp,
}: {
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (openProp === undefined) {
        setUncontrolledOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [onOpenChange, openProp],
  );

  return [open, setOpen] as const;
}

export function useDialogTransition(
  dialogRef: RefObject<HTMLDialogElement | null>,
  open: boolean,
  durationMs: number,
  onShow?: (dialog: HTMLDialogElement) => void,
) {
  const closeTimerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [visibleOpen, setVisibleOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (!open) {
      if (!dialog.open) {
        setVisibleOpen(false);
        return;
      }

      setVisibleOpen(false);

      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }

      closeTimerRef.current = window.setTimeout(() => {
        closeTimerRef.current = null;
        dialog.close();
      }, durationMs);
      return;
    }

    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (!dialog.open) {
      dialog.showModal();
    }

    onShow?.(dialog);
    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null;
      onShow?.(dialog);
      setVisibleOpen(true);
    });
  }, [dialogRef, durationMs, onShow, open]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }

      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    },
    [],
  );

  return visibleOpen;
}
