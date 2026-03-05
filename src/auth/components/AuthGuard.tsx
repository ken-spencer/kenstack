import { Suspense } from "react";

import { deps, type UserRole } from "@app/deps";

type Props = {
  role?: UserRole | UserRole[];
  children: React.ReactNode;
};

export default function AuthGuardCont(props: Props) {
  return (
    <Suspense>
      <AuthGuard {...props} />
    </Suspense>
  );
}

async function AuthGuard({ role, children }: Props) {
  const user = await deps.auth.requireUser({ role });
  if (user) {
    return children;
  }
}
