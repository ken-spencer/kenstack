"use client";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { QueryClient, QueryCache } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

const queryClient = new QueryClient({
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

const dummyForServer = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};
export default function QueryProvider({ children }) {
  // Safe on client because this is a Client Component
  const persister = createAsyncStoragePersister({
    storage:
      typeof window !== "undefined" ? window.localStorage : dummyForServer,
  });

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 12, // 12 hours
        dehydrateOptions: {
          // Persist only specific queries if desired
          shouldDehydrateQuery: (query) => query.queryKey[0] === "user-info",
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
