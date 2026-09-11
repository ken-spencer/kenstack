"use client";

// Hosts embed Stripe payment fields in their checkout and verify fulfilment in onComplete.
import { useState } from "react";
import {
  loadStripe,
  type Appearance,
  type StripeExpressCheckoutElementConfirmEvent,
} from "@stripe/stripe-js";
import {
  CheckoutElementsProvider,
  ExpressCheckoutElement,
  PaymentElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import * as z from "zod";
import Form from "@kenstack/forms/Form";
import { useForm } from "@kenstack/forms/context";
import { StepActions } from "@kenstack/components/StepFlow/StepActions";
import Notice from "@kenstack/components/Notice";
import type { FetchResult } from "@kenstack/api/fetcher";

export default function Payment({
  clientSecret,
  publishableKey,
  appearance,
  onComplete,
}: {
  clientSecret: string;
  publishableKey: string;
  appearance?: Appearance;
  onComplete: (sessionId: string) => Promise<void>;
}) {
  const [stripe] = useState(() => loadStripe(publishableKey));
  return (
    <CheckoutElementsProvider
      stripe={stripe}
      options={{ clientSecret, elementsOptions: { appearance } }}
    >
      <PaymentForm onComplete={onComplete} />
    </CheckoutElementsProvider>
  );
}

function PaymentForm({
  onComplete,
}: {
  onComplete: (sessionId: string) => Promise<void>;
}) {
  const checkout = useCheckoutElements();
  if (checkout.type === "loading")
    return (
      <div className="min-h-72 animate-pulse" role="status">
        Loading secure payment options…
      </div>
    );
  if (checkout.type === "error")
    return (
      <Notice
        status="error"
        message="Payment options could not load. Refresh this page to try again."
      />
    );

  return (
    <Form
      schema={z.object({})}
      defaultValues={{}}
      mutationFn={async ({
        expressCheckoutConfirmEvent,
      }: {
        expressCheckoutConfirmEvent?: StripeExpressCheckoutElementConfirmEvent;
      }): Promise<FetchResult<{ sessionId: string }>> => {
        const result = await checkout.checkout.confirm({
          redirect: "if_required",
          expressCheckoutConfirmEvent,
        });
        if (result.type === "error")
          return { status: "error", message: result.error.message };
        await onComplete(result.session.id);
        return { status: "success", sessionId: result.session.id };
      }}
      onSubmit={({ mutation }) => mutation.mutate({})}
    >
      <PaymentControls />
    </Form>
  );
}

function PaymentControls() {
  const { mutation } = useForm<
    { sessionId: string },
    { expressCheckoutConfirmEvent?: StripeExpressCheckoutElementConfirmEvent },
    Record<string, never>
  >();
  return (
    <fieldset
      disabled={mutation.isPending}
      className="min-w-0 space-y-6 border-0 p-0"
    >
      <ExpressCheckoutElement
        onConfirm={(expressCheckoutConfirmEvent) => {
          if (!mutation.isPending)
            mutation.mutate({ expressCheckoutConfirmEvent });
        }}
      />
      <PaymentElement />
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
