import type { ReactNode } from "react";

import { StepActions } from "@kenstack/components/StepFlow/StepActions";
import Submit from "@kenstack/forms/Submit";

import type { Continuation } from "./continuation";

// An embedded form submits through its flow's action renderer; its secondary
// link follows the action bar in both modes.
export default function LoginSubmit({
  children,
  continuation,
  label,
}: {
  children: ReactNode;
  continuation: Continuation;
  label: string;
}) {
  return (
    <>
      {continuation.mode === "embedded" ? (
        <StepActions next={label} />
      ) : (
        <Submit>{label}</Submit>
      )}
      {children}
    </>
  );
}
