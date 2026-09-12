"use client";

import Notice from "@kenstack/components/Notice";
import { useForm } from "@kenstack/forms/context";
import {
  getFormFieldErrors,
  hasRegisteredField,
} from "@kenstack/forms/internal/fieldErrors";
import { useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@kenstack/components/Button";
import { CircleX } from "lucide-react";

export default function NoticeList({
  validationMessage = "We couldn't submit the form. Check the highlighted fields for more information.",
}: {
  validationMessage?: React.ReactNode;
}) {
  const { statusMessage, setStatusMessage } = useForm();
  const {
    control,
    formState: { errors, isSubmitted, submitCount },
  } = useFormContext();
  const ref = useRef<HTMLDivElement | null>(null);
  const fieldErrors = getFormFieldErrors(errors);
  const unrenderedErrors = fieldErrors.filter(
    ({ name }) =>
      name === "root" ||
      name.startsWith("root.") ||
      !hasRegisteredField(control._fields, name),
  );
  const showValidation =
    unrenderedErrors.length > 0 || (isSubmitted && fieldErrors.length > 0);

  // Scroll to a submission outcome, never to the validation state changing
  // under the user's edits.
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest", // Scroll only as much as needed vertically
      });
    }
  }, [statusMessage, submitCount]);

  if (!showValidation && statusMessage === null) {
    return null;
  }

  const isError = showValidation || statusMessage?.status === "error";
  return (
    <Notice
      ref={ref}
      className="scroll-mt-12"
      role={isError ? "alert" : "status"}
      status={isError ? "error" : statusMessage?.status}
    >
      <div className="flex items-center">
        <div className="grow">
          {showValidation
            ? statusMessage?.status === "error"
              ? statusMessage.message
              : validationMessage
            : statusMessage?.message}
          {unrenderedErrors.length ? (
            <ul className="mt-4 list-disc pl-8">
              {unrenderedErrors.map(
                ({ message: errorMessage, name }, index) => (
                  <li key={`${name}-${index}`}>{errorMessage}</li>
                ),
              )}
            </ul>
          ) : null}
        </div>
        {statusMessage ? (
          <Button
            aria-label="Dismiss message"
            size="icon"
            className="flex-0"
            variant="ghost"
            type="button"
            onClick={() => setStatusMessage(null)}
          >
            <CircleX />
          </Button>
        ) : null}
      </div>
    </Notice>
  );
}
