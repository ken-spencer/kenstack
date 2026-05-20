import { deps } from "@app/deps";

import Menu from "./Menu";
import Link from "next/link";
import { Button } from "@kenstack/components/ui/button";
import type { AccountMenuItems } from "./types";

// import UnAuthenticated from "./UnAuthenticated";

export default async function AccountMenuLoader({
  fallback,
  items,
}: {
  fallback: React.ReactNode;
  items?: AccountMenuItems;
}) {
  const user = await deps.auth.getCurrentUser();

  if (!user) {
    return fallback ?? null;
  }

  return (
    <Menu user={user}>
      {items &&
        items.map(([href, text, Icon], key) => (
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
