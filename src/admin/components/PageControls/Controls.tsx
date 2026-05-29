import { draftMode } from "next/headers";

import AuthGuard from "@kenstack/auth/components/AuthGuard";
import PageControlsClient from "./ControlsClient";

type PageControlsProps = {
  className?: string;
};

export default function PageControls(props: PageControlsProps) {
  return (
    <AuthGuard access="admin">
      <PageControlsContent {...props} />
    </AuthGuard>
  );
}

async function PageControlsContent(props: PageControlsProps) {
  return (
    <PageControlsClient
      {...props}
      draftModeEnabled={(await draftMode()).isEnabled}
    />
  );
}
