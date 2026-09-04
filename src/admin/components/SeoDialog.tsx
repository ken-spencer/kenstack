"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormContext, useFormState } from "react-hook-form";
import { SearchCheck } from "lucide-react";

import Button from "@kenstack/components/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@kenstack/components/Dialog";
import Help from "@kenstack/components/Help";

/*
 * Header-triggered dialog for a form's SEO fields, shared by module edit
 * forms and the Composer. The fields stay registered in the surrounding form
 * while hidden; when a save fails on one of them the trigger badges and the
 * dialog opens so the problem lands in view. Pass a stable `names` array.
 */
export default function SeoDialog({
  children,
  names,
}: {
  children: ReactNode;
  names: readonly string[];
}) {
  const { getFieldState, subscribe } = useFormContext();
  const formState = useFormState({ name: names });
  const hasErrors = names.some((name) => getFieldState(name, formState).error);
  const [open, setOpen] = useState(false);
  const hadErrors = useRef(false);

  // Open once when an error appears, not on every later form-state emission
  // while it stands, so the author can close the dialog and work elsewhere.
  useEffect(
    () =>
      subscribe({
        formState: { errors: true },
        callback: () => {
          const failing = names.some((name) => getFieldState(name).error);
          if (failing && !hadErrors.current) {
            setOpen(true);
          }
          hadErrors.current = failing;
        },
      }),
    [getFieldState, names, subscribe],
  );

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button
          className="relative"
          size="icon"
          tooltip="Search & sharing"
          type="button"
          variant="ghost"
        >
          <SearchCheck className="text-foreground size-6" />
          <span className="sr-only">
            Search &amp; sharing{hasErrors ? ", has validation problems" : ""}
          </span>
          {hasErrors ? (
            <span
              aria-hidden="true"
              className="bg-destructive absolute top-1.5 right-1.5 size-2 rounded-full"
            />
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Search &amp; sharing</DialogTitle>
          <DialogDescription className="sr-only">
            How this page appears in search results and link previews. Empty
            fields fall back to the page&apos;s own text or the site&apos;s
            default image.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6">{children}</div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button">Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SeoDialogSection({
  children,
  help,
  title,
}: {
  children: ReactNode;
  help: ReactNode;
  title: string;
}) {
  return (
    <fieldset className="grid gap-4">
      <legend className="mb-3 flex items-center gap-1.5 text-sm font-medium">
        {title}
        <Help message={help} />
      </legend>
      {children}
    </fieldset>
  );
}
