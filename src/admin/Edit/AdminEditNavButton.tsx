"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useFormContext } from "react-hook-form";

import IconButton from "@kenstack/components/IconButton";
import { useForm } from "@kenstack/forms/context";

export default function AdminEditNavButton({
  children,
  disabled = false,
  href,
  tooltip,
}: {
  children: ReactNode;
  disabled?: boolean;
  href: string;
  tooltip: string;
}) {
  const {
    formState: { isDirty },
  } = useFormContext();
  const { mutation, uploadingFields } = useForm();

  if (isDirty) {
    return (
      <IconButton
        disabled={disabled || mutation.isPending || uploadingFields.size > 0}
        isPending={mutation.isPending && mutation.variables.submitter === href}
        name="action"
        value={href}
        tooltip={tooltip}
      >
        {children}
      </IconButton>
    );
  }

  return (
    <IconButton disabled={disabled} tooltip={tooltip} asChild={!disabled}>
      {disabled ? children : <Link href={href}>{children}</Link>}
    </IconButton>
  );
}
