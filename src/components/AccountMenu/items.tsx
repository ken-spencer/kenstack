import type { PublicAuthState } from "@kenstack/auth/server/state";
import { GuardedLink } from "@kenstack/forms/NavigationBlocker";

import type { AccountMenuItems, AccountMenuItemsResolver } from "./types";

// The signed-in account's links, rendered on the server for AccountMenu and AccountLinks alike.
export async function renderAccountMenuItems(
  authState: PublicAuthState,
  items: AccountMenuItems | AccountMenuItemsResolver | undefined,
) {
  if (authState.state !== "authenticated") {
    return null;
  }

  return (typeof items === "function" ? await items(authState) : items)?.map(
    ([href, text, Icon], key) => (
      <GuardedLink className="menu-item" href={href} key={href + key}>
        <Icon />
        {text}
      </GuardedLink>
    ),
  );
}
