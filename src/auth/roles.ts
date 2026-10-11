/* Public default role registry for host applications without custom roles. A role's label is its key
 * in start case unless it gives one. */

const roles = {
  admin: {
    label: "Administrator",
  },
} as const satisfies Record<string, { label?: string }>;

export default roles;
