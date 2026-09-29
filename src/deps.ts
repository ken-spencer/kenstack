/*
 * Host dependencies each site supplies through the `@app/deps` binding. Client components import it,
 * so it holds only browser-safe values.
 */

export function createDeps({
  // IANA time zone name for timestamps with no venue zone.
  defaultTimeZone = "America/Vancouver",
}: {
  defaultTimeZone?: string;
} = {}) {
  return { defaultTimeZone };
}
