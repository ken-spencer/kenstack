import { loadPublicAuthState } from "@kenstack/auth/server/state";

import { renderAccountMenuItems } from "./items";
import Menu from "./Menu";
import type { AccountMenuItems, AccountMenuItemsResolver } from "./types";

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
      {await renderAccountMenuItems(authState, items)}
    </Menu>
  );
}
