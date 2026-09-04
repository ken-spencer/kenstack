import { expectTypeOf } from "vitest";
import * as z from "zod";
import type { ComponentProps } from "react";
import { SQL } from "drizzle-orm";
import { integer, pgTable, text } from "drizzle-orm/pg-core";

import { defineFields, type DefinedFields } from "@kenstack/admin/fields";
import { defineRelationship, defineTable } from "@kenstack/admin/table";
import type { SelectedImage } from "@kenstack/db/queries";
import {
  booleanField,
  checkboxField,
  createDefaultValues,
  dateField,
  defineField,
  field,
  getFieldNames,
  imageField,
  moneyField,
  numberField,
  relationshipField,
  selectField,
  slugField,
  textField,
  toggleField,
} from "@kenstack/fields";
import { defineFormFields } from "@kenstack/fields/formFields";
import {
  defineServerField,
  resolveServerFields,
  serverField,
  type ServerFieldKinds,
} from "@kenstack/fields/server";
import {
  defineRelationships,
  relationshipName,
} from "@kenstack/fields/relationship/relationships";

const configurableField = defineField({
  default: "",
  zod: z.string(),
  kind: "test-value",
});
const stockField = field({
  default: 0,
  kind: "stock-value",
  zod: z.number(),
});
const stockFields = defineFields({
  fields: { name: textField(), stock: stockField },
});
const stockFieldKinds = [serverField(stockField, () => ({}))];

