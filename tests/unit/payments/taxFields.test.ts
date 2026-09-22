import { expect, it } from "vitest";
import { fields } from "@kenstack/payments/taxes/fields";

const rate = {
  id: "aaaaaaaaaaaaaaa",
  code: " gst ",
  name: "Goods and Services Tax",
  ratePercent: "5",
  categories: ["admission"],
};

it("uses each host's categories for tax validation without sharing configuration", () => {
  const first = fields({ admission: "Admission" }).rates.zod;
  const second = fields({ lodging: "Lodging" }).rates.zod;
  expect(first.parse([rate])[0]).toMatchObject({
    code: "GST",
    categories: ["admission"],
  });
  expect(second.safeParse([rate]).success).toBe(false);
  expect(second.safeParse([{ ...rate, categories: ["lodging"] }]).success).toBe(
    true,
  );
  expect(first.safeParse([{ ...rate, categories: ["lodging"] }]).success).toBe(
    false,
  );
  expect(
    first.safeParse([{ ...rate, categories: ["privateScreening"] }]).success,
  ).toBe(false);
});

it("preserves unique tax IDs and normalized codes within a region", () => {
  const schema = fields({ admission: "Admission" }).rates.zod;
  expect(schema.safeParse([rate, { ...rate, code: "PST" }]).success).toBe(
    false,
  );
  expect(
    schema.safeParse([rate, { ...rate, id: "bbbbbbbbbbbbbbb", code: "GST" }])
      .success,
  ).toBe(false);
  expect(
    schema.parse([rate, { ...rate, id: "bbbbbbbbbbbbbbb", code: "PST" }]),
  ).toHaveLength(2);
});

it("preserves rate precision and bounds", () => {
  const schema = fields({ admission: "Admission" }).rates.zod;
  expect(
    schema.parse([{ ...rate, ratePercent: "7.1234" }])[0].ratePercent,
  ).toBe("7.1234");
  expect(schema.safeParse([{ ...rate, ratePercent: "7.12345" }]).success).toBe(
    false,
  );
  expect(schema.safeParse([{ ...rate, ratePercent: "101" }]).success).toBe(
    false,
  );
});
