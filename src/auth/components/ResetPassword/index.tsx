import { Suspense } from "react";

import Progress from "@kenstack/components/Progress";
import Loader from "./Loader";

// path is the page that hosts this form, where a signed-out visitor returns
// after signing in.
export default function ResetPasswordForm({
  path = "/reset-password",
}: {
  path?: `/${string}`;
}) {
  return (
    <Suspense fallback={<Progress />}>
      <Loader path={path} />
    </Suspense>
  );
}
