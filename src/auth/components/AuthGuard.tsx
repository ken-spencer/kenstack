import { Suspense } from "react";

import { deps } from "@app/deps";
import type { AuthAccess } from "@kenstack/auth/server/auth";

type Roles = (typeof deps)["roles"];

type Props = {
  access?: AuthAccess<Roles[number]>;
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
  children: React.ReactNode;
};

export default function AuthGuard(props: Props) {
  return (
    <Suspense fallback={props.loading ?? props.fallback ?? null}>
      <AuthGuardContent {...props} />
    </Suspense>
  );
}

async function AuthGuardContent({
  access = "authenticated",
  fallback = null,
  children,
}: Props) {
  const authorized = await deps.auth.hasAccess(access);

  return authorized ? children : fallback;
}
