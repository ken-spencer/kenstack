import { type CheckboxListOptions } from "@kenstack/forms/CheckboxList";
const roles = [
  ["admin", "Administrator"],
] as const satisfies CheckboxListOptions;

export type Role = (typeof roles)[number][0];

export default roles;
