"use client";

// A host pay step mounts Checkout inside its StepFlow with one product's endpoint. The summary,
// currency and return path all come from that endpoint's `session` answer.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useIsMutating, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { Appearance } from "@stripe/stripe-js";

import fetcher from "@kenstack/api/fetcher";
import { useUserInfo } from "@kenstack/auth/useUserInfo";
import Button from "@kenstack/components/Button";
import Notice from "@kenstack/components/Notice";
import { useFlowContext, useStep } from "@kenstack/components/StepFlow/context";
import QueryProvider from "@kenstack/context/QueryProvider";
import { useStoredValue } from "@kenstack/hooks/storedState";
import useIsHydrated from "@kenstack/hooks/useIsHydrated";
import unsecureId from "@kenstack/lib/unsecureId";

import Payment from "../Payment";
import type {
  CheckoutDropResult,
  CheckoutPayResult,
  CheckoutSessionResult,
} from "./server";
import Summary from "./Summary";
import { storedSchema } from "./stored";

function isStopped(payment: CheckoutPayResult) {
  return (
    payment.paymentStatus === "failed" || payment.paymentStatus === "canceled"
  );
}

export default function Checkout(props: {
  apiPath: string;
  // The body of the product's schema: order choices only, never account details.
  choices: Record<string, unknown>;
  appearance?: Appearance;
  // Requested for host content on the pay page, such as an upsell. Rendered inside the summary,
  // after the lines and taxes and before the amount due.
  children?: ReactNode;
  onActivity?: () => void;
  onPaymentStarted?: (started: boolean) => void;
}) {
  const user = useUserInfo();
  return user.state === "authenticated" ? (
    <QueryProvider>
      <CheckoutSession key={user.userId} userId={user.userId} {...props} />
    </QueryProvider>
  ) : null;
}

