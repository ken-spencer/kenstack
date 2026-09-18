"use client";

// Account pages supply an authenticated SetupIntent endpoint; card details stay inside Stripe.
import { useState } from "react";
import { loadStripe, type Appearance } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import * as z from "zod";
import Form from "@kenstack/forms/Form";
import Submit from "@kenstack/forms/Submit";
import type { FetchResult } from "@kenstack/api/fetcher";

export default function CardSetup({
  publishableKey,
  currency,
  appearance,
  onSetup,
  onSaved,
}: {
  publishableKey: string;
  currency: string;
  appearance?: Appearance;
  onSetup: () => Promise<FetchResult<{ clientSecret: string | null }>>;
  onSaved: () => void;
}) {
  const [stripe] = useState(() => loadStripe(publishableKey));
  return (
    <Elements
      stripe={stripe}
      options={{
        mode: "setup",
        currency,
        paymentMethodTypes: ["card"],
        appearance,
      }}
    >
      <CardSetupForm onSetup={onSetup} onSaved={onSaved} />
    </Elements>
  );
}

function CardSetupForm({
  onSetup,
  onSaved,
}: Pick<Parameters<typeof CardSetup>[0], "onSetup" | "onSaved">) {
  const stripe = useStripe();
  const elements = useElements();
  return (
    <Form
      schema={z.object({})}
      defaultValues={{}}
      mutationFn={async (): Promise<FetchResult<{ saved: true }>> => {
        if (!stripe || !elements)
          return {
            status: "error",
            message: "Card options are still loading.",
          };
        const submitted = await elements.submit();
        if (submitted.error)
          return { status: "error", message: submitted.error.message };
        const setup = await onSetup();
        if (setup.status === "error") return setup;
        if (!setup.clientSecret)
          return {
            status: "error",
            message: "Unable to prepare your card. Please try again.",
          };
        const result = await stripe.confirmSetup({
          elements,
          clientSecret: setup.clientSecret,
          confirmParams: {
            return_url: window.location.href,
            payment_method_data: { allow_redisplay: "always" },
          },
          redirect: "if_required",
        });
        if (result.error)
          return { status: "error", message: result.error.message };
        if (result.setupIntent.status !== "succeeded")
          return {
            status: "error",
            message: "Your card setup has not completed. Please try again.",
          };
        return { status: "success", saved: true };
      }}
      onSubmit={({ mutation }) => mutation.mutate({})}
      onSuccess={onSaved}
    >
      <PaymentElement />
      <p className="mt-4 text-sm">
        Your card will be securely saved and available for future purchases.
      </p>
      <Submit className="mt-4" disabled={!stripe || !elements}>
        Save card
      </Submit>
    </Form>
  );
}
