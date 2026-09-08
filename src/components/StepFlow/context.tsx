"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as z from "zod";

import Notice from "@kenstack/components/Notice";
import {
  clearStoredState,
  useStorageAvailability,
  useStoredValue,
} from "@kenstack/hooks/storedState";
import useIsHydrated from "@kenstack/hooks/useIsHydrated";

import type { Step, StepFlowProps } from "./types";

type FlowContextValue = {
  Actions: NonNullable<StepFlowProps["Actions"]>;
  activeStep: string | undefined;
  basePath: string;
  id: string;
  isFinalStep: boolean;
  isFirstStep: boolean;
  next: () => void;
  previous: () => void;
  setActiveStep: (stepId: string) => void;
  setStepSkipped: (stepId: string, skipped: boolean) => void;
  stepIds: string[];
};

const FlowContext = createContext<FlowContextValue | null>(null);

const StepScopeContext = createContext<string | null>(null);

const completedStepsSchema = z.record(z.string().min(1), z.literal(true));

export function useFlowContext() {
  const context = useContext(FlowContext);

  if (!context) {
    throw new Error("A StepFlow is required.");
  }

  return context;
}

export function FlowProvider({
  Actions,
  basePath,
  children,
  id,
  routeStep,
  steps,
}: {
  Actions: NonNullable<StepFlowProps["Actions"]>;
  basePath: string;
  children: ReactNode;
  id: string;
  routeStep: string;
  steps: Record<string, Step>;
}) {
  const isHydrated = useIsHydrated();
  const isStorageAvailable = useStorageAvailability();
  const [completedSteps = {}, setCompletedSteps] = useStoredValue(
    basePath,
    "$completedSteps",
    completedStepsSchema,
  );
  // The flow owns its step, seeded from the route the server resolved; the
  // URL only mirrors it. If a server refresh omits the step the flow navigated
  // to, the route's fresh resolution stands in for it.
  const [navigatedStep, setNavigatedStep] = useState(routeStep);
  const [skippedSteps, setSkippedSteps] = useState<Record<string, boolean>>({});
  const setStepSkipped = useCallback((stepId: string, skipped: boolean) => {
    setSkippedSteps((current) =>
      current[stepId] === skipped ? current : { ...current, [stepId]: skipped },
    );
  }, []);
  const configuredStepIds = Object.keys(steps);
  const stepIds = configuredStepIds.filter(
    (stepId) => !(skippedSteps[stepId] ?? steps[stepId].skipped),
  );
  const routeTarget = Object.hasOwn(steps, navigatedStep)
    ? navigatedStep
    : routeStep;
  const requestedStep = stepIds.includes(routeTarget)
    ? routeTarget
    : (stepIds.find(
        (stepId) =>
          configuredStepIds.indexOf(stepId) >
          configuredStepIds.indexOf(routeTarget),
      ) ?? stepIds.at(-1));
  const firstIncompleteStepIndex = stepIds.findIndex(
    (stepId) =>
      (skippedSteps[stepId] ?? steps[stepId].skipped) === false ||
      (isHydrated && completedSteps[stepId] !== true),
  );
  const lastReachableStepIndex =
    firstIncompleteStepIndex === -1
      ? stepIds.length - 1
      : firstIncompleteStepIndex;
  // Live prerequisites apply before hydration too. The browser ledger becomes
  // readable after hydration; final result steps bypass both.
  const activeStep =
    requestedStep === undefined || steps[requestedStep].final
      ? requestedStep
      : stepIds[
          Math.min(stepIds.indexOf(requestedStep), lastReachableStepIndex)
        ];
  const activeStepIndex =
    activeStep === undefined ? -1 : stepIds.indexOf(activeStep);
  const setRouteStep = useCallback(
    (stepId: string) => {
      setNavigatedStep(stepId);
      window.history.replaceState(
        null,
        "",
        `${basePath}/${encodeURIComponent(stepId)}${window.location.search}${window.location.hash}`,
      );
    },
    [basePath],
  );
  const setActiveStep = useCallback(
    (stepId: string) => {
      const requestedIndex = stepIds.indexOf(stepId);

      if (requestedIndex !== -1) {
        setRouteStep(stepIds[Math.min(requestedIndex, lastReachableStepIndex)]);
      }
    },
    [lastReachableStepIndex, setRouteStep, stepIds],
  );
  useEffect(() => {
    if (activeStep === undefined || !steps[activeStep].final) {
      return;
    }

    clearStoredState(basePath);
  }, [activeStep, basePath, steps]);

  // The URL follows the settled step: the base path gains its segment, and a
  // requested step the ledger refused is replaced by the one presented.
  useEffect(() => {
    if (activeStep === undefined || !isHydrated || !isStorageAvailable) {
      return;
    }

    const path = `${basePath}/${encodeURIComponent(activeStep)}`;

    if (window.location.pathname !== path) {
      window.history.replaceState(
        null,
        "",
        `${path}${window.location.search}${window.location.hash}`,
      );
    }
  }, [activeStep, basePath, isHydrated, isStorageAvailable]);

  // A final step needs no storage, so a result page still renders when the
  // ledger cannot be written.
  if (
    !isStorageAvailable &&
    (activeStep === undefined || !steps[activeStep].final)
  ) {
    return (
      <div className="step-flow" id={id}>
        <Notice
          message="Browser storage is required to continue. Enable cookies and site data for this site, then reload the page."
          role="alert"
        />
      </div>
    );
  }

  return (
    <FlowContext.Provider
      value={{
        Actions,
        activeStep,
        basePath,
        id,
        isFinalStep:
          activeStep !== undefined && steps[activeStep].final === true,
        isFirstStep: activeStepIndex <= 0,
        next: () => {
          if (activeStep === undefined) {
            return;
          }
          const nextStepId = stepIds[activeStepIndex + 1];
          if (nextStepId === undefined) {
            return;
          }
          // The ledger is read back at write time so an expired flow
          // cleared by this write cannot resurrect the old ledger.
          if (
            !steps[nextStepId].final &&
            !setCompletedSteps((current) => ({
              ...current,
              [activeStep]: true,
            }))
          ) {
            return;
          }
          setRouteStep(nextStepId);
        },
        previous: () => {
          const previousStepId = stepIds[activeStepIndex - 1];
          if (previousStepId !== undefined) {
            setRouteStep(previousStepId);
          }
        },
        setActiveStep,
        setStepSkipped,
        stepIds,
      }}
    >
      {children}
    </FlowContext.Provider>
  );
}

export function StepScope({
  children,
  stepId,
}: {
  children: ReactNode;
  stepId: string;
}) {
  return (
    <StepScopeContext.Provider value={stepId}>
      {children}
    </StepScopeContext.Provider>
  );
}

export function useStep() {
  const context = useContext(FlowContext);
  const stepId = useContext(StepScopeContext);
  if (!context || stepId === null) {
    throw new Error("A StepFlow step is required.");
  }

  const { setActiveStep, setStepSkipped } = context;
  const activate = useCallback(
    () => setActiveStep(stepId),
    [setActiveStep, stepId],
  );
  const setSkipped = useCallback(
    (skipped: boolean) => setStepSkipped(stepId, skipped),
    [setStepSkipped, stepId],
  );
  const stepIndex = context.stepIds.indexOf(stepId);

  return {
    activate,
    id: context.id,
    isActive: context.activeStep === stepId,
    isBeforeActiveStep:
      stepIndex !== -1 &&
      stepIndex < context.stepIds.indexOf(context.activeStep ?? ""),
    isFinalStep: context.isFinalStep,
    isFirstStep: context.isFirstStep,
    next: context.next,
    previous: context.previous,
    setSkipped,
  };
}
