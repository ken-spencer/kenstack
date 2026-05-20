import type { ComponentType, SVGProps } from "react";

export type AccountMenuItem = readonly [
  href: string,
  title: string,
  icon: ComponentType<SVGProps<SVGSVGElement>>,
];

export type AccountMenuItems = readonly AccountMenuItem[];
