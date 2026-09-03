"use client";

import { useFlowContext } from "./context";
import type { StepActionsProps } from "./types";

export function StepActions(props: StepActionsProps) {
  const { Actions } = useFlowContext();

  return <Actions {...props} />;
}
