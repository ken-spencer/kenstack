"use client";

import { Suspense, type ReactNode } from "react";
import { catchError, type ErrorInfo } from "next/error";

import Notice from "@kenstack/components/Notice";
import Button from "@kenstack/components/Button";

function ErrorFallback(
  { title }: { title: string },
  { error, retry }: ErrorInfo,
) {
  let message =
    "This part of the page stopped working in your browser. Try again or reload the page.";

  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string"
  ) {
    message = `There is an unexpected problem loading ${title}. Please check back later.`;
  }

  return (
    <Notice
      className="p-4"
      role="alert"
      message={message}
      action={
        <Button type="button" variant="outline" onClick={retry}>
          Try again
        </Button>
      }
    />
  );
}

const ErrorBoundary = catchError(ErrorFallback);

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
