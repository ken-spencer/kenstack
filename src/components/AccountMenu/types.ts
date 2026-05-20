import type { ComponentType, SVGProps } from "react";
import type { User } from "@kenstack/types";

export type AccountMenuItem = readonly [
  href: string,
  title: string,
  icon: ComponentType<SVGProps<SVGSVGElement>>,
];

export type AccountMenuItems = readonly AccountMenuItem[];

export type AccountMenuItemsResolver = (
  user: User,
) => AccountMenuItems | Promise<AccountMenuItems>;
