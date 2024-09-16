// import authenticate from "../../../auth/authenticate";

// import Alert from "@mui/material/Alert";

import { AdminEditProvider } from "./context";

// TODO this is not yet implemented, but needed by site users on refocus, anbd will be needed here later.
import {
  QueryClient,
  QueryCache,
  QueryClientProvider,
} from "@tanstack/react-query";

import AdminForm from "./Form";

import { useServer } from "@kenstack/server/context";

export default function AdminEdit({ admin }) {
  const { id, isNew, row, userId } = useServer();
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

  return (
    <QueryClientProvider client={queryClient}>
      <AdminEditProvider
        admin={admin}
        isNew={isNew}
        id={id}
        row={row}
        userId={userId}
      >
        <AdminForm />
      </AdminEditProvider>
    </QueryClientProvider>
  );
}
