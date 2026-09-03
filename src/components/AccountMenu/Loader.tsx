import { loadPublicAuthState } from "@kenstack/auth/server/state";

import Menu from "./Menu";
import type { AccountMenuItems, AccountMenuItemsResolver } from "./types";
import { GuardedLink } from "@kenstack/forms/NavigationBlocker";

export default async function AccountMenuLoader({
  fallback,
  items,
}: {
  fallback: React.ReactNode;
  items?: AccountMenuItems | AccountMenuItemsResolver;
}) {
  const authState = await loadPublicAuthState();

  return (
    <Menu authState={authState} fallback={fallback}>
      {authState.state === "authenticated"
        ? (typeof items === "function" ? await items(authState) : items)?.map(
            ([href, text, Icon], key) => (
              <GuardedLink className="menu-item" href={href} key={href + key}>
                <Icon />
                {text}
              </GuardedLink>
            ),
          )
        : null}
    </Menu>
  );
}
