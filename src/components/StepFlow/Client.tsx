"use client";

import { Activity, Suspense, useEffect, useId, useRef } from "react";

import useIsHydrated from "@kenstack/hooks/useIsHydrated";

import type { Step, StepFlowProps } from "./types";
import { FlowProvider, StepScope, useFlowContext } from "./context";

export default function StepFlowClient({
  Actions,
  basePath,
  Header,
  id,
  routeStep,
  summary,
  steps,
}: Omit<StepFlowProps, "Actions" | "Header" | "id" | "params" | "steps"> & {
  Actions: NonNullable<StepFlowProps["Actions"]>;
  Header: NonNullable<StepFlowProps["Header"]>;
  id: NonNullable<StepFlowProps["id"]>;
  routeStep: string;
  steps: Record<string, Step>;
}) {
  return (
    <FlowProvider
      Actions={Actions}
      basePath={basePath}
      id={id}
      routeStep={routeStep}
      steps={steps}
    >
      <StepFlowContent Header={Header} steps={steps} summary={summary} />
    </FlowProvider>
  );
}

function StepFlowContent({
  Header,
  steps,
  summary,
}: Pick<StepFlowProps, "summary"> & {
  Header: NonNullable<StepFlowProps["Header"]>;
  steps: Record<string, Step>;
}) {
  const { activeStep, id, isFinalStep } = useFlowContext();
  const isHydrated = useIsHydrated();
  const stepIds = Object.keys(steps);
  const headingId = useId();
  const regionRef = useRef<HTMLDivElement>(null);
  const mountedStepRef = useRef<string | undefined>(undefined);

  // Each step change moves focus to the new step's region, so assistive
  // technology announces it, and brings the top of the flow back into view
  // when the previous step left the viewport scrolled elsewhere. The step
  // settled by the ledger after hydration counts as the initial one.
  useEffect(() => {
    const region = regionRef.current;
    if (!region || !isHydrated) {
      return;
    }

    if (mountedStepRef.current === undefined) {
      mountedStepRef.current = activeStep;
      return;
    }

    if (mountedStepRef.current === activeStep) {
      return;
    }

    mountedStepRef.current = activeStep;
    const rect = region.getBoundingClientRect();
    const scrollMarginTop =
      Number.parseFloat(window.getComputedStyle(region).scrollMarginTop) || 0;

    region.focus({ preventScroll: true });

    if (rect.top < scrollMarginTop || rect.top > window.innerHeight / 2) {
      region.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    }
  }, [activeStep, isHydrated]);

  return (
    <div
      aria-labelledby={headingId}
      className="step-flow scroll-mt-24 outline-none"
      id={id}
      ref={regionRef}
      role="region"
      tabIndex={-1}
    >
      {stepIds.map((stepId) =>
        steps[stepId].controller !== undefined ? (
          <StepScope key={stepId} stepId={stepId}>
            {steps[stepId].controller}
          </StepScope>
        ) : null,
      )}
      <StepScope stepId={activeStep}>
        <Header
          headingId={headingId}
          summary={isFinalStep ? undefined : summary}
          title={steps[activeStep].title}
        />
      </StepScope>
      {/* Activity preserves each step's local state while pausing its effects.
          Hidden content still reaches the browser and is not an authorization boundary. */}
      {stepIds.map((stepId) => (
        <Activity
          key={stepId}
          mode={stepId === activeStep ? "visible" : "hidden"}
        >
          <StepScope stepId={stepId}>
            <Suspense
              fallback={
                <div
                  aria-busy="true"
                  className="h-40 animate-pulse bg-current/10 motion-reduce:animate-none"
                  role="status"
                >
                  <p className="sr-only">Loading this step</p>
                </div>
              }
            >
              {steps[stepId].content}
            </Suspense>
          </StepScope>
        </Activity>
      ))}
    </div>
  );
}
