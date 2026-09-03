import { Suspense } from "react";

import Progress from "@kenstack/components/Progress";
import Loader from "./Loader";

export default function ResetPasswordForm() {
  return (
    <Suspense fallback={<Progress />}>
      <Loader />
    </Suspense>
  );
}