// TypeScript compiles this block; Vitest does not treat these contracts as runtime tests.
if (false) {
  const fields = defineFields({
    fields: { title: textField(), visible: booleanField() },
  });
  const names = getFieldNames(fields);
  const bareFields = {
    title: {
      default: "",
      kind: "text",
      revisions: false,
      searchable: false,
      zod: z.string(),
    },
  } as const;
  type BareFormFields = ReturnType<typeof defineFormFields<typeof bareFields>>;

  expectTypeOf(names).toEqualTypeOf<("title" | "visible")[]>();
  expectTypeOf(bareFields).toMatchTypeOf<DefinedFields>();
  expectTypeOf<
    Extract<keyof ComponentProps<BareFormFields["title"]>, "label">
  >().toEqualTypeOf<never>();
  // @ts-expect-error Field maps cannot use numeric keys.
  getFieldNames({ 1: textField() });

  const optionalOptions: { default?: string; label?: string } = {};
  const configured = configurableField(optionalOptions);
  const configuredLiteral = configurableField({
    default: "example" as const,
    label: "Example" as const,
  });
  expectTypeOf(configurableField().default).toEqualTypeOf<string>();
  expectTypeOf(configured.default).toEqualTypeOf<string>();
  expectTypeOf(configured.kind).toEqualTypeOf<"test-value">();
  expectTypeOf(configuredLiteral.default).toEqualTypeOf<string>();
  expectTypeOf(configuredLiteral.kind).toEqualTypeOf<"test-value">();
  expectTypeOf(configuredLiteral.label).toEqualTypeOf<"Example">();
  expectTypeOf(slugField({ list: true }).default).toEqualTypeOf<string>();

  const nullableNumber = numberField({
    default: null,
    zod: z.number().nullable(),
  });
  const configuredMoney = moneyField({ default: 250 as const });
  const configuredSelect = selectField({
    options: [{ label: "Example", value: "example" }],
  });
  const configuredText = textField();
  expectTypeOf(numberField().default).toEqualTypeOf<null>();
  expectTypeOf(nullableNumber.default).toEqualTypeOf<number | null>();
  expectTypeOf(moneyField().default).toEqualTypeOf<null>();
  expectTypeOf(configuredMoney.default).toEqualTypeOf<number | null>();
  expectTypeOf(imageField().default).toEqualTypeOf<null>();
  expectTypeOf(configuredSelect.default).toEqualTypeOf<string>();
  expectTypeOf<
    "checked" extends keyof typeof configuredText ? true : false
  >().toEqualTypeOf<false>();
  expectTypeOf<
    "unchecked" extends keyof typeof configuredText ? true : false
  >().toEqualTypeOf<false>();
  void configuredText;

  // @ts-expect-error Select fields require choices.
  selectField();
  // @ts-expect-error Base defaults must match the base schema or the null sentinel.
  defineField({ default: 0, kind: "broken", zod: z.string() });
  // @ts-expect-error Upload options belong to upload-capable fields.
  textField({ accept: ["text/plain"] });
  // @ts-expect-error Image uploads do not consume per-field upload options.
  imageField({ uploadMaxSize: 1024 });
  // @ts-expect-error Image selection variants are constrained to supported crops.
  imageField({ selectVariant: "wide" });
  // @ts-expect-error File replacement copy is owned by the built-in editor.
  fileField({ replacementLabel: "Replace file" });
  // @ts-expect-error Text inputs do not own combobox behavior.
  textField({ emptyMessage: "No results." });
  // @ts-expect-error Text inputs do not own numeric bounds.
  textField({ min: 1 });
  const multipleRelationship = relationshipField();
  const singleRelationship = relationshipField({ mode: "single" });
  expectTypeOf(multipleRelationship.default).toEqualTypeOf<
    { id: number; label: string }[]
  >();
  expectTypeOf(singleRelationship.default).toEqualTypeOf<null>();
  // @ts-expect-error Relationship cardinality is a closed definition option.
  relationshipField({ mode: "one" });
  // @ts-expect-error Single relationships do not accept many-valued defaults.
  relationshipField({ mode: "single", default: [] });

  const toggle = toggleField({ checked: "combo", unchecked: "item" });
  const checkbox = checkboxField({ checked: 1, default: 1, unchecked: 0 });
  expectTypeOf(toggle.default).toEqualTypeOf<"combo" | "item">();
  expectTypeOf(checkbox.default).toEqualTypeOf<0 | 1>();
  // @ts-expect-error Checked values configure only checked control fields.
  textField({ checked: true, unchecked: false });
  // @ts-expect-error Input options configure only fields that declare them.
  textField({ options: [{ label: "Example", value: "example" }] });
  toggleField({
    checked: "combo",
    unchecked: "item",
    // @ts-expect-error Checked fields derive filter choices from their two values.
    options: [{ label: "Combo", value: "combo" }],
  });

  const custom = field({
    default: null,
    kind: "module-json",
    zod: z.string().nullable(),
  });
  const customFields = defineFields({ fields: { value: custom } });
  expectTypeOf(custom.default).toEqualTypeOf<null>();
  expectTypeOf<z.output<typeof custom.zod>>().toEqualTypeOf<string | null>();
  expectTypeOf(createDefaultValues(customFields).value).toEqualTypeOf<null>();

  // @ts-expect-error An empty object cannot seed a schema with required entries.
  field({
    default: {},
    kind: "module-json",
    zod: z.object({ name: z.string() }),
  });
  // @ts-expect-error An empty array cannot seed a non-empty tuple schema.
  field({ default: [], kind: "module-json", zod: z.tuple([z.string()]) });

  const semantic = field({
    default: "",
    kind: "module-value",
    zod: z.string(),
  });
  expectTypeOf(semantic.kind).toEqualTypeOf<"module-value">();

  const policyFields = defineFields({
    fields: { slug: slugField({ list: true }), title: textField() },
  });
  expectTypeOf<
    z.output<typeof policyFields.slug.zod>
  >().toEqualTypeOf<string>();
  void policyFields;

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
  expectTypeOf(editableItems.default).toEqualTypeOf<
    z.input<typeof editableItemsSchema>
  >();
  expectTypeOf(parsedRecord.default).toEqualTypeOf<
    z.output<typeof parsedRecordSchema>
  >();

  const configurableServerField = defineServerField(configurableField, {
    zod: z.coerce.number(),
  });
  const configurableFields = defineFields({
    fields: { value: configurableField() },
  });
  const registration = serverField(configurableField(), () => ({
    async save({ value }) {
      expectTypeOf(value).toEqualTypeOf<string>();
      return value;
    },
  }));
  resolveServerFields(configurableFields, { fieldKinds: [registration] });
  configurableServerField({
    preSave: async ({ value }) => {
      expectTypeOf(value).toEqualTypeOf<number>();
      return { status: "success", value };
    },
  });
  // @ts-expect-error serverField pairs behavior with a configured field, not its factory.
  serverField(configurableField, () => ({}));
  resolveServerFields(configurableFields, {
    // @ts-expect-error Resolver registrations must be created by a server-field helper.
    fieldKinds: [() => ({})],
  });
  resolveServerFields(configurableFields, {
    // @ts-expect-error Raw server behavior is not a field-kind registration.
    fieldKinds: [{}],
  });
  const rawFieldKinds = [
    // @ts-expect-error ServerFieldKinds accepts only branded resolver registrations.
    {},
  ] satisfies ServerFieldKinds<typeof configurableFields>;
  void rawFieldKinds;
  const otherField = defineField({
    default: "",
    kind: "other-value",
    zod: z.string(),
  });
  const otherRegistration = serverField(otherField(), () => ({}));
  resolveServerFields(configurableFields, {
    // @ts-expect-error Registrations must preserve their semantic kind.
    fieldKinds: [otherRegistration],
  });
  // @ts-expect-error The field factory owns its implementation kind.
  configurableField({ kind: "other-value" });
  // @ts-expect-error The server-field factory owns its implementation kind.
  configurableServerField({ kind: "other-value" });

  const oneOffFields = defineFields({
    fields: { summary: field({ default: "", zod: z.string() }) },
  });
  expectTypeOf(oneOffFields.summary.kind).toEqualTypeOf<"summary">();

  const configuredDate = dateField({ default: "2026-08-01" as const });
  expectTypeOf(configuredDate.kind).toEqualTypeOf<"date">();
  expectTypeOf(configuredDate.default).toEqualTypeOf<string>();

  const imageFields = resolveServerFields(
    defineFields({ fields: { image: imageField() } }),
  );
  expectTypeOf<
    ReturnType<NonNullable<typeof imageFields.image.select>>
  >().toEqualTypeOf<SQL<SelectedImage | null> | undefined>();
  void imageFields;

  const articles = Object.assign(
    defineTable({ name: "relationship_type_articles", columns: {} }),
    { [relationshipName]: "article" as const },
  );
  const topics = Object.assign(
    defineTable({
      name: "relationship_type_topics",
      columns: { name: text("name").notNull() },
    }),
    { [relationshipName]: "topic" as const },
  );
  const articleTopics = defineRelationship({
    name: "relationship_type_article_topics",
    from: { name: "article", table: articles },
    to: { name: "topic", table: topics },
  });
  const unrelatedThroughTable = defineTable({
    name: "relationship_type_unrelated",
    columns: { relationship: text("relationship").notNull() },
  });
  defineRelationships({
    topics: {
      from: articles,
      // @ts-expect-error Convention-derived columns must exist on the through table.
      through: unrelatedThroughTable,
      to: topics,
    },
  });
  defineRelationships({
    topics: {
      from: articles,
      through: articleTopics,
      to: topics,
      // @ts-expect-error Explicit column overrides must be Drizzle columns.
      fromColumn: "articleId",
    },
  });
  const overrideThrough = pgTable("relationship_type_overrides", {
    articleReference: integer("article_reference").notNull(),
    topicReference: integer("topic_reference").notNull(),
    relationship: text("relationship").notNull(),
  });
  defineRelationships({
    topics: {
      from: articles,
      // @ts-expect-error Column overrides must belong to the through table.
      fromColumn: articles.id,
      through: overrideThrough,
      to: topics,
      toColumn: overrideThrough.topicReference,
    },
  });

  resolveServerFields(stockFields, { fieldKinds: stockFieldKinds });
  // @ts-expect-error A nonempty registry type requires the matching value argument.
  resolveServerFields<typeof stockFields, typeof stockFieldKinds>(stockFields);
}

// A declared field keeps its own type in superRefine even when it shares a
// name with a generated field; only undeclared generated values are optional.
defineFields({
  fields: {
    visibility: booleanField(),
    title: textField(),
  },
  superRefine(values) {
    expectTypeOf(values.visibility).toEqualTypeOf<boolean>();
    expectTypeOf(values.publishedAt).toEqualTypeOf<string | undefined>();
  },
});
