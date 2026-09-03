import type { ComponentType, SVGProps } from "react";
import type { PublicAuthState } from "@kenstack/auth/server/state";

export type AccountMenuItem = readonly [
  href: string,
  title: string,
  icon: ComponentType<SVGProps<SVGSVGElement>>,
];

export type AccountMenuItems = readonly AccountMenuItem[];

export type AccountMenuItemsResolver = (
  user: Extract<PublicAuthState, { state: "authenticated" }>,
) => AccountMenuItems | Promise<AccountMenuItems>;
