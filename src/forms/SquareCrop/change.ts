import isEqual from "lodash-es/isEqual";

import type { SquareCrop } from "@kenstack/db/tables/media/types";

export type SquareCropChangeValue = {
  squareCrop?: SquareCrop | null;
  squareCropChanged?: true;
  squareCropDefault?: SquareCrop | null;
};

export function applySquareCropChange<TValue extends SquareCropChangeValue>(
  value: TValue,
  squareCrop: SquareCrop | null,
) {
  const squareCropDefault = value.squareCropChanged
    ? (value.squareCropDefault ?? null)
    : (value.squareCrop ?? null);

  if (isEqual(squareCrop, squareCropDefault)) {
    const unchangedValue = { ...value, squareCrop };
    delete unchangedValue.squareCropChanged;
    delete unchangedValue.squareCropDefault;
    return unchangedValue;
  }

  return {
    ...value,
    squareCrop,
    squareCropChanged: true as const,
    squareCropDefault,
  };
}
