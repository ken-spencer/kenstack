"use client";

import {
  QueryClient,
  QueryCache,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useState } from "react";

import Loading from "@admin/components/Loading";
import dynamic from "next/dynamic";
import Dialog from "../../Dialog";

import Provider from "./Provider";

const Library = dynamic(
  () =>
    import("./Library").catch((e) => {
      const Fallback = () => (
        <p> There was an error loading the library: {e.message} </p>
      );
      Fallback.displayName = "ErrorFallback";
      return Fallback;
    }),
  {
    ssr: false,
    loading: Loading,
  },
);

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // eslint-disable-next-line no-console
      console.error(error);
    },
  }),
  /*
  mutationCache: new MutationCache({
    onError: (error) => {
      console.error('Mutation error:', error);
    },
  }),
  */
});

export default function LibraryIndex() {
  const [open, setOpen] = useState(true);
  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Dialog
      variant="large"
      open={open}
      onClose={handleClose}
      title="Image library"
      // close={close}
      // actions={buttons}
    >
      <QueryClientProvider client={queryClient}>
        <Provider mode="image">
          <Library
            library={null}
            edit={false}
            // folder={this.options.folder_id}
            type={"null"}
            // url={"/foo/bar"}
            // iconPath={this.options.path + "/icons/"}
            icons={{}}
            accept={[]}
            choose={() => {}}
            chooseFolder={() => {}}
          />
        </Provider>
      </QueryClientProvider>
    </Dialog>
  );
}
