"use client";

import { useFormContext } from "react-hook-form";

import InputField from "@kenstack/forms/InputField";

// Six-digit one-time-code entry: scrubs input to digits and submits its form
// once complete, so a valid code never needs a second click.
export default function VerificationCodeField({
  disabled,
  name,
}: {
  disabled?: boolean;
  name: string;
}) {
  const { clearErrors } = useFormContext();

  return (
    <InputField
      autoComplete="one-time-code"
      autoFocus
      disabled={disabled}
      inputMode="numeric"
      label="Six-digit code"
      maxLength={6}
      name={name}
      onChange={({ event, field }) => {
        const digits = event.target.value.replace(/\D/g, "").slice(0, 6);
        field.onChange(digits);

        if (digits.length === 6) {
          event.target.form?.requestSubmit();
        } else {
          // Submission here is a convenience, not a user action: editing an
          // already-submitted code must not surface incomplete-form errors.
          clearErrors(name);
        }
      }}
    />
  );
}
