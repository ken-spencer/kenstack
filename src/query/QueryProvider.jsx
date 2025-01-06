"use client";

import { queryClient, QueryClientProvider } from "@kenstack/query";

const client = queryClient();

export default function QueryProvider({ children }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
