// Shared record and list tags for admin queries, public module reads, and mutations.
export function adminLoadCacheTag(name: string, target: number | "single") {
  return `admin-load:${name}:${target}`;
}

export function adminListCacheTag(name: string) {
  return `admin-list:${name}`;
}
