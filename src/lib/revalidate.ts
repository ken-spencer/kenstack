import { revalidateTag } from "next/cache";

export type RevalidateTagProfile = string | { expire?: number };

type RevalidateTagCallback<TRow> = {
  bivarianceHack(row: TRow): string;
}["bivarianceHack"];

export type RevalidateTagRule<TRow> =
  | string
  | RevalidateTagCallback<TRow>
  | readonly [string | RevalidateTagCallback<TRow>, RevalidateTagProfile];

export function revalidator<TRow>(
  rules: readonly RevalidateTagRule<TRow>[] | undefined,
  row?: TRow,
) {
  for (const rule of rules ?? []) {
    const tag = Array.isArray(rule) ? rule[0] : rule;
    const profile = Array.isArray(rule) ? rule[1] : { expire: 0 };

    if (typeof tag === "string") {
      revalidateTag(tag, profile);
    } else if (row !== undefined) {
      revalidateTag(tag(row), profile);
    }
  }
}
