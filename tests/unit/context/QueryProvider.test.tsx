import { renderToStaticMarkup } from "react-dom/server";
import {
  QueryClient,
  QueryClientProvider as TanStackQueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import QueryProvider from "@kenstack/context/QueryProvider";

describe("QueryProvider", () => {
  it("creates a query client when no owner exists", () => {
    let resolvedClient: QueryClient | undefined;

    renderToStaticMarkup(
      <QueryProvider>
        <CaptureClient onResolve={(client) => (resolvedClient = client)} />
      </QueryProvider>,
    );

    expect(resolvedClient).toBeInstanceOf(QueryClient);
  });

  it("reuses the owning query client", () => {
    const owner = new QueryClient();
    let resolvedClient: QueryClient | undefined;

    renderToStaticMarkup(
      <TanStackQueryClientProvider client={owner}>
        <QueryProvider>
          <CaptureClient onResolve={(client) => (resolvedClient = client)} />
        </QueryProvider>
      </TanStackQueryClientProvider>,
    );

    expect(resolvedClient).toBe(owner);
  });
});

function CaptureClient({
  onResolve,
}: {
  onResolve: (client: QueryClient) => void;
}) {
  onResolve(useQueryClient());

  return null;
}
