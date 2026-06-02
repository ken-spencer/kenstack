export const visibilityValues = ["draft", "published", "unlisted"] as const;

export type VisibilityValue = (typeof visibilityValues)[number];

export type VisibilityOption = {
  description?: string;
  label: string;
  value: VisibilityValue;
};

export const visibilityOptions: readonly VisibilityOption[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "unlisted", label: "Unlisted" },
];
