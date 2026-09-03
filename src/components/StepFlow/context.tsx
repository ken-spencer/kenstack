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
  activeStep: string;
  basePath: string;
  id: string;
  isFinalStep: boolean;
  isFirstStep: boolean;
  next: () => void;
  previous: () => void;
  setActiveStep: (stepId: string) => void;
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
  // URL only mirrors it. A server refresh can drop the step the flow navigated
  // to (a sign-in removes its own step), and then the route's fresh resolution
  // stands in for it.
  const [navigatedStep, setNavigatedStep] = useState(routeStep);
  const requestedStep = Object.hasOwn(steps, navigatedStep)
    ? navigatedStep
    : routeStep;
  const stepIds = Object.keys(steps);
  const firstIncompleteStepIndex = stepIds.findIndex(
    (stepId) => completedSteps[stepId] !== true,
  );
  const lastReachableStepIndex =
    firstIncompleteStepIndex === -1
      ? stepIds.length - 1
      : firstIncompleteStepIndex;
  // Until hydration the ledger is unreadable, so the requested step stands;
  // the ledger then decides whether it stays. A final step is always
  // reachable: it only reports a result and clears the flow.
  const activeStep =
    !isHydrated || steps[requestedStep].final
      ? requestedStep
      : stepIds[
          Math.min(
            Math.max(0, stepIds.indexOf(requestedStep)),
            lastReachableStepIndex,
          )
        ];
  const activeStepIndex = stepIds.indexOf(activeStep);
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
    if (!steps[activeStep].final) {
      return;
    }

    clearStoredState(basePath);
  }, [activeStep, basePath, steps]);

  // The URL follows the settled step: the base path gains its segment, and a
  // requested step the ledger refused is replaced by the one presented.
  useEffect(() => {
    if (!isHydrated || !isStorageAvailable) {
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
  if (!isStorageAvailable && !steps[activeStep].final) {
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
        isFinalStep: steps[activeStep].final === true,
        isFirstStep: activeStepIndex === 0,
        next: () => {
          const nextStepId = stepIds[activeStepIndex + 1];
          if (nextStepId !== undefined) {
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
          }
        },
        previous: () => {
          const previousStepId = stepIds[activeStepIndex - 1];
          if (previousStepId !== undefined) {
            setRouteStep(previousStepId);
          }
        },
        setActiveStep,
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
  const setActiveStep = context?.setActiveStep;
  const activate = useCallback(() => {
    if (stepId !== null) {
      setActiveStep?.(stepId);
    }
  }, [setActiveStep, stepId]);
  if (!context || stepId === null) {
    throw new Error("A StepFlow step is required.");
  }

  return {
    activate,
    id: context.id,
    isActive: context.activeStep === stepId,
    isFinalStep: context.isFinalStep,
    isFirstStep: context.isFirstStep,
    next: context.next,
    previous: context.previous,
  };
}
