import AccountMenu from "./AccountMenu";
import Link from "next/link";

import "./account-menu.scss";

export default async function DropmenuServer({
  session,
  className = "",
  buttonClass = "",
  children,
}) {
  const claims = await session.getClaims();

  if (claims === false) {
    return <Link href="/login">Log in</Link>;
  }

  // const roles = claims.roles;

  return (
    <AccountMenu className={className} buttonClass={buttonClass}>
      {children}
    </AccountMenu>
  );
}
