import { deps } from "@app/deps";

import Menu from "./Menu";
import Link from "next/link";
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
          <Link
            className="text-foreground inline-flex h-8 w-full items-center justify-start gap-1.5 rounded-lg border border-transparent px-2.5 text-sm font-medium whitespace-nowrap transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            href={href}
            key={href + key}
          >
            <Icon />
            {text}
          </Link>
        ))}
    </Menu>
  );
}
