import { Suspense } from "react";

import { Skeleton } from "@kenstack/components/Skeleton";
import Loader from "./Loader";

export default function ResetPasswordForm() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-lg space-y-4" aria-busy="true">
          <span className="sr-only">Loading</span>
          {[0, 1].map((field) => (
            <div key={field} className="space-y-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
          <Skeleton className="h-12 w-40" />
        </div>
      }
    >
      <Loader />
    </Suspense>
  );
}
