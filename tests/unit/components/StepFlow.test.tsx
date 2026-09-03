/** @vitest-environment jsdom */

import {
  act,
  type ComponentProps,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { useFormContext } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as z from "zod";

vi.mock("server-only", () => ({}));

import StepFlow, {
  type StepActionsProps,
  type StepHeaderProps,
} from "@kenstack/components/StepFlow";
import { StepActions } from "@kenstack/components/StepFlow/StepActions";
import { useFlowContext, useStep } from "@kenstack/components/StepFlow/context";
import DefaultActions from "@kenstack/components/StepFlow/Actions";
import StepFlowClientImplementation from "@kenstack/components/StepFlow/Client";
import StepHeading from "@kenstack/components/StepFlow/Heading";
import { clearStoredState, useStoredValue } from "@kenstack/hooks/storedState";
import { FormProvider } from "@kenstack/forms/context";

type Steps = Parameters<typeof StepFlow>[0]["steps"];
const storedBooleanSchema = z.boolean();
const storedCountSchema = z.number();

// Mirrors the server entry's route resolution so fixtures can preset the URL.
function StepFlowClient({
  Actions = DefaultActions,
  Header = StepHeading,
  id = "steps",
  routeStep,
  ...props
}: Omit<
  ComponentProps<typeof StepFlowClientImplementation>,
  "Actions" | "Header" | "id" | "routeStep"
> & {
  Actions?: ComponentProps<typeof StepFlowClientImplementation>["Actions"];
  Header?: ComponentProps<typeof StepFlowClientImplementation>["Header"];
  id?: ComponentProps<typeof StepFlowClientImplementation>["id"];
  routeStep?: string;
}) {
  const stepIds = Object.keys(props.steps);
  const pathStep = window.location.pathname.startsWith(`${props.basePath}/`)
    ? decodeURIComponent(
        window.location.pathname.slice(props.basePath.length + 1),
      )
    : undefined;

  return (
    <StepFlowClientImplementation
      {...props}
      Actions={Actions}
      Header={Header}
      id={id}
      routeStep={
        routeStep ??
        (pathStep !== undefined && stepIds.includes(pathStep)
          ? pathStep
          : stepIds[0])
      }
    />
  );
}

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("Not found");
  },
}));

