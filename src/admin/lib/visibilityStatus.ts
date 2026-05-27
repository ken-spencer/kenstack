import {
  CircleCheck,
  EyeOff,
  PencilLine,
  type LucideIcon,
} from "lucide-react";

import {
  visibilityOptions,
  type VisibilityValue,
} from "@kenstack/admin/lib/visibility";

const visibilityIcons = {
  draft: PencilLine,
  published: CircleCheck,
  unlisted: EyeOff,
} satisfies Record<VisibilityValue, LucideIcon>;

export const visibilityStatusOptions = visibilityOptions.map(
  ([value, label]) => ({
    value,
    label,
    Icon: visibilityIcons[value],
  }),
);
