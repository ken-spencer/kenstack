"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
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
// Recorded alongside completed steps when a result is reached; a fixed key,
// so a later visit finds it even when server state no longer composes the
// final step.
const finishedKey = "$finished";

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
  steps,
  visitKey,
}: {
  Actions: NonNullable<StepFlowProps["Actions"]>;
  basePath: string;
  children: ReactNode;
  id: string;
  steps: Record<string, Step>;
  visitKey?: string;
}) {
  const isHydrated = useIsHydrated();
  const isStorageAvailable = useStorageAvailability();
  const [completedSteps = {}, setCompletedSteps] = useStoredValue(
    basePath,
    "$completedSteps",
    completedStepsSchema,
  );
  // The flow owns its step, seeded from the first step the server composed;
  // later steps live here and never touch the URL. If a server refresh omits
  // the step the flow navigated to, the fresh first step stands in for it.
  const firstStep = Object.keys(steps)[0];
  const [navigatedStep, setNavigatedStep] = useState(firstStep);
  const [skippedSteps, setSkippedSteps] = useState<Record<string, boolean>>({});
  // Next may keep a left instance alive and show it again on a later visit.
  // Hiding the instance returns it to the first step, so a visit never
  // resumes where an earlier one stopped.
  const firstStepRef = useRef(firstStep);
  useEffect(() => {
    firstStepRef.current = firstStep;
  }, [firstStep]);
  useEffect(() => () => setNavigatedStep(firstStepRef.current), []);
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
    : firstStep;
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
  // readable after hydration.
  const activeStep =
    requestedStep === undefined
      ? undefined
      : stepIds[
          Math.min(stepIds.indexOf(requestedStep), lastReachableStepIndex)
        ];
  const activeStepIndex =
    activeStep === undefined ? -1 : stepIds.indexOf(activeStep);
  // Arriving at a result records it in the ledger. The next visit that finds
  // a result recorded clears the flow's stored values and starts afresh, so
  // no visit restores a finished transaction. A visit is a mount, an Activity
  // reveal, or a new server render (a link to the flow's own URL). A bfcache
  // restore is none of these, so a result stays on screen through browser
  // Back.
  const clearFinishedFlow = useEffectEvent(() => {
    if (completedSteps[finishedKey] === true) {
      clearStoredState(basePath);
    }
  });
  useEffect(() => {
    if (isHydrated) {
      clearFinishedFlow();
    }
  }, [isHydrated, visitKey]);
  const setActiveStep = useCallback(
    (stepId: string) => {
      const requestedIndex = stepIds.indexOf(stepId);

      if (requestedIndex !== -1) {
        setNavigatedStep(
          stepIds[Math.min(requestedIndex, lastReachableStepIndex)],
        );
      }
    },
    [lastReachableStepIndex, stepIds],
  );

  if (!isStorageAvailable) {
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
          // A recalled prerequisite releases the existing destination when its
          // controller skips it again; it does not complete a ledger step.
          if (
            activeStep !== requestedStep &&
            (skippedSteps[activeStep] ?? steps[activeStep].skipped) === false
          ) {
            return;
          }
          const nextStepId = stepIds[activeStepIndex + 1];
          if (nextStepId === undefined) {
            return;
          }
          // The ledger is read back at write time so an expired flow
          // cleared by this write cannot resurrect the old ledger.
          if (
            !setCompletedSteps((current) => ({
              ...current,
              [activeStep]: true,
              ...(steps[nextStepId].final ? { [finishedKey]: true } : {}),
            }))
          ) {
            return;
          }
          setNavigatedStep(nextStepId);
        },
        previous: () => {
          const previousStepId = stepIds[activeStepIndex - 1];
          if (previousStepId !== undefined) {
            setNavigatedStep(previousStepId);
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