describe("StepFlow", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    window.localStorage.clear();
    window.history.replaceState(null, "", "/flow");
    container = document.createElement("div");
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("rejects an unknown server-requested step", async () => {
    await expect(
      StepFlow({
        basePath: "/flow",
        params: Promise.resolve({ step: "missing" }),
        steps: { first: { content: null, title: "First" } },
      }),
    ).rejects.toThrow("Not found");
  });

  it("continues past configured steps omitted by refreshed server state", async () => {
    window.localStorage.setItem(
      "stored-state:%2Fflow:$completedSteps",
      JSON.stringify({ value: { first: true } }),
    );
    window.localStorage.setItem(
      "stored-state:%2Fflow:$expiresAt",
      String(Date.now() + 60_000),
    );
    window.history.replaceState(null, "", "/flow/account?plan=standard");
    const flow = await StepFlow({
      basePath: "/flow",
      params: Promise.resolve({ step: "account" }),
      steps: {
        first: { content: <p>Choose</p>, title: "First" },
        signin: null,
        account: null,
        payment: { content: <p>Pay now</p>, title: "Payment" },
      },
    });

    await act(async () => root.render(flow));

    expect(container.querySelector("h2")?.textContent).toBe("Payment");
    expect(window.location.pathname).toBe("/flow/payment");
    expect(window.location.search).toBe("?plan=standard");
  });

  it("follows the route's resolution when a refresh drops the navigated step", () => {
    const steps = {
      first: { content: <NextStep name="First" />, title: "First" },
      signin: { content: <NextStep name="Sign in" />, title: "Sign in" },
      payment: { content: <p>Pay now</p>, title: "Payment" },
    } satisfies Steps;

    act(() => root.render(<StepFlowClient basePath="/flow" steps={steps} />));
    act(() => getButton(container, "Next from First").click());
    expect(container.querySelector("h2")?.textContent).toBe("Sign in");

    // A server refresh after signing in omits the sign-in step and resolves
    // the route to the step that follows it.
    act(() =>
      root.render(
        <StepFlowClient
          basePath="/flow"
          routeStep="payment"
          steps={{ first: steps.first, payment: steps.payment }}
        />,
      ),
    );

    expect(container.querySelector("h2")?.textContent).toBe("Payment");
    expect(window.location.pathname).toBe("/flow/payment");
  });

  it("rejects an empty step registry", async () => {
    await expect(StepFlow({ basePath: "/flow", steps: {} })).rejects.toThrow(
      "StepFlow requires at least one step.",
    );
  });

  it("omits Back on the first step", () => {
    act(() => {
      root.render(
        <StepFlowClient
          basePath="/flow"
          steps={{
            first: {
              content: <TestStep activeEffects={new Set()} name="First" />,
              title: "First",
            },
            second: {
              content: <TestStep activeEffects={new Set()} name="Second" />,
              title: "Second",
            },
          }}
        />,
      );
    });

    expect(container.querySelector(".step-flow > header")).not.toBeNull();
    expect(container.querySelector(".step-flow .heading")).not.toBeNull();
    expect(container.querySelector(".step-flow header h2")).not.toBeNull();
    expect(container.querySelector(".step-flow .back")).toBeNull();

    act(() => getButton(container, "Next from First").click());

    expect(getButton(container, "Back").classList).toContain("back");
  });

  it("uses the supplied region id", async () => {
    const flow = await StepFlow({
      basePath: "/flow",
      id: "checkout-steps",
      steps: { first: { content: <StepIdentity />, title: "First" } },
    });

    await act(async () => root.render(flow));

    expect(container.querySelector('[role="region"]')?.id).toBe(
      "checkout-steps",
    );
    expect(container.querySelector("output")?.textContent).toBe(
      "checkout-steps",
    );
  });

  it("uses flow-supplied header and action implementations", async () => {
    const flow = await StepFlow({
      Actions: TestActions,
      Header: TestHeader,
      basePath: "/flow",
      steps: {
        first: {
          content: (
            <StepActions next="Proceed">
              <span>Secondary</span>
            </StepActions>
          ),
          title: "First",
        },
        second: { content: <StepActions next={null} />, title: "Second" },
      },
    });

    await act(async () => root.render(flow));

    expect(container.querySelector("h3")?.textContent).toBe("Site First");
    expect(container.textContent).toContain("Secondary");
    const next = getButton(container, "Site Proceed");
    expect(next.classList).toContain("site-next");
    expect(next.type).toBe("button");
    expect(container.querySelector(".step-actions")).toBeNull();

    act(() => next.click());

    expect(container.querySelector("h3")?.textContent).toBe("Site Second");
    act(() => getButton(container, "Actions Previous").click());
    expect(container.querySelector("h3")?.textContent).toBe("Site First");
  });

  it("uses next as the default plain-button action", () => {
    act(() => {
      root.render(
        <StepFlowClient
          basePath="/flow"
          steps={{
            first: { content: <StepActions />, title: "First" },
            second: { content: null, title: "Second" },
          }}
        />,
      );
    });

    const action = getButton(container, "Continue");
    expect(action.classList).toContain("next");
    expect(action.closest(".step-actions")).not.toBeNull();

    act(() => action.click());

    expect(container.querySelector("h2")?.textContent).toBe("Second");
  });

  it("infers submit within a Kenstack form without advancing the flow", () => {
    act(() => {
      root.render(
        <StepFlowClient
          basePath="/flow"
          steps={{
            first: { content: <FormActionStep />, title: "First" },
            second: { content: null, title: "Second" },
          }}
        />,
      );
    });

    const submit = getButton(container, "Save");
    expect(submit.type).toBe("submit");

    act(() => submit.click());

    expect(container.querySelector("h2")?.textContent).toBe("First");
  });

  it("allows an explicit button action inside a form", () => {
    act(() => {
      root.render(
        <StepFlowClient
          basePath="/flow"
          steps={{
            first: {
              content: <FormActionStep type="button" />,
              title: "First",
            },
            second: { content: null, title: "Second" },
          }}
        />,
      );
    });

    const button = getButton(container, "Save");
    expect(button.type).toBe("button");

    act(() => button.click());

    expect(container.querySelector("h2")?.textContent).toBe("Second");
  });

  it("supports a replacement element and suppressed next action", () => {
    act(() => {
      root.render(
        <StepFlowClient
          basePath="/flow"
          steps={{
            first: {
              content: (
                <>
                  <StepActions next={<button>Wallet</button>} />
                  <StepActions next={null}>
                    <span>Only secondary</span>
                  </StepActions>
                </>
              ),
              title: "First",
            },
          }}
        />,
      );
    });

    expect(getButton(container, "Wallet")).toBeDefined();
    expect(container.textContent).toContain("Only secondary");
  });

  it("resolves an optional catch-all route step", async () => {
    const flow = await StepFlow({
      basePath: "/flow",
      params: Promise.resolve({ step: ["payment"] }),
      steps: { payment: { content: null, title: "Payment" } },
    });

    await act(async () => {
      root.render(flow);
    });

    expect(container.querySelector("h2")?.textContent).toBe("Payment");
  });

  it("rejects extra optional catch-all route segments", async () => {
    await expect(
      StepFlow({
        basePath: "/flow",
        params: Promise.resolve({ step: ["payment", "extra"] }),
        steps: { payment: { content: null, title: "Payment" } },
      }),
    ).rejects.toThrow("Not found");
  });

  it("preserves hidden state while keeping controller and visible effects active", () => {
    const activeEffects = new Set<string>();

    act(() => {
      root.render(<Flow activeEffects={activeEffects} />);
    });

    expect(activeEffects).toEqual(new Set(["Controller", "First"]));
    expect(container.querySelectorAll("h2")).toHaveLength(1);
    expect(container.querySelector("[data-summary]")?.textContent).toBe(
      "Summary",
    );

    act(() => getButton(container, "Increment First").click());
    expect(getButton(container, "Increment First").textContent).toBe(
      "Increment First: 1",
    );

    act(() => getButton(container, "Next from First").click());
    expect(activeEffects).toEqual(new Set(["Controller", "Second"]));
    expect(container.querySelector("output")?.textContent).toBe("second");
    expect(window.location.pathname).toBe("/flow/second");
    expect(
      JSON.parse(
        window.localStorage.getItem("stored-state:%2Fflow:$completedSteps") ??
          "null",
      ),
    ).toEqual({ value: { first: true } });

    act(() => getButton(container, "Back from Second").click());
    expect(activeEffects).toEqual(new Set(["Controller", "First"]));
    expect(getButton(container, "Increment First").textContent).toBe(
      "Increment First: 1",
    );
    expect(window.location.pathname).toBe("/flow/first");
  });

  it("moves focus after a step change, not on initial load", () => {
    const focus = vi.spyOn(HTMLElement.prototype, "focus");

    act(() => {
      root.render(<Flow activeEffects={new Set()} />);
    });

    expect(focus).not.toHaveBeenCalled();

    act(() => getButton(container, "Next from First").click());

    expect(focus).toHaveBeenCalledOnce();
  });

  it("keeps one history entry and clears stored state on a final step", () => {
    window.localStorage.setItem(
      "stored-state:%2Fflow:selection",
      JSON.stringify({ value: true }),
    );
    window.localStorage.setItem(
      "stored-state:%2Fflow:$expiresAt",
      String(Date.now() + 60_000),
    );

    act(() => {
      root.render(
        <StepFlowClient
          basePath="/flow"
          summary={<span data-summary>Summary</span>}
          steps={{
            first: {
              content: <TestStep activeEffects={new Set()} name="First" />,
              title: "First",
            },
            second: {
              content: <TestStep activeEffects={new Set()} name="Second" />,
              title: "Second",
            },
            complete: {
              content: <FinalStep />,
              final: true,
              title: "Complete",
            },
          }}
        />,
      );
    });

    const historyLength = window.history.length;

    act(() => getButton(container, "Next from First").click());
    expect(container.querySelector(".step-flow .back")).not.toBeNull();
    act(() => getButton(container, "Next from Second").click());
    expect(container.querySelector(".step-flow .back")).toBeNull();
    expect(container.querySelector("[data-summary]")).toBeNull();
    expect(window.localStorage).toHaveLength(0);
    expect(window.history).toHaveLength(historyLength);
    expect(window.location.pathname).toBe("/flow/complete");
  });

  it("shows a final step on a direct visit and clears stored state", () => {
    window.localStorage.setItem(
      "stored-state:%2Fflow:selection",
      JSON.stringify({ value: true }),
    );
    window.localStorage.setItem(
      "stored-state:%2Fflow:$expiresAt",
      String(Date.now() + 60_000),
    );
    window.history.replaceState(null, "", "/flow/complete");

    act(() => {
      root.render(
        <StepFlowClient
          basePath="/flow"
          steps={{
            first: { content: <NextStep name="First" />, title: "First" },
            complete: {
              content: <FinalStep />,
              final: true,
              title: "Complete",
            },
          }}
        />,
      );
    });

    expect(container.querySelector("h2")?.textContent).toBe("Complete");
    expect(window.location.pathname).toBe("/flow/complete");
    expect(window.localStorage).toHaveLength(0);
  });

  it("preserves a step-owned form while the step is hidden", () => {
    act(() => {
      root.render(<FormFlow />);
    });

    act(() => getButton(container, "Set name").click());
    expect(container.querySelector("output")?.textContent).toBe("Ada");

    act(() => getButton(container, "Next from Form").click());
    act(() => getButton(container, "Back from Review").click());

    expect(container.querySelector("output")?.textContent).toBe("Ada");
  });

  it("lets a mounted controller reactivate its own step", () => {
    act(() => {
      root.render(<ScopedActivationFlow />);
    });

    act(() => getButton(container, "Next from Seats").click());
    expect(container.querySelector("h2")?.textContent).toBe("Payment");

    act(() => getButton(container, "Return to this step").click());
    expect(container.querySelector("h2")?.textContent).toBe("Seats");
  });

  it("prevents a requested later step from skipping an incomplete step", () => {
    window.history.replaceState(null, "", "/flow/signin");

    act(() => {
      root.render(
        <StepFlowClient
          basePath="/flow"
          steps={{
            tickets: { content: null, title: "Tickets" },
            signin: { content: null, title: "Sign in" },
          }}
        />,
      );
    });

    expect(container.querySelector("h2")?.textContent).toBe("Tickets");
    expect(window.location.pathname).toBe("/flow/tickets");
  });

  it("restores a requested step after its preceding steps were completed", () => {
    window.history.replaceState(null, "", "/flow/signin");
    window.localStorage.setItem(
      "stored-state:%2Fflow:$completedSteps",
      JSON.stringify({ value: { tickets: true } }),
    );
    window.localStorage.setItem(
      "stored-state:%2Fflow:$expiresAt",
      String(Date.now() + 60_000),
    );

    act(() => {
      root.render(
        <StepFlowClient
          basePath="/flow"
          steps={{
            tickets: { content: null, title: "Tickets" },
            signin: { content: null, title: "Sign in" },
          }}
        />,
      );
    });

    expect(container.querySelector("h2")?.textContent).toBe("Sign in");
    expect(window.location.pathname).toBe("/flow/signin");
  });

  it("blocks the flow when browser storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage is read-only");
    });

    act(() => {
      root.render(<Flow activeEffects={new Set()} />);
    });
    expect(container.querySelector('[role="alert"]')).toBeNull();

    act(() => getButton(container, "Next from First").click());

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Browser storage is required to continue",
    );
    expect(container.querySelector("button")).toBeNull();
    expect(window.location.pathname).toBe("/flow/first");
  });

  it("does not advance when the completion ledger cannot be written", () => {
    act(() => {
      root.render(<Flow activeEffects={new Set()} />);
    });

    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key,
      value,
    ) {
      if (key.endsWith("$completedSteps")) {
        throw new Error("The completion ledger is read-only");
      }
      setItem.call(this, key, value);
    });
    act(() => getButton(container, "Next from First").click());

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Browser storage is required to continue",
    );
    expect(window.location.pathname).toBe("/flow/first");
  });

  it("does not advance after an earlier stored-state write fails", () => {
    window.history.replaceState(null, "", "/expiring-flow/first");
    act(() => root.render(<ExpiringStoredStateFlow />));

    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key,
      value,
    ) {
      if (key.endsWith(":selection")) {
        throw new Error("The step value is read-only");
      }
      setItem.call(this, key, value);
    });
    act(() => getButton(container, "Store first value").click());

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Browser storage is required to continue",
    );
    expect(window.location.pathname).toBe("/expiring-flow/first");
  });

  it("shows a final step even when stored state cannot be cleared", () => {
    window.localStorage.setItem(
      "stored-state:%2Fflow:selection",
      JSON.stringify({ value: true }),
    );
    window.localStorage.setItem(
      "stored-state:%2Fflow:$expiresAt",
      String(Date.now() + 60_000),
    );

    act(() => {
      root.render(
        <StepFlowClient
          basePath="/flow"
          steps={{
            first: {
              content: <TestStep activeEffects={new Set()} name="First" />,
              title: "First",
            },
            complete: { content: null, final: true, title: "Complete" },
          }}
        />,
      );
    });

    const removeItem = Storage.prototype.removeItem;
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(function (
      this: Storage,
      key,
    ) {
      if (key.startsWith("stored-state:%2Fflow:")) {
        throw new Error("The flow state is read-only");
      }
      removeItem.call(this, key);
    });
    act(() => getButton(container, "Next from First").click());

    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector("h2")?.textContent).toBe("Complete");
    expect(window.location.pathname).toBe("/flow/complete");
  });

  it("resets in-memory progress when another tab clears the flow", () => {
    act(() => {
      root.render(<Flow activeEffects={new Set()} />);
    });
    act(() => getButton(container, "Next from First").click());
    expect(container.querySelector("h2")?.textContent).toBe("Second");

    const progressKey = "stored-state:%2Fflow:$completedSteps";
    const oldValue = window.localStorage.getItem(progressKey);
    act(() => {
      window.localStorage.removeItem(progressKey);
      window.localStorage.removeItem("stored-state:%2Fflow:$expiresAt");
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: progressKey,
          newValue: null,
          oldValue,
          storageArea: window.localStorage,
        }),
      );
    });

    expect(container.querySelector("h2")?.textContent).toBe("First");
    expect(window.location.pathname).toBe("/flow/first");
  });

  it("does not reset progress when another tab clears session storage", () => {
    act(() => {
      root.render(<Flow activeEffects={new Set()} />);
    });
    act(() => getButton(container, "Next from First").click());

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: null,
          storageArea: window.sessionStorage,
        }),
      );
    });

    expect(container.querySelector("h2")?.textContent).toBe("Second");
    expect(window.location.pathname).toBe("/flow/second");
  });

  it("restores step-scoped state", () => {
    act(() => {
      root.render(<StoredStateFlow />);
    });

    expect(container.querySelector("output")?.textContent).toBe("Empty");

    act(() => getButton(container, "Increment stored value").click());
    expect(container.querySelector("output")?.textContent).toBe("1");
    expect(window.localStorage).toHaveLength(2);

    act(() => getButton(container, "Clear stored value").click());
    expect(container.querySelector("output")?.textContent).toBe("Empty");
    expect(
      window.localStorage.getItem("stored-state:%2Fstored-flow:count"),
    ).toBeNull();

    act(() => getButton(container, "Increment stored value").click());

    act(() => {
      root.render(<StoredStateFlow key="remounted" />);
    });
    expect(container.querySelector("output")?.textContent).toBe("1");
  });

  it("blocks the flow when browser storage access throws", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("Storage access is blocked");
    });

    act(() => {
      root.render(<StoredStateFlow />);
    });
    expect(container.querySelector('[role="alert"]')).toBeNull();

    act(() => getButton(container, "Increment stored value").click());

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Browser storage is required to continue",
    );
    expect(container.querySelector("button")).toBeNull();
  });

  it("reports a storage mutation that fails after readable access", () => {
    const valueKey = "stored-state:%2Fstored-flow:count";
    const deadlineKey = "stored-state:%2Fstored-flow:$expiresAt";
    const deadline = String(Date.now() + 60_000);
    window.localStorage.setItem(valueKey, JSON.stringify({ value: 1 }));
    window.localStorage.setItem(deadlineKey, deadline);
    act(() => {
      root.render(<StoredStateFlow />);
    });
    expect(container.querySelector('[role="alert"]')).toBeNull();

    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key,
      value,
    ) {
      if (key === valueKey) {
        throw new Error("The stored value is read-only");
      }
      setItem.call(this, key, value);
    });

    act(() => getButton(container, "Increment stored value").click());

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Browser storage is required to continue",
    );
    expect(container.querySelector("button")).toBeNull();
    expect(window.localStorage.getItem(valueKey)).toBe(
      JSON.stringify({ value: 1 }),
    );
    expect(window.localStorage.getItem(deadlineKey)).toBe(deadline);
  });

  it("reports a mutation when storage becomes unreadable after render", () => {
    act(() => {
      root.render(<StoredStateFlow />);
    });
    expect(container.querySelector('[role="alert"]')).toBeNull();

    const storageGetter = vi
      .spyOn(window, "localStorage", "get")
      .mockImplementation(() => {
        throw new Error("Storage access changed");
      });
    act(() => getButton(container, "Increment stored value").click());

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Browser storage is required to continue",
    );
    expect(container.querySelector("button")).toBeNull();

    storageGetter.mockRestore();
  });

  it("reports a failed flow clear when storage becomes unreadable", () => {
    act(() => {
      root.render(<StoredStateFlow />);
    });
    expect(container.querySelector('[role="alert"]')).toBeNull();

    const storageGetter = vi
      .spyOn(window, "localStorage", "get")
      .mockImplementation(() => {
        throw new Error("Storage access changed");
      });
    act(() => clearStoredState("/stored-flow"));

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Browser storage is required to continue",
    );
    storageGetter.mockRestore();
  });

  it("does not restore a stored value rejected by its owner schema", () => {
    window.localStorage.setItem(
      "stored-state:%2Fstored-flow:count",
      JSON.stringify({ value: "wrong" }),
    );
    window.localStorage.setItem(
      "stored-state:%2Fstored-flow:$expiresAt",
      String(Date.now() + 60_000),
    );

    act(() => {
      root.render(<StoredStateFlow />);
    });

    expect(container.querySelector("output")?.textContent).toBe("Empty");
    expect(
      window.localStorage.getItem("stored-state:%2Fstored-flow:count"),
    ).toBeNull();
  });

  it("reacts when another tab clears local storage", () => {
    act(() => {
      root.render(<StoredStateFlow />);
    });
    act(() => getButton(container, "Increment stored value").click());

    act(() => {
      window.localStorage.clear();
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
    });

    expect(container.querySelector("output")?.textContent).toBe("Empty");
  });

  it("lets a flow owner outside the flow read a slice a step wrote", () => {
    window.history.replaceState(null, "", "/owner-flow/first");

    act(() => root.render(<OwnerReadFlow />));
    expect(container.querySelector("[data-owner]")?.textContent).toBe("Empty");

    act(() => getButton(container, "Store first value").click());
    expect(window.location.pathname).toBe("/owner-flow/second");
    expect(container.querySelector("[data-owner]")?.textContent).toBe("Stored");

    act(() => root.render(<OwnerReadFlow key="remounted" />));
    expect(container.querySelector("[data-owner]")?.textContent).toBe("Stored");

    act(() => getButton(container, "Next from Second").click());
    expect(window.location.pathname).toBe("/owner-flow/complete");
    expect(container.querySelector("[data-owner]")?.textContent).toBe("Empty");
  });

  it("returns to the first step when a write follows the flow's 24-hour lifetime", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T12:00:00.000Z"));
    window.history.replaceState(null, "", "/expiring-flow/first");

    act(() => root.render(<ExpiringStoredStateFlow />));
    act(() => getButton(container, "Store first value").click());
    expect(window.location.pathname).toBe("/expiring-flow/second");

    const deadlineKey = "stored-state:%2Fexpiring-flow:$expiresAt";
    const firstDeadline = window.localStorage.getItem(deadlineKey);

    act(() => vi.advanceTimersByTime(60 * 60 * 1000));
    act(() => getButton(container, "Store second value").click());
    expect(Number(window.localStorage.getItem(deadlineKey))).toBe(
      Number(firstDeadline) + 60 * 60 * 1000,
    );

    act(() => vi.advanceTimersByTime(24 * 60 * 60 * 1000));
    expect(window.location.pathname).toBe("/expiring-flow/second");

    act(() => getButton(container, "Store second value").click());
    expect(window.location.pathname).toBe("/expiring-flow/first");
    expect(
      window.localStorage.getItem("stored-state:%2Fexpiring-flow:selection"),
    ).toBeNull();
    expect(
      window.localStorage.getItem(
        "stored-state:%2Fexpiring-flow:$completedSteps",
      ),
    ).toBeNull();
  });

  it("continues from the first step of an expired flow with a fresh value", () => {
    window.history.replaceState(null, "", "/expiring-flow/second");
    window.localStorage.setItem(
      "stored-state:%2Fexpiring-flow:$completedSteps",
      JSON.stringify({ value: { first: true } }),
    );
    window.localStorage.setItem(
      "stored-state:%2Fexpiring-flow:confirmation",
      JSON.stringify({ value: true }),
    );
    window.localStorage.setItem(
      "stored-state:%2Fexpiring-flow:$expiresAt",
      String(Date.now() - 1),
    );

    act(() => root.render(<ExpiringStoredStateFlow />));
    expect(window.location.pathname).toBe("/expiring-flow/first");

    act(() => getButton(container, "Store first value").click());

    expect(window.location.pathname).toBe("/expiring-flow/second");
    expect(
      window.localStorage.getItem("stored-state:%2Fexpiring-flow:selection"),
    ).toBe(JSON.stringify({ value: true }));
    expect(
      window.localStorage.getItem("stored-state:%2Fexpiring-flow:confirmation"),
    ).toBeNull();
  });

  it("returns to the first step when an expired step commits and continues", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T12:00:00.000Z"));
    window.history.replaceState(null, "", "/expiring-flow/first");

    act(() => root.render(<ExpiringStoredStateFlow />));
    act(() => getButton(container, "Store first value").click());
    expect(window.location.pathname).toBe("/expiring-flow/second");

    act(() => vi.advanceTimersByTime(25 * 60 * 60 * 1000));
    act(() => getButton(container, "Continue with second value").click());

    expect(window.location.pathname).toBe("/expiring-flow/first");
    expect(
      window.localStorage.getItem("stored-state:%2Fexpiring-flow:selection"),
    ).toBeNull();
  });

  it("does not publish expired stored values to workflow owners", () => {
    window.history.replaceState(null, "", "/expired-restore/second");
    window.localStorage.setItem(
      "stored-state:%2Fexpired-restore:selection",
      JSON.stringify({ value: true }),
    );
    window.localStorage.setItem(
      "stored-state:%2Fexpired-restore:$expiresAt",
      String(Date.now() - 1),
    );

    act(() => root.render(<ExpiredRestoreFlow />));

    expect(container.querySelector("[data-restored]")?.textContent).toBe(
      "Empty",
    );
    expect(window.location.pathname).toBe("/expired-restore/first");
  });

  it("restores controller state before showing a hydrated route", async () => {
    act(() => root.unmount());
    window.history.replaceState(null, "", "/expired-restore/second");
    window.localStorage.setItem(
      "stored-state:%2Fexpired-restore:selection",
      JSON.stringify({ value: true }),
    );
    window.localStorage.setItem(
      "stored-state:%2Fexpired-restore:$completedSteps",
      JSON.stringify({ value: { first: true } }),
    );
    window.localStorage.setItem(
      "stored-state:%2Fexpired-restore:$expiresAt",
      String(Date.now() + 60_000),
    );
    container.innerHTML = renderToString(<ExpiredRestoreFlow />);

    await act(async () => {
      root = hydrateRoot(container, <ExpiredRestoreFlow />);
    });

    expect(container.querySelector("[data-restored]")?.textContent).toBe(
      "Restored",
    );
    expect(window.location.pathname).toBe("/expired-restore/second");
    expect(container.querySelector("h2")?.textContent).toBe("Second");
  });
});

