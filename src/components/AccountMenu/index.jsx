import AccountMenu from "./AccountMenu";
import Link from "next/link";

import "./account-menu.scss";

export default async function DropmenuServer({ session, children }) {
  const claims = await session.getClaims();

  if (claims === false) {
    return <Link href="/login">Sign in</Link>;
  }

  // const roles = claims.roles;

  return <AccountMenu>{children}</AccountMenu>;
}
