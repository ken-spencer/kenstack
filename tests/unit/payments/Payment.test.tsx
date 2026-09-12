/** @vitest-environment jsdom */

import { act, type PropsWithChildren } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PaymentElement } from "@stripe/react-stripe-js";

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: () => Promise.resolve(null),
}));
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: PropsWithChildren) => children,
  ExpressCheckoutElement: () => <div>Stripe wallet controls</div>,
  PaymentElement: vi.fn(() => <div>Stripe card form</div>),
  useStripe: () => null,
  useElements: () => null,
}));
vi.mock("@kenstack/components/StepFlow/StepActions", () => ({
  StepActions: () => <button type="submit">Pay now</button>,
}));

import Payment from "@kenstack/payments/Payment";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllEnvs();
});

it("shows inert development wallets without submitting the payment form or completing checkout", async () => {
  vi.stubEnv("NODE_ENV", "development");
  const onConfirm = vi.fn();
  const onComplete = vi.fn();
  const onSubmit = vi.fn();
  container.addEventListener("submit", onSubmit);
  await act(async () => {
    root.render(
      <Payment
        amountCents={2575}
        currency="cad"
        recurring={false}
        publishableKey="pk_test_fixture"
        onConfirm={onConfirm}
        onComplete={onComplete}
      />,
    );
  });

  for (const name of ["Apple Pay", "Google Pay"]) {
    const button = container.querySelector<HTMLButtonElement>(
      `button[aria-label="Pay with ${name}"]`,
    );
    expect(button).not.toBeNull();
    await act(async () => button?.click());
  }
  expect(onSubmit).not.toHaveBeenCalled();
  expect(onConfirm).not.toHaveBeenCalled();
  expect(onComplete).not.toHaveBeenCalled();
  expect(container.textContent).toContain("Stripe card form");
  expect(container.textContent).not.toContain("Stripe wallet controls");
  expect(
    vi.mocked(PaymentElement).mock.calls.at(-1)?.[0].options?.wallets,
  ).toMatchObject({
    applePay: "never",
    googlePay: "never",
  });
});

it("uses Stripe wallets in a production build with test credentials", async () => {
  vi.stubEnv("NODE_ENV", "production");
  await act(async () => {
    root.render(
      <Payment
        amountCents={2575}
        currency="cad"
        recurring={false}
        publishableKey="pk_test_fixture"
        onConfirm={vi.fn()}
        onComplete={vi.fn()}
      />,
    );
  });
  expect(container.textContent).toContain("Stripe wallet controls");
  expect(container.textContent).toContain("Stripe card form");
  expect(
    vi.mocked(PaymentElement).mock.calls.at(-1)?.[0].options?.wallets,
  ).toMatchObject({
    applePay: "auto",
    googlePay: "auto",
  });
  expect(
    container.querySelector('button[aria-label="Pay with Apple Pay"]'),
  ).toBeNull();
  expect(
    container.querySelector('button[aria-label="Pay with Google Pay"]'),
  ).toBeNull();
});