function TestHeader({ headingId, title }: StepHeaderProps) {
  return (
    <header>
      <h3 id={headingId}>Site {title}</h3>
    </header>
  );
}

function TestActions({ children, next }: StepActionsProps) {
  const { isFirstStep, next: advance, previous } = useStep();

  return (
    <div className="site-actions">
      {!isFirstStep ? (
        <button onClick={previous} type="button">
          Actions Previous
        </button>
      ) : null}
      {children}
      {next !== null ? (
        <button className="site-next" onClick={advance} type="button">
          Site {typeof next === "string" ? next : "Continue"}
        </button>
      ) : null}
    </div>
  );
}

function FormActionStep({ type }: { type?: "button" }) {
  return (
    <FormProvider
      defaultValues={{ name: "" }}
      schema={z.object({ name: z.string() })}
    >
      <form onSubmit={(event) => event.preventDefault()}>
        <StepActions next={{ label: "Save", type }} />
      </form>
    </FormProvider>
  );
}

function Flow({ activeEffects }: { activeEffects: Set<string> }) {
  const steps = {
    first: {
      content: <TestStep activeEffects={activeEffects} name="First" />,
      controller: <PersistentController activeEffects={activeEffects} />,
      title: "First",
    },
    second: {
      content: <TestStep activeEffects={activeEffects} name="Second" />,
      title: "Second",
    },
  } satisfies Steps;

  return (
    <StepFlowClient basePath="/flow" steps={steps} summary={<FlowSummary />} />
  );
}