function CheckoutSession({
  apiPath,
  choices,
  appearance,
  children,
  onActivity,
  onPaymentStarted,
  userId,
}: Parameters<typeof Checkout>[0] & { userId: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { basePath } = useFlowContext();
  const { isActive } = useStep();
  const isHydrated = useIsHydrated();
  const [stored, setStored] = useStoredValue(
    basePath,
    `checkout:${userId}`,
    storedSchema,
  );
  const [notice, setNotice] = useState<string>();
  // Every `session` answer mints a new customer session secret; the card form keeps the first.
  const [
    firstCustomerSessionClientSecret,
    setFirstCustomerSessionClientSecret,
  ] = useState<string>();
  const payRequest = useRef<Promise<unknown>>(undefined);
  const noticeRef = useRef<HTMLDivElement>(null);
  const choicesKey = JSON.stringify(choices);
  const queryKey = ["checkout", apiPath, userId, choicesKey];
  const session = useQuery({
    queryKey,
    enabled: isHydrated && isActive,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    // A refocus after a bank window must not refetch in the middle of Pay.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // A run superseded by a choices change must not store its id over the current run's.
    queryFn: async ({ signal }) => {
      // A drop must never overtake this page's own Pay request.
      await payRequest.current;
      let id = stored?.id;
      if (stored && stored.choicesKey !== choicesKey) {
        const dropped = await fetcher<CheckoutDropResult>(
          apiPath,
          { action: "drop", id: stored.id },
          { signal },
        );
        if (dropped.status === "error")
          throw new Error(dropped.message ?? "Unable to prepare payment.");
        if (dropped.outcome !== "dropped") {
          router.replace(`${dropped.returnPath}?session_id=${stored.id}`);
          return null;
        }
        id = undefined;
      }
      // Minted when the step opens and shared with the customer's other tabs, so Pay pressed in two
      // tabs submits one order.
      if (!id) {
        id = unsecureId();
        if (!signal.aborted) setStored({ id, choicesKey });
      }
      const result = await fetcher<CheckoutSessionResult>(
        apiPath,
        { action: "session", id, choices },
        { signal },
      );
      if (result.status === "error")
        throw new Error(result.message ?? "Unable to prepare payment.");
      if (result.retired && !signal.aborted)
        setStored({ id: unsecureId(), choicesKey });
      setFirstCustomerSessionClientSecret(
        (current) => current ?? result.customerSessionClientSecret,
      );
      onPaymentStarted?.(Boolean(result.payment));
      if (
        result.payment?.paymentStatus === "succeeded" ||
        result.payment?.paymentStatus === "processing"
      ) {
        router.replace(
          `${result.returnPath}?session_id=${result.payment.sessionId}`,
        );
        return null;
      }
      return result;
    },
  });

  // Only while Pay runs, bank verification included: the rest of the flow is restored on return.
  const isPaying = useIsMutating() > 0;
  useEffect(() => {
    if (!isPaying) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [isPaying]);

  // Focus moves once the refreshed list is on screen.
  useEffect(() => {
    if (notice && !session.isFetching) noticeRef.current?.focus();
  }, [notice, session.isFetching]);

  if (session.isPending)
    return (
      <div className="checkout">
        <p className="min-h-72" role="status">
          Preparing secure payment…
        </p>
      </div>
    );
  // Only a failed first load lands here. A failed refresh keeps the summary and card form, and Pay
  // reports it through the form.
  if (session.isLoadingError)
    return (
      <div className="checkout">
        <Notice role="alert" message={session.error.message} />
        <Button onClick={() => session.refetch()} type="button">
          Try again
        </Button>
      </div>
    );
  const data = session.data;
  if (!data)
    return (
      <div className="checkout">
        <p className="min-h-72" role="status">
          Checking payment…
        </p>
      </div>
    );
  const { quote, currency, returnPath } = data;
  return (
    <div className="checkout">
      {notice ? (
        <Notice
          className="notice"
          message={notice}
          ref={noticeRef}
          role="alert"
          tabIndex={-1}
        />
      ) : null}
      <Summary
        currency={currency}
        isRefreshing={session.isFetching}
        quote={quote}
      >
        {children}
      </Summary>
      <div className="payment">
        <Payment
          amountCents={quote.dueNowCents}
          appearance={appearance}
          currency={currency}
          customerSessionClientSecret={
            firstCustomerSessionClientSecret ?? data.customerSessionClientSecret
          }
          publishableKey={data.publishableKey}
          recurring={quote.schedule.type !== "once"}
          onActivity={onActivity}
          onConfirm={async (confirmationTokenId) => {
            setNotice(undefined);
            // Another tab chose something else for this flow.
            if (stored && stored.choicesKey !== choicesKey) {
              const refreshed = await session.refetch();
              return refreshed.isError
                ? { status: "error", message: refreshed.error.message }
                : { status: "error" };
            }
            let current = data;
            // A browser error proves nothing: only the server's outcome permits another charge.
            if (current.payment && !isStopped(current.payment)) {
              const refreshed = await session.refetch();
              if (refreshed.isError)
                return { status: "error", message: refreshed.error.message };
              // The refresh found it paid and is already leaving for the status page.
              if (!refreshed.data) return { status: "error" };
              current = refreshed.data;
              // A `pending` attempt was never confirmed (an interrupted Pay); this Pay confirms
              // it under the same id, so it is not a second charge.
              if (
                current.payment &&
                current.payment.paymentStatus !== "pending" &&
                !isStopped(current.payment)
              )
                return { status: "success", ...current.payment };
            }
            // Without a saved id a reload during Pay could not recover this payment.
            if (!stored) return { status: "error" };
            const { id } = stored;
            const request = fetcher<CheckoutPayResult>(apiPath, {
              action: "pay",
              id,
              choices,
              fingerprint: current.quote.fingerprint,
              confirmationTokenId,
              previousTransactionId:
                current.payment && isStopped(current.payment)
                  ? current.payment.transactionId
                  : undefined,
            });
            payRequest.current = request.catch(() => undefined);
            const result = await request;
            if (result.status === "error") {
              if (
                result.code !== "checkout_lines_changed" &&
                result.code !== "checkout_expired"
              )
                return result;
              // An expired id is kept for this refresh: `session` retires it, or reports the
              // payment when the cancelled order was in fact paid.
              setNotice(result.message);
              await session.refetch();
              return { status: "error" };
            }
            queryClient.setQueryData<typeof session.data>(
              queryKey,
              (cached) => cached && { ...cached, payment: result },
            );
            onPaymentStarted?.(true);
            return isStopped(result)
              ? {
                  status: "error",
                  message:
                    "This payment did not complete. Check your payment details and try again.",
                }
              : result;
          }}
          onComplete={async (sessionId) => {
            router.replace(`${returnPath}?session_id=${sessionId}`);
            queryClient.setQueryData(queryKey, null);
          }}
        />
      </div>
    </div>
  );
}
