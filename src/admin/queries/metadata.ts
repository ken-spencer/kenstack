import { draftMode } from "next/headers";

import { buildMetadata } from "../metadata";

export function createMetadataLoader(
  load: (
    value: string,
    options: { draft: boolean },
  ) => Promise<Parameters<typeof buildMetadata>[0]>,
  { field = "slug" }: { field?: string } = {},
) {
  return async function generateMetadata({
    params,
  }: {
    params: Promise<Record<string, string>>;
  }) {
    const [routeParams, { isEnabled: draft }] = await Promise.all([
      params,
      draftMode(),
    ]);

    return buildMetadata(await load(routeParams[field], { draft }));
  };
}
