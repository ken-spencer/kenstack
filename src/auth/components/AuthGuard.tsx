import { Suspense } from "react";

import { deps } from "@app/deps";

type Roles = (typeof deps)["roles"];

type Props = {
  role?: Roles[number] | Roles[number][];
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
