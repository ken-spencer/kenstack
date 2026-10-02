"use client";

import {
  Activity,
  Suspense,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
} from "react";

import useIsHydrated from "@kenstack/hooks/useIsHydrated";

import type { Step, StepFlowProps } from "./types";
import {
  buildResumeScript,
  FlowProvider,
  StepScope,
  useFlowContext,
} from "./context";

export default function StepFlowClient({
  Actions,
  basePath,
  Header,
  id,
  summary,
  steps,
  visitKey,
}: Omit<StepFlowProps, "Actions" | "Header" | "id" | "steps"> & {
  Actions: NonNullable<StepFlowProps["Actions"]>;
  Header: NonNullable<StepFlowProps["Header"]>;
  id: NonNullable<StepFlowProps["id"]>;
  steps: Record<string, Step>;
  visitKey?: string;
}) {
  return (
    <FlowProvider
      Actions={Actions}
      basePath={basePath}
      id={id}
      steps={steps}
      visitKey={visitKey}
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
  const { basePath, id, shownStep } = useFlowContext();
  const isHydrated = useIsHydrated();
  const stepIds = Object.keys(steps);
  const headingId = useId();
  const regionRef = useRef<HTMLDivElement>(null);
  const mountedStepRef = useRef<string | undefined>(undefined);

  // The first hydrated render shows the tab's stored step, so the region the
  // resume script hid can show.
  useLayoutEffect(() => {
    if (isHydrated) {
      regionRef.current?.removeAttribute("data-resuming");
    }
  }, [isHydrated]);

  // Each step change moves focus to the new step's region, so assistive
  // technology announces it, and brings the top of the flow back into view
  // when the previous step left the viewport scrolled elsewhere. The step
  // settled by the ledger after hydration counts as the initial one.
  useEffect(() => {
    const region = regionRef.current;
    if (!region || !isHydrated || shownStep === undefined) {
      return;
    }

    if (mountedStepRef.current === undefined) {
      mountedStepRef.current = shownStep;
      return;
    }

    if (mountedStepRef.current === shownStep) {
      return;
    }

    mountedStepRef.current = shownStep;
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
  }, [shownStep, isHydrated]);

  return (
    <div
      aria-labelledby={headingId}
      className="step-flow scroll-mt-24 outline-none data-resuming:invisible"
      id={id}
      ref={regionRef}
      role="region"
      // The resume script marks the region before React hydrates it.
      suppressHydrationWarning
      tabIndex={-1}
    >
      {isHydrated ? null : (
        <script
          dangerouslySetInnerHTML={{
            __html: buildResumeScript(basePath, shownStep),
          }}
        />
      )}
      {/* Controllers mount once hydrated, so none acts in the hydration commit,
          before the flow has resumed the tab's step. */}
      {stepIds.map((stepId) =>
        steps[stepId].controller !== undefined && isHydrated ? (
          <StepScope key={stepId} stepId={stepId}>
            {steps[stepId].controller}
          </StepScope>
        ) : null,
      )}
      {shownStep === undefined ? (
        <p id={headingId} role="status">
          Loading…
        </p>
      ) : (
        <StepScope stepId={shownStep}>
          <Header
            headingId={headingId}
            summary={steps[shownStep].final ? undefined : summary}
            title={steps[shownStep].title}
          />
        </StepScope>
      )}
      {/* Activity preserves each step's local state while pausing its effects.
          Hidden content still reaches the browser and is not an authorization boundary. */}
      {stepIds.map((stepId) => (
        <Activity
          key={stepId}
          mode={stepId === shownStep ? "visible" : "hidden"}
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
