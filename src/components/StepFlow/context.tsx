"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import * as z from "zod";

import Notice from "@kenstack/components/Notice";
import {
  clearStoredState,
  getStorageKey,
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
  setLeavingStep: (stepId: string | undefined) => void;
  setStepSkipped: (stepId: string, skipped: boolean) => void;
  // The step on screen: the active one, unless it leaves the page (see useStepLeavesPage).
  shownStep: string | undefined;
  stepIds: string[];
};

const FlowContext = createContext<FlowContextValue | null>(null);

const StepScopeContext = createContext<string | null>(null);

const completedStepsKey = "$completedSteps";
const completedStepsSchema = z.record(z.string().min(1), z.literal(true));
// Recorded alongside completed steps when a result is reached; a fixed key,
// so a later visit finds it even when server state no longer composes the
// final step.
const finishedKey = "$finished";
const stepKey = "$step";
const stepSchema = z.string().min(1);

// StepFlow's stored slices change through useSyncExternalStore, which React renders at once. A plain
// state update made outside a React event, such as in a save's response, renders later, so a step
// change could show one without the other for a frame. The flow's own state changes the same way.
function useFlowState<T>() {
  const [store] = useState(() => {
    let value: T | undefined;
    const listeners = new Set<() => void>();
    return {
      get: () => value,
      set: (next: T | undefined) => {
        value = next;
        listeners.forEach((listener) => listener());
      },
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };
  });

  return [
    useSyncExternalStore(store.subscribe, store.get, store.get),
    store.set,
  ] as const;
}

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
    completedStepsKey,
    completedStepsSchema,
  );
  // The flow owns its step. The tab stores it beside the flow's values, so
  // every arrival in this tab, a reload included, resumes it once hydrated;
  // the URL never names it. If a server refresh omits the stored step, the
  // fresh first step stands in for it.
  const firstStep = Object.keys(steps)[0];
  const [savedStep, setSavedStep] = useStoredValue(
    basePath,
    stepKey,
    stepSchema,
  );
  // A result is shown only by the instance that reached it; an arrival at a
  // finished store starts at the first step.
  const [result, setResult] = useFlowState<string>();
  const [leavingStep, setLeavingStep] = useState<string>();
  // The step the visitor last completed with next(). When the flow then reaches a step that leaves
  // the page, it stays on screen meanwhile; with none, as for an emailed link or a signed-in
  // arrival, the leaving step shows.
  const [completedStep, setCompletedStep] = useFlowState<string>();
  const isFinished = completedSteps[finishedKey] === true;
  const navigatedStep =
    result ?? (isFinished ? undefined : savedStep) ?? firstStep;
  const [skippedSteps, setSkippedSteps] = useState<Record<string, boolean>>({});
  const setStepSkipped = useCallback((stepId: string, skipped: boolean) => {
    setSkippedSteps((current) =>
      current[stepId] === skipped ? current : { ...current, [stepId]: skipped },
    );
  }, []);
  const configuredStepIds = Object.keys(steps);
  // A step whose skipped value can change during a visit sets it live through its controller, and
  // that override stands over a later server render, such as the refresh after a sign-in.
  const isSkipped = (stepId: string) =>
    skippedSteps[stepId] ?? steps[stepId].skipped;
  const stepIds = configuredStepIds.filter((stepId) => !isSkipped(stepId));
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
      isSkipped(stepId) === false ||
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
  const shownStep =
    activeStep !== undefined &&
    activeStep === leavingStep &&
    completedStep !== undefined &&
    Object.hasOwn(steps, completedStep)
      ? completedStep
      : activeStep;
  // Arriving at a result records it in the ledger. The next arrival that
  // finds a result recorded clears the flow's stored values and starts
  // afresh, so no arrival restores a finished transaction. An arrival is a
  // mount, an Activity reveal, or a new server render (a link to the flow's
  // own URL). A bfcache restore is none of these, so a result stays on screen
  // through browser Back.
  const clearFinishedStore = useEffectEvent(() => {
    if (isFinished) {
      clearStoredState(basePath);
    }
  });
  useEffect(() => {
    if (isHydrated) {
      clearFinishedStore();
    }
    // Hiding a kept instance drops its result, so it is not shown again.
    return () => setResult(undefined);
  }, [isHydrated, setResult, visitKey]);
  const setActiveStep = useCallback(
    (stepId: string) => {
      const requestedIndex = stepIds.indexOf(stepId);

      if (requestedIndex !== -1) {
        setSavedStep(stepIds[Math.min(requestedIndex, lastReachableStepIndex)]);
      }
    },
    [lastReachableStepIndex, setSavedStep, stepIds],
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
          if (activeStep !== requestedStep && isSkipped(activeStep) === false) {
            return;
          }
          const nextStepId = stepIds[activeStepIndex + 1];
          if (nextStepId === undefined) {
            return;
          }
          if (
            !setCompletedSteps((current) => ({
              ...current,
              [activeStep]: true,
              ...(steps[nextStepId].final ? { [finishedKey]: true } : {}),
            }))
          ) {
            return;
          }
          setCompletedStep(activeStep);
          if (steps[nextStepId].final) {
            setResult(nextStepId);
          } else {
            setSavedStep(nextStepId);
          }
        },
        previous: () => {
          const previousStepId = stepIds[activeStepIndex - 1];
          if (previousStepId !== undefined) {
            setSavedStep(previousStepId);
          }
        },
        setActiveStep,
        setLeavingStep,
        setStepSkipped,
        shownStep,
        stepIds,
      }}
    >
      {children}
    </FlowContext.Provider>
  );
}

// Before hydration the server's step shows, and the tab's stored step replaces
// it once hydrated. Run by the parser at the top of the flow's region, this
// script hides the region when the tab stored another step of an unfinished
// flow, until StepFlow has shown it, or for a second if hydration never comes.
export function buildResumeScript(
  basePath: string,
  shownStep: string | undefined,
) {
  const [step, completedSteps, finished, shown] = [
    getStorageKey(basePath, stepKey),
    getStorageKey(basePath, completedStepsKey),
    finishedKey,
    shownStep ?? null,
  ].map((value) => JSON.stringify(value).replaceAll("<", "\\u003c"));

  return `{const flow=document.currentScript.parentElement;try{const read=(key)=>JSON.parse(sessionStorage.getItem(key))?.value;const step=read(${step});if(step!==undefined&&step!==${shown}&&read(${completedSteps})?.[${finished}]!==true){flow.setAttribute("data-resuming","");setTimeout(()=>flow.removeAttribute("data-resuming"),1000)}}catch{}}`;
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

// Kenstack's login return step only: while its controller says so, reaching the step leaves the
// page, and the flow keeps the step before it on screen meanwhile.
export function useStepLeavesPage(isLeaving: boolean) {
  const { setLeavingStep } = useFlowContext();
  const stepId = useContext(StepScopeContext);

  useLayoutEffect(() => {
    if (!isLeaving || stepId === null) {
      return;
    }
    setLeavingStep(stepId);
    return () => setLeavingStep(undefined);
  }, [isLeaving, setLeavingStep, stepId]);
}

// The default actions stay pending while their step, completed, stays on screen as the page leaves.
export function useIsStepHeld() {
  const { activeStep, shownStep } = useFlowContext();
  const stepId = useContext(StepScopeContext);
  return stepId !== null && shownStep === stepId && activeStep !== stepId;
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
