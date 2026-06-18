"use client";

import dynamic from "next/dynamic";

const PageControlsClient = dynamic(() => import("./ControlsClient"), {
  ssr: false,
});

export default function PageControlsLoader(props: {
  className?: string;
  draftModeEnabled: boolean;
}) {
  return <PageControlsClient {...props} />;
}
