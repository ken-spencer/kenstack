import {
  CircleCheck,
  PencilLine,
  createLucideIcon,
  type LucideIcon,
} from "lucide-react";

import {
  visibilityOptions,
  type VisibilityValue,
} from "@kenstack/admin/lib/visibility";

const ListOff = createLucideIcon("ListOff", [
  ["path", { d: "M8 6h7", key: "1hgpcc" }],
  ["path", { d: "M8 12h4", key: "12d43d" }],
  ["path", { d: "M8 18h10", key: "fzmxk4" }],
  ["path", { d: "M3 6h.01", key: "1v6s1a" }],
  ["path", { d: "M3 12h.01", key: "13co06" }],
  ["path", { d: "M3 18h.01", key: "1yght1" }],
  ["path", { d: "m2 2 20 20", key: "1ooewy" }],
]);

const visibilityIcons = {
  draft: PencilLine,
  published: CircleCheck,
  unlisted: ListOff,
} satisfies Record<VisibilityValue, LucideIcon>;

export const visibilityStatusOptions = visibilityOptions.map(
  ([value, label]) => ({
    value,
    label,
    Icon: visibilityIcons[value],
  }),
);
