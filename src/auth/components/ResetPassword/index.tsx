import { Suspense } from "react";

import Progress from "@kenstack/components/Progress";
import Loader from "./Loader";

export default async function ResetPasswordFormCont({
  token,
}: {
  token?: string;
}) {
  return (
    <Suspense fallback={<Progress />}>
      <Loader token={token} />
    </Suspense>
  );
}