function FormFlow() {
  const steps = {
    form: {
      content: (
        <FormProvider
          defaultValues={{ name: "" }}
          schema={z.object({ name: z.string() })}
        >
          <FormStep />
        </FormProvider>
      ),
      title: "Form",
    },
    review: {
      content: <TestStep activeEffects={new Set()} name="Review" />,
      title: "Review",
    },
  } satisfies Steps;

  return <StepFlowClient basePath="/flow" steps={steps} />;
}

function StepIdentity() {
  return <output>{useStep().id}</output>;
}

function FormStep() {
  const { next } = useStep();
  const form = useFormContext<{ name: string }>();
  const name = form.watch("name");

  return (
    <>
      <output>{name}</output>
      <button onClick={() => form.setValue("name", "Ada")}>Set name</button>
      <button onClick={next}>Next from Form</button>
    </>
  );
}

function NextStep({ name }: { name: string }) {
  const { next } = useStep();

  return <button onClick={next}>Next from {name}</button>;
}

function PersistentController({
  activeEffects,
}: {
  activeEffects: Set<string>;
}) {
  const { isActive } = useStep();

  useEffect(() => {
    activeEffects.add("Controller");

    return () => {
      activeEffects.delete("Controller");
    };
  }, [activeEffects]);

  return <output>{isActive ? "first" : "second"}</output>;
}

