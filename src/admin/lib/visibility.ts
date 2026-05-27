export const visibilityValues = ["draft", "published", "unlisted"] as const;

export type VisibilityValue = (typeof visibilityValues)[number];

export type VisibilityOption = readonly [
  value: VisibilityValue,
  label: string,
  description?: string,
];

export const visibilityOptions: readonly VisibilityOption[] = [
  ["draft", "Draft"],
  ["published", "Published"],
  ["unlisted", "Unlisted"],
];
