"use client";
import { useContext, useState, type ReactNode } from "react";
import {
  QueryClient,
  QueryCache,
  QueryClientContext,
  QueryClientProvider,
} from "@tanstack/react-query";

function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        // eslint-disable-next-line no-console
        console.error(error);
      },
    }),
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000,
      },
    },
  });
}

export default function QueryProvider({ children }: { children: ReactNode }) {
  const existingClient = useContext(QueryClientContext);

  if (existingClient) {
    return children;
  }

  return <QueryClientRoot>{children}</QueryClientRoot>;
}

function QueryClientRoot({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
