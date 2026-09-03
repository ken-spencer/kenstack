import { describe, expect, it, vi } from "vitest";
import * as z from "zod";
import { getTableColumns, SQL } from "drizzle-orm";
import { integer, pgTable, PgDialect } from "drizzle-orm/pg-core";

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
  field,
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
  const behaviorOnlyServerField = defineServerField(configurableField, {
    preSave: async ({ value }) => ({ status: "success" as const, value }),
  });

  it("creates a configurable field with its declared options", () => {
    const configured = configurableField({
      default: "example" as const,
      label: "Example" as const,
      list: true,
    });

    expect(configured).toMatchObject({
      __kenstackField: true,
      default: "example",
      kind: "test-value",
      label: "Example",
      list: true,
    });
  });

  it("keeps field-specific options on the fields that own them", () => {
    const configuredText = textField();
    const configuredImage = imageField({ selectVariant: "original" });
    expect(numberField().default).toBeNull();
    expect(numberField().zod.parse("")).toBeNull();
    expect(numberField().zod.parse(null)).toBeNull();
    expect(numberField().zod.parse("12")).toBe(12);
    expect("component" in imageField()).toBe(false);
    expect(configuredImage.selectVariant).toBe("original");
    expect(configuredText).not.toHaveProperty("checked");
    expect(configuredText).not.toHaveProperty("unchecked");

    const semanticText = { ...textField(), kind: "article-title" } as const;
    expect(semanticText).toMatchObject({ filterKind: "text" });
    expect(fileField({ accept: ["application/pdf"] }).accept).toEqual([
      "application/pdf",
    ]);
    expect(mediaListField({ uploadMaxSize: 1024 }).uploadMaxSize).toBe(1024);
  });

  it("keeps invariant input behavior on its field definition", () => {
    const combobox = comboboxField({
      emptyMessage: "No results.",
      options: [{ label: "Example", value: "example" }],
      showClear: false,
    });
    const number = numberField({ max: 12, min: 1, step: 1 });

    expect(combobox).toMatchObject({
      emptyMessage: "No results.",
      showClear: false,
    });
    expect(number).toMatchObject({ max: 12, min: 1, step: 1 });
  });

  it("builds an option-dependent schema once per configured field", () => {
    let schemaBuilds = 0;
    const optionField = defineField({
      kind: "test-options",
      options: true,
      default: "",
      zod: ({ options }) => {
        schemaBuilds += 1;
        return z.enum(["", ...options.map(({ value }) => value)]);
      },
    });

    expect(schemaBuilds).toBe(0);
    const configured = optionField({
      options: [{ label: "Example", value: "example" }],
    });
    expect(schemaBuilds).toBe(1);

    expect(configured.zod.parse("example")).toBe("example");
    expect(configured.zod.parse("")).toBe("");
    expect(schemaBuilds).toBe(1);
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
    const explicitMultiple = relationshipField({ mode: "multiple" });
    const single = relationshipField({ mode: "single" });

    expect(multiple).toMatchObject({ default: [], kind: "relationship" });
    expect(explicitMultiple).toMatchObject({
      default: [],
      kind: "relationship",
      mode: "multiple",
    });
    expect(single).toMatchObject({
      default: null,
      kind: "relationship",
      mode: "single",
    });
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

    expect(toggle).toMatchObject({
      checked: "combo",
      default: "item",
      kind: "toggle",
      unchecked: "item",
    });
    expect("options" in toggle).toBe(false);
    expect(toggle.zod.safeParse("combo").success).toBe(true);
    expect(toggle.zod.safeParse("item").success).toBe(true);
    expect(toggle.zod.safeParse("other").success).toBe(false);
    expect(toggle.zod.safeParse(toggle.default).success).toBe(true);
    expect(checkbox).toMatchObject({
      checked: 1,
      default: 1,
      kind: "checkbox",
      unchecked: 0,
    });
    expect(checkbox.zod.safeParse(checkbox.default).success).toBe(true);
  });

  it("rejects identical checked and unchecked values", () => {
    expect(() =>
      toggleField({ checked: "same", unchecked: "same" }),
    ).toThrowError(
      'Field kind "toggle" requires different checked and unchecked values.',
    );
  });

  it("rejects filtering on checked values that no filter can query", () => {
    expect(() =>
      checkboxField({
        checked: 1,
        unchecked: 0,
        // @ts-expect-error Only string or boolean pairs can enable filtering.
        filter: true,
      }),
    ).toThrowError(
      'Field kind "checkbox" supports filtering only for string or boolean checked values.',
    );
  });

  it("does not enable filtering from a field capability", () => {
    expect(checkboxListField({ options: [] }).filter).toBeUndefined();
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

  it("normalizes field policy defaults when defining a field map", () => {
    const fields = defineFields({
      fields: { slug: slugField({ list: true }), title: textField() },
    });

    expect(fields.title.searchable).toBe(false);
    expect(fields.title.revisions).toBe(true);
  });

  it("derives bare empty-container defaults from their schemas", () => {
    const editableItemSchema = z.object({ value: z.coerce.number() });
    const editableItemsSchema = z.array(editableItemSchema);
    const editableItems = field({
      default: [],
      kind: "editable-items",
      zod: editableItemsSchema,
    });
    const parsedRecordSchema = z.preprocess(
      (value) => value,
      z.record(z.string(), z.object({ label: z.string() })),
    );
    const parsedRecord = field({
      default: {},
      kind: "parsed-record",
      zod: parsedRecordSchema,
    });

    expect(editableItems.default).toEqual([]);
    expect(parsedRecord.default).toEqual({});
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

  it("derives an omitted one-off kind from its field name", () => {
    const oneOffFields = defineFields({
      fields: {
        summary: field({ default: "", zod: z.string() }),
      },
    });

    expect(oneOffFields.summary.kind).toBe("summary");
  });

  it("exposes all server options through the configurable factory", () => {
    const registration = configurableServerField({
      load: async ({ tableId }) => tableId,
      preSave: async ({ value }) => ({ status: "success", value }),
    });
    const fields = defineFields({ fields: { value: configurableField() } });
    const configured = registration(fields.value);

    expect(configured.load).toBeTypeOf("function");
    expect(configured.preSave).toBeTypeOf("function");
  });

  it("uses the isomorphic schema when the server does not replace it", () => {
    const fields = defineFields({ fields: { value: configurableField() } });
    const configured = behaviorOnlyServerField()(fields.value);

    expect("zod" in configured).toBe(false);
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

    expect(configured).toMatchObject({
      default: "2026-08-01",
      kind: "date",
      label: "Opening date",
    });
    expect(server.zod?.parse("")).toBeNull();
  });

  it("loads the image variant owned by the field definition", () => {
    const records = pgTable("image_variant_records", {
      id: integer().primaryKey(),
      imageId: integer("image_id"),
    });
    const columns = getTableColumns(records);
    const fields = defineFields({
      fields: { image: imageField({ selectVariant: "original" }) },
    });
    const resolved = resolveServerFields(fields);
    const selection = resolved.image.select?.({
      column: columns.imageId,
      columns,
      field: resolved.image,
      key: "image",
    });

    expect(selection).toBeInstanceOf(SQL);
    if (!(selection instanceof SQL)) {
      throw new Error("Expected the image selection to produce SQL");
    }
    const query = new PgDialect().sqlToQuery(selection).sql;
    expect(query).not.toContain("->'square'");
    expect(query).toContain("in ('raster', 'svg')");
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
