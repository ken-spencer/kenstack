"use client";

import { useEffect, useRef, useState } from "react";

import { formatDecimalAmount, parseDecimalAmount } from "@kenstack/lib/money";
import { Input } from "./Input";

type MoneyInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "inputMode" | "onChange" | "type" | "value"
> & {
  onValueChange: (cents: number | null) => void;
  value: number | null | undefined;
};

// Preserves editable decimal text while reporting complete values as integer cents.
export default function MoneyInput({
  onBlur,
  onFocus,
  onValueChange,
  placeholder = "0.00",
  value,
  ...props
}: MoneyInputProps) {
  const [text, setText] = useState(() => formatDecimalAmount(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) {
      setText(formatDecimalAmount(value));
    }
  }, [value]);

  return (
    <Input
      {...props}
      inputMode="decimal"
      placeholder={placeholder}
      type="text"
      value={text}
      onChange={(event) => {
        const nextText = event.currentTarget.value;
        const cents = parseDecimalAmount(nextText);

        if (cents === undefined) {
          return;
        }

        setText(nextText);
        onValueChange(cents);
      }}
      onFocus={(event) => {
        focused.current = true;
        onFocus?.(event);
      }}
      onBlur={(event) => {
        focused.current = false;
        setText(formatDecimalAmount(parseDecimalAmount(text)));
        onBlur?.(event);
      }}
    />
  );
}
