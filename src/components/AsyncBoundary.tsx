"use client";

import { Suspense, type ReactNode } from "react";
import { unstable_catchError, type ErrorInfo } from "next/error";

import Alert from "@kenstack/components/Alert";
import Button from "@kenstack/components/Button";

function ErrorFallback(
  { title }: { title: string },
  { error, unstable_retry }: ErrorInfo,
) {
  let message =
    "This part of the page stopped working in your browser. Try again or reload the page.";

  if ("digest" in error && typeof error.digest === "string") {
    message = `There is an unexpected problem loading ${title}. Please check back later.`;
  }

  return (
    <Alert className="flex-wrap p-4" role="alert">
      <div className="flex grow flex-wrap items-center justify-between gap-3">
        <p>{message}</p>
        <Button type="button" variant="outline" onClick={unstable_retry}>
          Try again
        </Button>
      </div>
    </Alert>
  );
}

const ErrorBoundary = unstable_catchError(ErrorFallback);

export function AsyncBoundary({
  children,
  fallback,
  title,
}: {
  children: ReactNode;
  fallback: ReactNode;
  title: string;
}) {
  return (
    <ErrorBoundary title={title}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </ErrorBoundary>
  );
}
