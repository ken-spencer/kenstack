import { Suspense } from "react";

import { hasAccess, type AuthAccess } from "@kenstack/auth/server/auth";

type Props = {
  access?: AuthAccess;
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

export default function AuthGuard(props: Props) {
  return (
    <Suspense fallback={props.fallback ?? null}>
      <AuthGuardContent {...props} />
    </Suspense>
  );
}

async function AuthGuardContent({
  access = "authenticated",
  fallback = null,
  children,
}: Props) {
  const authorized = await hasAccess(access);

  return authorized ? children : fallback;
}
