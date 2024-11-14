"use client";

import { useState } from "react";

import Loading from "@kenstack/components/Loading";
import dynamic from "next/dynamic";
import Dialog from "@kenstack/components/Dialog";

import QueryProvider from "./QueryProvider";
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
      <QueryProvider>
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
      </QueryProvider>
    </Dialog>
  );
}