function TestStep({
  activeEffects,
  name,
}: {
  activeEffects: Set<string>;
  name: string;
}) {
  const { next, previous } = useStep();
  const [count, setCount] = useState(0);

  useEffect(() => {
    activeEffects.add(name);

    return () => {
      activeEffects.delete(name);
    };
  }, [activeEffects, name]);

  return (
    <>
      <button onClick={previous}>Back from {name}</button>
      <button onClick={() => setCount((current) => current + 1)}>
        Increment {name}: {count}
      </button>
      <button onClick={next}>Next from {name}</button>
    </>
  );
}

function FlowSummary() {
  return (
    <span data-summary>{useStep().isFirstStep ? "Summary" : "Later"}</span>
  );
}

function FinalStep() {
  return <p>Done</p>;
}

function OwnerReadFlow() {
  const [selection] = useStoredValue(
    "/owner-flow",
    "selection",
    storedBooleanSchema,
  );

  return (
    <>
      <output data-owner>{selection === true ? "Stored" : "Empty"}</output>
      <StepFlowClient
        basePath="/owner-flow"
        steps={{
          first: { content: <FirstStoredStateStep />, title: "First" },
          second: { content: <NextStep name="Second" />, title: "Second" },
          complete: { content: <FinalStep />, final: true, title: "Complete" },
        }}
      />
    </>
  );
}

