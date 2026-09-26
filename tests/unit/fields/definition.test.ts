import { describe, expect, it, vi } from "vitest";
import * as z from "zod";

vi.mock("server-only", () => ({}));

import {
  booleanField,
  checkboxField,
  checkboxListField,
  comboboxField,
  dateField,
  dateTimeField,
  defineField,
  emailField,
  fileField,
  imageField,
  imageSchema,
  imageValueSchema,
  isSingleRelationshipField,
  markdownField,
  mediaListField,
  mediaListSchema,
  moneyField,
  numberField,
  phoneField,
  radioButtonField,
  relationshipField,
  selectField,
  slugField,
  tagField,
  textField,
  textareaField,
  toggleField,
  urlField,
} from "@kenstack/fields";
import {
  defineServerField,
  resolveServerFields,
  serverField,
} from "@kenstack/fields/server";
import { defineFields } from "@kenstack/admin/fields";
import { getDisplayValues } from "@kenstack/admin/pageEditor/display";
import { dateField as dateServerField } from "@kenstack/fields/date/server";

describe("field definitions", () => {
  const configurableField = defineField({
    default: "",
    zod: z.string(),
    kind: "test-value",
  });
  const configurableServerField = defineServerField(configurableField, {
    zod: z.coerce.number(),
  });

  it("keeps field-specific options on the fields that own them", () => {
    expect(numberField().default).toBeNull();
    expect(numberField().zod.parse("")).toBeNull();
    expect(numberField().zod.parse(null)).toBeNull();
    expect(numberField().zod.parse("12")).toBe(12);
  });

  it("builds an option-dependent schema once per configured field", () => {
    const optionField = defineField({
      kind: "test-options",
      options: true,
      default: "",
      zod: ({ options }) => z.enum(["", ...options.map(({ value }) => value)]),
    });

    const configured = optionField({
      options: [{ label: "Example", value: "example" }],
    });

    expect(configured.zod.parse("example")).toBe("example");
    expect(configured.zod.parse("")).toBe("");
  });

  it("gives optional reusable fields a valid empty default", () => {
    const fields = [
      booleanField(),
      checkboxListField({ options: [] }),
      comboboxField({ options: [] }),
      dateField(),
      dateTimeField(),
      fileField(),
      imageField(),
      markdownField(),
      mediaListField(),
      moneyField(),
      numberField(),
      phoneField(),
      radioButtonField({ options: [] }),
      relationshipField(),
      selectField({ options: [] }),
      tagField(),
      textField(),
      textareaField(),
      urlField(),
    ];

    for (const field of fields) {
      expect(field.zod.safeParse(field.default).success, field.kind).toBe(true);
    }
  });

  it("normalizes optional URLs before validation", () => {
    const schema = urlField().zod;

    expect(schema.parse("   ")).toBe("");
    expect(schema.parse(" https://example.com/path ")).toBe(
      "https://example.com/path",
    );
    expect(schema.safeParse("not a URL").success).toBe(false);
  });

  it("uses the same image value rules for single images and media lists", () => {
    const image = {
      height: 600,
      url: "/image.webp",
      width: 800,
    };

    expect(imageValueSchema.parse(image)).toEqual(image);
    expect(imageSchema.parse(image)).toEqual(image);
    expect(mediaListSchema.parse([image])).toEqual([image]);

    const incompleteImage = { url: "/image.webp" };
    expect(imageValueSchema.safeParse(incompleteImage).success).toBe(false);
    expect(imageSchema.safeParse(incompleteImage).success).toBe(false);
    expect(mediaListSchema.safeParse([incompleteImage]).success).toBe(false);

    const file = {
      filename: "document.pdf",
      kind: "file",
      url: "/document.pdf",
    };
    expect(imageSchema.safeParse(file).success).toBe(false);
    expect(mediaListSchema.parse([file])).toEqual([file]);
  });

  it("defines relationship cardinality on the field", () => {
    const multiple = relationshipField();
    const single = relationshipField({ mode: "single" });

    expect(isSingleRelationshipField(multiple)).toBe(false);
    expect(isSingleRelationshipField(single)).toBe(true);
  });

  it("maps checked controls to their declared values", () => {
    const toggle = toggleField({ checked: "combo", unchecked: "item" });
    const checkbox = checkboxField({
      checked: 1,
      default: 1,
      unchecked: 0,
    });

    expect("options" in toggle).toBe(false);
    expect(toggle.zod.safeParse("combo").success).toBe(true);
    expect(toggle.zod.safeParse("item").success).toBe(true);
    expect(toggle.zod.safeParse("other").success).toBe(false);
    expect(toggle.zod.safeParse(toggle.default).success).toBe(true);
    expect(checkbox.zod.safeParse(checkbox.default).success).toBe(true);
  });

  it("rejects identical checked and unchecked values", () => {
    expect(() =>
      toggleField({ checked: "same", unchecked: "same" }),
    ).toThrowError();
  });

  it("rejects filtering on checked values that no filter can query", () => {
    expect(() =>
      checkboxField({
        checked: 1,
        unchecked: 0,
        // @ts-expect-error Only string or boolean pairs can enable filtering.
        filter: true,
      }),
    ).toThrowError();
  });

  it("keeps email and slug fields required by default", () => {
    expect(emailField().zod.safeParse(emailField().default).success).toBe(
      false,
    );
    expect(slugField().zod.safeParse(slugField().default).success).toBe(false);
  });

  it("leaves empty markdown unchanged in page-editor display values", async () => {
    const fields = defineFields({ fields: { body: markdownField() } });

    await expect(getDisplayValues(fields, { body: "" })).resolves.toEqual({
      body: "",
    });
  });

  it("configures a server schema from the field factory", () => {
    const fields = defineFields({ fields: { value: configurableField() } });
    const configured = configurableServerField()(fields.value);
    expect(configured.zod?.parse("4")).toBe(4);
  });

  it("keeps factory-owned kinds fixed", () => {
    // @ts-expect-error The field factory owns its implementation kind.
    const configured = configurableField({ kind: "other-value" });
    // @ts-expect-error The server-field factory owns its implementation kind.
    configurableServerField({ kind: "other-value" });

    expect(configured.kind).toBe("test-value");
  });

  it("lets a custom kind registration override built-in server behavior", () => {
    const fields = defineFields({ fields: { date: dateField() } });
    const resolved = resolveServerFields(fields, {
      fieldKinds: [serverField(dateField(), () => ({ zod: z.string() }))],
    });

    expect(resolved.date.zod.parse("")).toBe("");
  });

  it("configures the colocated date field on both sides", () => {
    const configured = dateField({
      default: "2026-08-01" as const,
      label: "Opening date" as const,
    });
    const fields = defineFields({ fields: { date: configured } });
    const server = dateServerField()(fields.date);

    expect(server.zod?.parse("")).toBeNull();
  });

  it("keeps configured field validation authoritative on the server", () => {
    const fields = defineFields({
      fields: {
        date: dateField({ zod: z.literal("2026-08-01") }),
      },
    });
    const resolved = resolveServerFields(fields);

    expect(resolved.date.zod.safeParse("2026-08-02").success).toBe(false);
    expect(resolved.date.zod.parse("2026-08-01")).toBe("2026-08-01");
  });
});
