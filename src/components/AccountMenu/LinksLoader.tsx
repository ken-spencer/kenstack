import { loadPublicAuthState } from "@kenstack/auth/server/state";

import { renderAccountMenuItems } from "./items";
import Links from "./Links";
import type { AccountMenuItems, AccountMenuItemsResolver } from "./types";

// AccountMenu's links, Logout and signed-out fallback laid out inline, for a site to place inside its
// mobile slide-out or anywhere a popover does not fit.
export default async function AccountLinksLoader({
  fallback,
  items,
}: {
  fallback: React.ReactNode;
  items?: AccountMenuItems | AccountMenuItemsResolver;
}) {
  const authState = await loadPublicAuthState();

  return (
    <Links authState={authState} fallback={fallback}>
      {await renderAccountMenuItems(authState, items)}
    </Links>
  );
}
