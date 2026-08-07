import { describe, expect, it } from "vitest";

import {
  createDefaultListQueryState,
  createListSearchSchema,
  listQuerySearchParams,
  searchParamsToRecord,
} from "@kenstack/list/querySchema";

const filters = [
  {
    name: "kind",
    label: "Kind",
    kind: "enum" as const,
    options: [
      { label: "Item", value: "-item" },
      { label: "Combo", value: "+combo" },
      { label: "Other", value: "other" },
    ],
  },
];

describe("option filter search params", () => {
  it("round-trips option values that begin with a state prefix character", () => {
    const defaults = createDefaultListQueryState([]);
    const query = {
      ...defaults,
      filters: { kind: { "-item": "+", "+combo": "-" } },
    };

    const params = listQuerySearchParams(query, { defaults, sort: [] });
    const parsed = createListSearchSchema({
      defaults,
      filters,
      sort: [],
    }).parse(searchParamsToRecord(params));

    expect(parsed.filters).toEqual({ kind: { "-item": "+", "+combo": "-" } });
  });

  it("parses bare option values from older links as included", () => {
    const defaults = createDefaultListQueryState([]);
    const parsed = createListSearchSchema({
      defaults,
      filters,
      sort: [],
    }).parse({ kind: "other" });

    expect(parsed.filters).toEqual({ kind: { other: "+" } });
  });
});
