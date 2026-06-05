import { deps } from "@app/deps";

import Menu from "./Menu";
import Link from "next/link";
import { Button } from "@kenstack/components/ui/button";
import type { AccountMenuItems, AccountMenuItemsResolver } from "./types";

// import UnAuthenticated from "./UnAuthenticated";

export default async function AccountMenuLoader({
  fallback,
  items,
}: {
  fallback: React.ReactNode;
  items?: AccountMenuItems | AccountMenuItemsResolver;
}) {
  const user = await deps.auth.getCurrentUser();

  if (!user) {
    return fallback ?? null;
  }

  const resolvedItems = typeof items === "function" ? await items(user) : items;

  return (
    <Menu user={user}>
      {resolvedItems &&
        resolvedItems.map(([href, text, Icon], key) => (
          <Button key={href + key} variant="link" asChild>
            <Link className="w-full justify-start" href={href}>
              <Icon />
              {text}
            </Link>
          </Button>
        ))}
    </Menu>
  );
}
