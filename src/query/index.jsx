"use client";

import merge from "lodash-es/merge";
import useMutation from "@kenstack/hooks/useMutation";

import {
  QueryClient,
  QueryCache,
  QueryClientProvider,
} from "@tanstack/react-query";

export {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

function queryClient(props = {}) {
  const params = merge(
    {},
    {
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
    },
    props
  );

  return new QueryClient(params);
}

export { queryClient, QueryClientProvider, useMutation };
