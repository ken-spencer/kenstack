"use client";

// A product's completion page mounts CheckoutStatus with the session id Stripe returned.
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import fetcher from "@kenstack/api/fetcher";
import { useUserInfo } from "@kenstack/auth/useUserInfo";
import Button from "@kenstack/components/Button";
import { LinkButton } from "@kenstack/components/LinkButton";
import Notice from "@kenstack/components/Notice";
import QueryProvider from "@kenstack/context/QueryProvider";
import { clearStoredState, readStoredValue } from "@kenstack/hooks/storedState";

import type { CheckoutStatusResult } from "./server";
import Summary from "./Summary";
import { storedSchema } from "./stored";

const headings = {
  paid: "Payment complete",
  unresolved: "Payment is not confirmed",
  stopped: "Payment did not complete",
};

export default function CheckoutStatus(props: {
  apiPath: string;
  sessionId: string;
  // The flow's basePath; its stored state is cleared once the payment succeeded.
  storeId: string;
  checkoutHref: string;
  // Replaces the default heading once the payment succeeded.
  children?: ReactNode;
}) {
  return (
    <QueryProvider>
      <PaymentStatus {...props} />
    </QueryProvider>
  );
}

function PaymentStatus({
  apiPath,
  sessionId,
  storeId,
  checkoutHref,
  children,
}: Parameters<typeof CheckoutStatus>[0]) {
  const user = useUserInfo();
  const userId = user.state === "authenticated" ? user.userId : undefined;
  const result = useQuery({
    queryKey: ["checkout-status", apiPath, sessionId, userId],
    enabled: user.state !== "loading",
    retry: false,
    queryFn: async ({ signal }) => {
      const response = await fetcher<CheckoutStatusResult>(
        apiPath,
        { action: "status", sessionId },
        { signal },
      );
      if (response.status === "error")
        throw new Error(response.message ?? "Unable to check this payment.");
      if (
        !signal.aborted &&
        response.paymentStatus === "succeeded" &&
        userId !== undefined &&
        readStoredValue(storeId, `checkout:${userId}`, storedSchema)?.id ===
          response.sessionId
      )
        clearStoredState(storeId);
      return response;
    },
    refetchInterval: (query) =>
      query.state.data?.paymentStatus === "processing" ||
      query.state.data?.paymentStatus === "pending"
        ? 5000
        : false,
  });
  const payment = result.isError ? undefined : result.data;
  const status = !payment
    ? undefined
    : payment.paymentStatus === "succeeded"
      ? "paid"
      : payment.paymentStatus === "failed" ||
          payment.paymentStatus === "canceled"
        ? "stopped"
        : "unresolved";
  return (
    <div className="checkout-status">
      {/* Always mounted, and its text changes only with the state, so a poll that finds nothing
          new announces nothing. */}
      <p className={result.isPending ? undefined : "sr-only"} role="status">
        {status
          ? headings[status]
          : result.isPending
            ? "Checking payment…"
            : null}
      </p>
      {result.isError ? (
        <>
          <Notice role="alert" message={result.error.message} />
          <div className="actions">
            <Button onClick={() => result.refetch()} type="button">
              Try again
            </Button>
            <LinkButton href="/login">Sign in</LinkButton>
          </div>
        </>
      ) : null}
      {payment && status ? (
        <>
          {status === "paid" && children ? (
            children
          ) : (
            <h1>{headings[status]}</h1>
          )}
          {status === "unresolved" ? (
            <p>Check the payment status before making another payment.</p>
          ) : null}
          <Summary
            currency={payment.currency}
            dueNowLabel={status === "paid" ? "Amount paid" : undefined}
            quote={payment.quote}
          />
          {status === "paid" ? null : (
            <div className="actions">
              {status === "unresolved" ? (
                <Button onClick={() => result.refetch()} type="button">
                  Check again
                </Button>
              ) : null}
              <LinkButton href={checkoutHref}>Return to checkout</LinkButton>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