function StoredStateFlow() {
  return (
    <StepFlowClient
      basePath="/stored-flow"
      steps={{ stored: { content: <StoredStateStep />, title: "Stored" } }}
    />
  );
}

function StoredStateStep() {
  const [value, setValue] = useStoredValue(
    useFlowContext().basePath,
    "count",
    storedCountSchema,
  );

  return (
    <>
      <output>{value ?? "Empty"}</output>
      <button onClick={() => setValue((current) => (current ?? 0) + 1)}>
        Increment stored value
      </button>
      <button onClick={() => setValue(undefined)}>Clear stored value</button>
    </>
  );
}

function ExpiringStoredStateFlow() {
  return (
    <StepFlowClient
      basePath="/expiring-flow"
      steps={{
        first: { content: <FirstStoredStateStep />, title: "First" },
        second: { content: <SecondStoredStateStep />, title: "Second" },
        third: { content: <p>Third content</p>, title: "Third" },
      }}
    />
  );
}

function FirstStoredStateStep() {
  const [, setValue] = useStoredValue(
    useFlowContext().basePath,
    "selection",
    storedBooleanSchema,
  );
  const { next } = useStep();

  return (
    <button
      onClick={() => {
        setValue(true);
        next();
      }}
    >
      Store first value
    </button>
  );
}

