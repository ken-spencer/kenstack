import { notFound } from "next/navigation";

import DefaultActions from "./Actions";
import StepFlowClient from "./Client";
import StepHeading from "./Heading";
import type { Step, StepFlowProps } from "./types";

export type {
  Step,
  StepActionsProps,
  StepFlowParams,
  StepHeaderProps,
} from "./types";

// The server entry validates route-owned state before handing browser-owned
// navigation to the client flow.
export default async function StepFlow({
  Actions = DefaultActions,
  Header = StepHeading,
  id = "steps",
  params,
  steps,
  ...props
}: StepFlowProps) {
  const [routeParams, stepEntries] = await Promise.all([
    params,
    Promise.all(
      Object.entries(steps).map(
        async ([stepId, configuredStep]) =>
          [stepId, await configuredStep] as const,
      ),
    ),
  ]);
  const resolvedSteps = Object.fromEntries(
    stepEntries.filter(
      (entry): entry is readonly [string, Step] => entry[1] !== null,
    ),
  );
  const routeParam = routeParams?.step;

  if (Array.isArray(routeParam) && routeParam.length > 1) {
    notFound();
  }

  const step = Array.isArray(routeParam) ? routeParam[0] : routeParam;

  if (Object.keys(resolvedSteps).length === 0) {
    throw new Error("StepFlow requires at least one step.");
  }

  const configuredStepIndex = stepEntries.findIndex(
    ([stepId]) => stepId === step,
  );

  if (step !== undefined && configuredStepIndex === -1) {
    notFound();
  }

  // The route names the step. A configured step omitted by refreshed server
  // state continues to the next retained step; when none follows, the last
  // retained step is the nearest one before it.
  const retainedStepIds = Object.keys(resolvedSteps);
  const configuredStepIds = stepEntries.map(([stepId]) => stepId);
  const routeStep =
    step === undefined
      ? retainedStepIds[0]
      : Object.hasOwn(resolvedSteps, step)
        ? step
        : (retainedStepIds.find(
            (stepId) => configuredStepIds.indexOf(stepId) > configuredStepIndex,
          ) ?? retainedStepIds[retainedStepIds.length - 1]);

  return (
    <StepFlowClient
      {...props}
      Actions={Actions}
      Header={Header}
      id={id}
      routeStep={routeStep}
      steps={resolvedSteps}
    />
  );
}
