"use client";

import type { StepHeaderProps } from "./types";
import { useStep } from "./context";

export default function StepHeading({
  headingId,
  summary,
  title,
}: StepHeaderProps) {
  const { isFinalStep, isFirstStep, previous } = useStep();

  return (
    <header>
      {summary ? <div className="summary">{summary}</div> : null}
      <div className="heading">
        {!isFinalStep && !isFirstStep ? (
          <button className="back" onClick={previous} type="button">
            Back
          </button>
        ) : null}
        <h2 id={headingId}>{title}</h2>
      </div>
    </header>
  );
}
