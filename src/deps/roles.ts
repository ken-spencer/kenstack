/* Default @app/deps/roles boundary for standalone Kenstack compilation. Do not add exports unrelated to this boundary. */

import { type CheckboxListOptions } from "@kenstack/forms/CheckboxList";
const roles = [
  { value: "admin", label: "Administrator" },
] as const satisfies CheckboxListOptions;

export type Role = (typeof roles)[number]["value"];

export default roles;
