"use client";

import { accountChangedRefusal } from "@kenstack/auth/renderedAccount";
import { recordChangedCode } from "@kenstack/records/conflict";
import Notice from "@kenstack/components/Notice";
import { useForm } from "@kenstack/forms/context";
import { useSubmitFailure } from "@kenstack/forms/internal/submitFailure";
import {
  formErrorName,
  getFormFieldErrors,
  hasRegisteredField,
} from "@kenstack/forms/internal/fieldErrors";
import { useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@kenstack/components/Button";
import { CircleX } from "lucide-react";

export default function NoticeList({
  validationMessage = "We couldn't submit the form. Check the highlighted fields for more information.",
}: {
  validationMessage?: React.ReactNode;
}) {
  const { statusMessage, setStatusMessage } = useForm();
  const { submitFailure } = useSubmitFailure();
  const {
    control,
    formState: { errors, submitCount },
  } = useFormContext();
  const ref = useRef<HTMLDivElement | null>(null);
  const fieldErrors = getFormFieldErrors(errors);
  const isFormError = (name: string) =>
    name === "root" ||
    name.startsWith("root.") ||
    name.startsWith(formErrorName);
  const unrenderedErrors = fieldErrors.filter(
    ({ name }) =>
      isFormError(name) || !hasRegisteredField(control._fields, name),
  );
  // A failed submit shows until the next submit, or until its field errors, once shown, are all fixed;
  // typing never brings it back.
  const [shownFailure, setShownFailure] = useState({
    failure: submitFailure,
    fixed: false,
    hadErrors: false,
  });
  if (shownFailure.failure !== submitFailure) {
    setShownFailure({
      failure: submitFailure,
      fixed: false,
      hadErrors: fieldErrors.length > 0,
    });
  } else if (submitFailure && !shownFailure.hadErrors && fieldErrors.length) {
    setShownFailure({ ...shownFailure, hadErrors: true });
  } else if (
    shownFailure.hadErrors &&
    !shownFailure.fixed &&
    !fieldErrors.length
  ) {
    setShownFailure({ ...shownFailure, fixed: true });
  }
  const showValidation =
    unrenderedErrors.length > 0 ||
    (submitFailure !== null && !shownFailure.fixed);

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
  // Errors tied to no field say what is wrong themselves; with nothing highlighted, they show alone.
  const showsFormErrorsAlone =
    fieldErrors.length > 0 &&
    fieldErrors.every(({ name }) => isFormError(name)) &&
    statusMessage?.status !== "error";
  return (
    <Notice
      ref={ref}
      className="scroll-mt-12"
      role={isError ? "alert" : "status"}
      status={isError ? "error" : statusMessage?.status}
    >
      <div className="flex items-center gap-3">
        <div className="grow">
          {showsFormErrorsAlone ? (
            unrenderedErrors.map(({ message: errorMessage, name }, index) => (
              <p key={`${name}-${index}`}>{errorMessage}</p>
            ))
          ) : (
            <>
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
            </>
          )}
        </div>
        {showValidation && fieldErrors.length > unrenderedErrors.length ? (
          <Button
            className="shrink-0"
            size="sm"
            variant="outline"
            type="button"
            onClick={(event) => {
              const message =
                event.currentTarget.form?.querySelector<HTMLElement>(
                  '[data-slot="form-message"]',
                );
              const control = message?.id
                ? event.currentTarget.form?.querySelector<HTMLElement>(
                    `[aria-describedby~="${message.id}"]`,
                  )
                : null;
              (control ?? message)?.focus({ preventScroll: true });
              message?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          >
            View error
          </Button>
        ) : null}
        {statusMessage?.code === accountChangedRefusal.code ||
        statusMessage?.code === recordChangedCode ? (
          <Button
            className="shrink-0"
            size="sm"
            type="button"
            onClick={() => window.location.reload()}
          >
            Reload
          </Button>
        ) : null}
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
