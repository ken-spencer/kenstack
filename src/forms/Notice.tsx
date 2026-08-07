"use client";

import Alert from "@kenstack/components/Alert";
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
    formState: { errors, isSubmitted },
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

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest", // Scroll only as much as needed vertically
      });
    }
  }, [showValidation, statusMessage]);

  if (showValidation) {
    const responseMessage =
      statusMessage?.status === "error" ? statusMessage.message : null;

    return (
      <Alert ref={ref} className="scroll-mt-12" role="alert">
        <div>{responseMessage ?? validationMessage}</div>
        {unrenderedErrors.length ? (
          <ul className="mt-4 list-disc pl-8">
            {unrenderedErrors.map(({ message, name }, index) => (
              <li key={`${name}-${index}`}>{message}</li>
            ))}
          </ul>
        ) : null}
      </Alert>
    );
  }

  if (statusMessage === null) {
    return null;
  }
  return (
    <Alert ref={ref} status={statusMessage.status} className="scroll-mt-12">
      <div className="flex items-center">
        <div className="grow">{statusMessage.message}</div>
        <Button
          size="icon"
          className="flex-0"
          variant="ghost"
          type="button"
          onClick={() => setStatusMessage(null)}
        >
          <CircleX />
        </Button>
      </div>
    </Alert>
  );
}
