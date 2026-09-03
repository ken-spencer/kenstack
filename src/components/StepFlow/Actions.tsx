"use client";

import { isValidElement } from "react";

import Button from "@kenstack/components/Button";
import { useOptionalForm } from "@kenstack/forms/context";
import SubmitButton from "@kenstack/forms/Submit";

import { useStep } from "./context";
import type { StepActionsProps } from "./types";

export default function DefaultActions({ children, next }: StepActionsProps) {
  return (
    <div className="step-actions">
      {children}
      <NextAction next={next} />
    </div>
  );
}

function NextAction({ next: configuredNext }: Pick<StepActionsProps, "next">) {
  const { next } = useStep();
  const form = useOptionalForm();

  if (isValidElement(configuredNext) || configuredNext === null) {
    return configuredNext;
  }

  const options =
    typeof configuredNext === "string"
      ? { label: configuredNext }
      : (configuredNext ?? {});
  const type = options.type ?? (form ? "submit" : "button");
  const ActionButton = type === "submit" && form ? SubmitButton : Button;

  return (
    <ActionButton
      className="next"
      disabled={options.disabled}
      isPending={options.isPending}
      onClick={options.onClick ?? (type === "button" ? next : undefined)}
      type={type}
    >
      {options.label ?? "Continue"}
    </ActionButton>
  );
}
