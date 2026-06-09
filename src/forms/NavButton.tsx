"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useFormContext } from "react-hook-form";

import Button, { type ButtonProps } from "@kenstack/components/Button";

import { useForm } from "./context";

export default function FormNavButton({
  children,
  disabled = false,
  href,
  ...props
}: Omit<ButtonProps, "asChild" | "isPending" | "name" | "type" | "value"> & {
  children: ReactNode;
  href: string;
}) {
  const {
    formState: { isDirty },
  } = useFormContext();
  const { mutation, uploadingFields } = useForm();

  if (isDirty) {
    const isPending =
      mutation.isPending && mutation.variables?.submitter === href;

    return (
      <Button
        variant="ghost"
        {...props}
        disabled={disabled || mutation.isPending || uploadingFields.size > 0}
        isPending={isPending}
        name="action"
        type="submit"
        value={href}
        aria-busy={isPending || undefined}
      >
        {children}
      </Button>
    );
  }

  return (
    <Button variant="ghost" {...props} asChild={!disabled} disabled={disabled}>
      {disabled ? children : <Link href={href}>{children}</Link>}
    </Button>
  );
}
