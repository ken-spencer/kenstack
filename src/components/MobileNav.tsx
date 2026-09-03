"use client";

import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@kenstack/lib/utils";

// The toggle draws MenuIcon's bar geometry (27×3px at y 9/16.5/24 for the
// 36px icon) as elements so the bars can morph between burger and X in place.
const menuBarClassName =
  "absolute left-[4.5px] h-[3px] w-[27px] bg-current transition-[translate,rotate,opacity] duration-300 ease-in-out motion-reduce:transition-none";

// Mobile navigation shell. The toggle lives in the header, above the menu in
// the ordinary stacking order, so its bars morph between burger and X in place
// while only the panel moves. The modal boundary keeps the persistent toggle
// and panel in one focus cycle; z-index floats the toggle over the panel while
// Escape and the scrim close it. Hosts supply the content and brand styling.
export default function MobileNav({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleResize() {
      if (!toggleRef.current?.getClientRects().length) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }

    // A partially scrolled-away toggle would be frozen half-clipped by the
    // scroll lock; reveal it fully before locking.
    toggleRef.current?.scrollIntoView({ block: "nearest" });

    // The open menu owns the screen: locking page scroll keeps the toggle
    // anchored over the fixed panel (the containment a native modal dialog
    // would have provided).
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    return () => {
      root.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);

  return (
    <div
      aria-label={open ? "Navigation" : undefined}
      aria-modal={open || undefined}
      ref={wrapperRef}
      role={open ? "dialog" : undefined}
      onKeyDown={(event) => {
        if (event.key !== "Tab" || !open) {
          return;
        }

        const controls = wrapperRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );

        if (!controls?.length) {
          return;
        }

        const firstControl = controls.item(0);
        const lastControl = controls.item(controls.length - 1);

        if (event.shiftKey && document.activeElement === firstControl) {
          event.preventDefault();
          lastControl.focus();
        } else if (!event.shiftKey && document.activeElement === lastControl) {
          event.preventDefault();
          firstControl.focus();
        }
      }}
    >
      <button
        ref={toggleRef}
        type="button"
        aria-controls={panelId}
        aria-expanded={open}
        aria-label={open ? "Close navigation" : "Open navigation"}
        className="relative z-50 flex size-11 items-center justify-center bg-transparent p-0 text-current outline-none focus-visible:opacity-75"
        onClick={() => {
          setOpen(!open);
        }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none relative block size-9"
        >
          <span
            className={cn(
              menuBarClassName,
              "top-[9px]",
              open && "translate-y-[7.5px] rotate-45",
            )}
          />
          <span
            className={cn(
              menuBarClassName,
              "top-[16.5px]",
              open && "-translate-x-1.5 opacity-0",
            )}
          />
          <span
            className={cn(
              menuBarClassName,
              "top-[24px]",
              open && "-translate-y-[7.5px] -rotate-45",
            )}
          />
        </span>
      </button>
      <div
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 motion-reduce:transition-none",
          open ? "opacity-100 duration-500" : "pointer-events-none opacity-0",
        )}
        onClick={() => {
          setOpen(false);
          toggleRef.current?.focus();
        }}
      />
      <div
        data-slot="mobile-nav"
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-80 max-w-[calc(100vw-2rem)] -translate-x-6 overflow-y-auto overscroll-contain border-r pt-20 opacity-0 transition-[translate,opacity] duration-300 ease-in-out motion-reduce:transition-none",
          open && "translate-x-0 opacity-100 duration-[500ms,650ms]",
          className,
        )}
        id={panelId}
        inert={!open}
        onClick={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest("a,button")
          ) {
            setOpen(false);
            // The panel goes inert on close; focus must leave it with the user.
            toggleRef.current?.focus();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