function SecondStoredStateStep() {
  const [, setValue] = useStoredValue(
    useFlowContext().basePath,
    "confirmation",
    storedBooleanSchema,
  );
  const { next } = useStep();

  return (
    <>
      <button onClick={() => setValue(true)}>Store second value</button>
      <button
        onClick={() => {
          setValue(true);
          next();
        }}
      >
        Continue with second value
      </button>
    </>
  );
}

function ExpiredRestoreFlow() {
  const [isRestored, setIsRestored] = useState(false);

  return (
    <>
      <output data-restored>{isRestored ? "Restored" : "Empty"}</output>
      <StepFlowClient
        basePath="/expired-restore"
        steps={{
          first: {
            content: <p>First content</p>,
            controller: (
              <ExpiredRestoreController restore={() => setIsRestored(true)} />
            ),
            title: "First",
          },
          second: { content: <p>Second content</p>, title: "Second" },
        }}
      />
    </>
  );
}

function ExpiredRestoreController({ restore }: { restore: () => void }) {
  const [selection] = useStoredValue(
    useFlowContext().basePath,
    "selection",
    storedBooleanSchema,
  );

  useLayoutEffect(() => {
    if (selection === true) {
      restore();
    }
  }, [restore, selection]);

  return null;
}

function ScopedActivationFlow() {
  const steps = {
    seats: {
      content: <NextStep name="Seats" />,
      controller: <ScopedActivationController />,
      title: "Seats",
    },
    payment: { content: null, title: "Payment" },
  } satisfies Steps;

  return <StepFlowClient basePath="/flow" steps={steps} />;
}

function ScopedActivationController() {
  const { activate } = useStep();

  return <button onClick={activate}>Return to this step</button>;
}

function getButton(container: HTMLElement, label: string) {
  const match = Array.from(
    container.querySelectorAll<HTMLButtonElement>("button"),
  ).find((button) => button.textContent?.trim().startsWith(label));

  if (!match) {
    throw new Error(`Missing button: ${label}`);
  }

  return match;
}
