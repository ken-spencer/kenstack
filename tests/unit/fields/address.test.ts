import { describe, expect, it } from "vitest";

import { createAddressSchema } from "@kenstack/fields/address";
import { phone } from "@kenstack/fields/phone";

const address = {
  countryCode: "CA",
  addressLine1: "123 Baker Street",
  addressLine2: "",
  locality: "Nelson",
  regionCode: "BC",
  postalCode: "V1L 4G3",
};

describe.each([false, true])("address (required=%s)", (required) => {
  const schema = createAddressSchema({ required });

  it("normalizes a supplied postal code", () => {
    expect(
      schema.parse({ ...address, postalCode: "  v1l   4g3  " }).postalCode,
    ).toBe("V1L 4G3");
  });

  it("rejects a postal code that does not match the country", () => {
    expect(schema.safeParse({ ...address, postalCode: "12345" }).success).toBe(
      false,
    );
  });
});

it.each([
  "addressLine1",
  "countryCode",
  "locality",
  "postalCode",
  "regionCode",
] as const)("requires %s when the address is required", (field) => {
  expect(
    createAddressSchema({ required: true }).safeParse({
      ...address,
      [field]: "",
    }).success,
  ).toBe(false);
});

it("rejects a phone number that is not a number", () => {
  expect(phone.safeParse("call me later").success).toBe(false);
});
