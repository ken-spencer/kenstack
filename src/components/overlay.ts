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

    if (!dialog.open) {
      dialog.showModal();
    }

    onShow?.(dialog);
    // Committing the just-shown dialog's closed-state layout makes the open
    // state that follows a style change, so the transition starts on the very
    // next paint — no animation-frame wait between the press and the motion.
    // The synchronous set is deliberate: both renders land in one pre-paint
    // task, which is what keeps the enter transition immediate.
    void dialog.getBoundingClientRect();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleOpen(true);
  }, [dialogRef, durationMs, onShow, open]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    [],
  );

  return visibleOpen;
}
