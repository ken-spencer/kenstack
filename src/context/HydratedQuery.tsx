import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { io } from "next/cache";
import type { ReactNode } from "react";

// Seeds one query for the client tree below, so its first render uses the
// server-loaded value instead of fetching it again.
export default async function HydratedQuery({
  children,
  data,
  queryKey,
}: {
  children: ReactNode;
  data: unknown;
  queryKey: QueryKey;
}) {
  // The query cache stamps the current time when it stores the data, which
  // must not happen while prerendering.
  await io();
  const queryClient = new QueryClient();
  queryClient.setQueryData(queryKey, data);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
