"use client";

// Hosts supply a server quote and confirm tokens after persisting their Pay transition.
import { useState } from "react";
import { loadStripe, type Appearance } from "@stripe/stripe-js";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import * as z from "zod";
import Form from "@kenstack/forms/Form";
import { useForm } from "@kenstack/forms/context";
import { StepActions } from "@kenstack/components/StepFlow/StepActions";
import type { FetchResult } from "@kenstack/api/fetcher";
import { ApplePayMark, GooglePayMark } from "./WalletMarks";

export default function Payment({
  amountCents,
  currency,
  recurring,
  publishableKey,
  appearance,
  enableLink = false,
  onConfirm,
  onComplete,
}: {
  amountCents: number;
  currency: string;
  recurring: boolean;
  publishableKey: string;
  appearance?: Appearance;
  // Requested for enabling Link checkout later without changing the payment flow.
  enableLink?: boolean;
  onConfirm: (confirmationTokenId: string) => Promise<
    FetchResult<{
      sessionId: string;
      paymentStatus: string;
      clientSecret: string | null;
    }>
  >;
  onComplete: (sessionId: string) => Promise<void>;
}) {
  const [stripe] = useState(() => loadStripe(publishableKey));
  return (
    <Elements
      stripe={stripe}
      options={{
        mode: recurring ? "subscription" : "payment",
        amount: amountCents,
        currency,
        paymentMethodCreation: "manual",
        paymentMethodTypes: ["card"],
        appearance,
      }}
    >
      <PaymentForm
        appearance={appearance}
        enableLink={enableLink}
        onConfirm={onConfirm}
        onComplete={onComplete}
      />
    </Elements>
  );
}

function PaymentForm({
  appearance,
  enableLink,
  onConfirm,
  onComplete,
}: Pick<
  Parameters<typeof Payment>[0],
  "appearance" | "enableLink" | "onConfirm" | "onComplete"
>) {
  const stripe = useStripe();
  const elements = useElements();
  return (
    <Form
      schema={z.object({})}
      defaultValues={{}}
      mutationFn={async (): Promise<FetchResult<{ sessionId: string }>> => {
        if (!stripe || !elements)
          return {
            status: "error",
            message: "Payment options are still loading.",
          };
        const submitted = await elements.submit();
        if (submitted.error)
          return { status: "error", message: submitted.error.message };
        const token = await stripe.createConfirmationToken({ elements });
        if (token.error)
          return { status: "error", message: token.error.message };
        const result = await onConfirm(token.confirmationToken.id);
        if (result.status === "error") return result;
        if (result.paymentStatus === "requires_action" && result.clientSecret) {
          const action = await stripe.handleNextAction({
            clientSecret: result.clientSecret,
          });
          if (action.error)
            return { status: "error", message: action.error.message };
        }
        await onComplete(result.sessionId);
        return { status: "success", sessionId: result.sessionId };
      }}
      onSubmit={({ mutation }) => mutation.mutate({})}
    >
      <PaymentControls appearance={appearance} enableLink={enableLink} />
    </Form>
  );
}

function PaymentControls({
  appearance,
  enableLink,
}: Pick<Parameters<typeof Payment>[0], "appearance" | "enableLink">) {
  const { mutation } = useForm<
    { sessionId: string },
    Record<string, never>,
    Record<string, never>
  >();
  return (
    <fieldset
      disabled={mutation.isPending}
      className="min-w-0 space-y-6 border-0 p-0"
    >
      {process.env.NODE_ENV === "development" ? (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
          }}
        >
          {["apple", "google"].map((wallet) => (
            <button
              key={wallet}
              aria-label={`Pay with ${wallet === "apple" ? "Apple Pay" : "Google Pay"}`}
              className="flex h-11 min-w-0 items-center justify-center border-0 bg-white px-3 text-black hover:bg-[#f2f2f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a84ff] disabled:cursor-wait disabled:opacity-50"
              style={{
                borderRadius: appearance?.variables?.borderRadius ?? "6px",
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
              }}
              disabled={mutation.isPending}
              type="button"
            >
              {wallet === "apple" ? (
                <ApplePayMark />
              ) : (
                <GooglePayMark color="currentColor" />
              )}
            </button>
          ))}
        </div>
      ) : (
        <ExpressCheckoutElement
          options={{
            buttonHeight: 44,
            buttonTheme: { applePay: "white", googlePay: "white" },
            buttonType: { applePay: "plain", googlePay: "plain" },
            layout: { maxColumns: 2, overflow: "never" },
            paymentMethodOrder: ["apple_pay", "google_pay", "link"],
            paymentMethods: { link: enableLink ? "auto" : "never" },
          }}
          onConfirm={() => {
            if (!mutation.isPending) mutation.mutate({});
          }}
        />
      )}
      <PaymentElement
        options={{
          wallets: {
            applePay: process.env.NODE_ENV === "development" ? "never" : "auto",
            googlePay:
              process.env.NODE_ENV === "development" ? "never" : "auto",
            link: enableLink ? "auto" : "never",
          },
        }}
      />
      <StepActions
        next={{
          label: "Pay now",
          isPending: mutation.isPending,
          type: "submit",
        }}
      />
    </fieldset>
  );
}
