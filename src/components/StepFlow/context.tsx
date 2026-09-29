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
import unsecureId from "@kenstack/lib/unsecureId";

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
  startedSkipped: Record<string, boolean | undefined>;
  stepIds: string[];
  visit: string | undefined;
};

const FlowContext = createContext<FlowContextValue | null>(null);

const StepScopeContext = createContext<string | null>(null);

const completedStepsSchema = z.record(z.string().min(1), z.literal(true));
// Recorded alongside completed steps when a result is reached; a fixed key,
// so a later visit finds it even when server state no longer composes the
// final step.
const finishedKey = "$finished";
// A visit's id and which steps the server composed as skipped when it started. A later server render,
// such as the refresh after a sign-in, must not change the visit's step list.
const visitSchema = z.object({
  id: z.string().min(1),
  startedSkipped: z.record(z.string().min(1), z.boolean()),
});

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
  const [savedVisit, setSavedVisit] = useStoredValue(
    basePath,
    "$visit",
    visitSchema,
  );
  const isFinished = completedSteps[finishedKey] === true;
  // Readable after hydration, and ignored while a finished flow waits to be cleared.
  const currentVisit = isHydrated && !isFinished ? savedVisit : undefined;
  const visit = currentVisit?.id;
  // Skip overrides belong to the visit they were set in, so a new visit starts without the previous
  // one's; controllers that set them recompute when the visit changes, without remounting.
  const [skipOverrides, setSkipOverrides] = useState<{
    skipped: Record<string, boolean>;
    visit: string | undefined;
  }>({ skipped: {}, visit: undefined });
  const skippedSteps =
    skipOverrides.visit === visit ? skipOverrides.skipped : {};
  // Next may keep a left instance alive and show it again on a later visit.
  // Hiding the instance returns it to the first step, so a visit never
  // resumes where an earlier one stopped.
  const firstStepRef = useRef(firstStep);
  useEffect(() => {
    firstStepRef.current = firstStep;
  }, [firstStep]);
  useEffect(() => () => setNavigatedStep(firstStepRef.current), []);
  const setStepSkipped = useCallback(
    (stepId: string, skipped: boolean) => {
      setSkipOverrides((current) => {
        const currentSkipped = current.visit === visit ? current.skipped : {};
        return current.visit === visit && currentSkipped[stepId] === skipped
          ? current
          : { skipped: { ...currentSkipped, [stepId]: skipped }, visit };
      });
    },
    [visit],
  );
  const configuredStepIds = Object.keys(steps);
  const serverSkipped = Object.fromEntries(
    configuredStepIds.map((stepId) => [stepId, steps[stepId].skipped]),
  );
  // The server's skipped values as this instance mounted, or as a new visit after a finished one
  // started. A step the visit started skipped that the server showed then comes back, such as the
  // sign-in step for a visitor who has signed out since; a later server render, the sign-in refresh
  // included, never changes the list.
  const [mountSkipped, setMountSkipped] = useState<{
    finishedVisit?: string;
    skipped: Record<string, boolean | undefined>;
  }>(() => ({ skipped: serverSkipped }));
  if (
    isFinished &&
    savedVisit !== undefined &&
    mountSkipped.finishedVisit !== savedVisit.id
  ) {
    setMountSkipped({ ...mountSkipped, finishedVisit: savedVisit.id });
  } else if (
    visit !== undefined &&
    mountSkipped.finishedVisit !== undefined &&
    mountSkipped.finishedVisit !== visit
  ) {
    setMountSkipped({ skipped: serverSkipped });
  }
  // Until the visit's saved list is readable, the server's values stand in; they are then the visit's
  // starting values.
  const startedSkipped: Record<string, boolean | undefined> = currentVisit
    ? Object.fromEntries(
        Object.entries(currentVisit.startedSkipped).filter(
          ([stepId, skipped]) =>
            !skipped || mountSkipped.skipped[stepId] === true,
        ),
      )
    : serverSkipped;
  const isSkipped = (stepId: string) =>
    skippedSteps[stepId] ?? startedSkipped[stepId];
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
  // Arriving at a result records it in the ledger. The next visit that finds
  // a result recorded clears the flow's stored values and starts afresh, so
  // no visit restores a finished transaction. A visit is a mount, an Activity
  // reveal, or a new server render (a link to the flow's own URL). A bfcache
  // restore is none of these, so a result stays on screen through browser
  // Back. A store that is finished or expired starts a new visit, which saves
  // the server's step list for it; one that expires while open does so at its
  // next render, before a later server render could replace those values.
  const startVisit = useEffectEvent(() => {
    if (isFinished) {
      clearStoredState(basePath);
    } else if (savedVisit !== undefined) {
      return;
    }

    setSavedVisit({
      id: unsecureId(),
      startedSkipped: Object.fromEntries(
        configuredStepIds.flatMap((stepId) => {
          const { skipped } = steps[stepId];
          return skipped === undefined ? [] : [[stepId, skipped]];
        }),
      ),
    });
  });
  const hasSavedVisit = savedVisit !== undefined;
  useEffect(() => {
    if (isHydrated) {
      startVisit();
    }
  }, [hasSavedVisit, isHydrated, visitKey]);
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
          if (activeStep !== requestedStep && isSkipped(activeStep) === false) {
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
        startedSkipped,
        stepIds,
        visit,
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
    // The skipped value this step started the visit with: the saved step list, less a skip the
    // server no longer showed when this instance mounted, or the server's until that is readable.
    startedSkipped: context.startedSkipped[stepId],
    visit: context.visit,
  };
}
