import DefaultActions from "./Actions";
import StepFlowClient from "./Client";
import StepHeading from "./Heading";
import type { Step, StepFlowProps } from "./types";

export type { Step, StepActionsProps, StepHeaderProps } from "./types";

// The server entry resolves the composed steps before handing browser-owned
// navigation to the client flow. Every visit enters at the first step.
export default async function StepFlow({
  Actions = DefaultActions,
  Header = StepHeading,
  id = "steps",
  steps,
  ...props
}: StepFlowProps) {
  const stepEntries = await Promise.all(
    Object.entries(steps).map(
      async ([stepId, configuredStep]) =>
        [stepId, await configuredStep] as const,
    ),
  );
  const resolvedSteps = Object.fromEntries(
    stepEntries.filter(
      (entry): entry is readonly [string, Step] => entry[1] !== null,
    ),
  );
  const retainedStepIds = Object.keys(resolvedSteps);

  if (retainedStepIds.length === 0) {
    throw new Error("StepFlow requires at least one step.");
  }

  return (
    <StepFlowClient
      {...props}
      Actions={Actions}
      Header={Header}
      id={id}
      steps={resolvedSteps}
      // Each server render of the flow is a visit, including a link to the
      // flow's own URL, which Next re-renders without remounting the client.
      visitKey={crypto.randomUUID()}
    />
  );
}
