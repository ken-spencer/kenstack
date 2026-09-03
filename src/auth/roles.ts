/* Public default role registry for host applications without custom roles. */

const roles = {
  admin: {
    label: "Administrator",
  },
} as const satisfies Record<string, { label: string }>;

export default roles;
