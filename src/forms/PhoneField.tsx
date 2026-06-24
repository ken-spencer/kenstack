"use client";

import InputField from "@kenstack/forms/InputField";

type PhoneFieldProps = Omit<
  React.ComponentProps<typeof InputField>,
  "onBlur" | "onChange" | "type"
>;

function formatPhoneNumber(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  const phoneDigits =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

  if (phoneDigits.length === 10) {
    return `${phoneDigits.slice(0, 3)}-${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6)}`;
  }

  return trimmed.replace(/\s+/g, " ");
}

function formatPhoneNumberInput(value: string) {
  const digits = value.replace(/\D/g, "");
  const phoneDigits =
    digits.length > 10 && digits.startsWith("1")
      ? digits.slice(1, 11)
      : digits.slice(0, 10);

  if (phoneDigits.length > 6) {
    return `${phoneDigits.slice(0, 3)}-${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6)}`;
  }

  if (phoneDigits.length > 3) {
    return `${phoneDigits.slice(0, 3)}-${phoneDigits.slice(3)}`;
  }

  return phoneDigits;
}

export default function PhoneField({
  autoComplete = "tel",
  placeholder = "###-###-####",
  ...props
}: PhoneFieldProps) {
  return (
    <InputField
      {...props}
      type="tel"
      autoComplete={autoComplete}
      placeholder={placeholder}
      onChange={({ event, field }) => {
        field.onChange(formatPhoneNumberInput(event.currentTarget.value));
      }}
      onBlur={({ event, field }) => {
        field.onChange(formatPhoneNumber(event.currentTarget.value));
      }}
    />
  );
}
