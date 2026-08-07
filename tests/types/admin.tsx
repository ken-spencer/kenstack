import { expectTypeOf } from "vitest";
import * as z from "zod";
import { integer, pgTable, text } from "drizzle-orm/pg-core";
import type { ComponentProps } from "react";

import { defineClient, defineOneToOneClient } from "@kenstack/admin/client";
import { defineFields } from "@kenstack/admin/fields";
import {
  resolveOneToOneDefinition,
  withOneToOneSelectionField,
} from "@kenstack/admin/internal/oneToOne";
import { TextEdit } from "@kenstack/admin/pageEditor/TextEdit";
import type { SelectedImage, SelectedMedia } from "@kenstack/db/tables";
import {
  booleanField,
  configurable,
  field,
  fileField,
  imageField,
  moneyField,
  numberField,
  relationshipField,
  selectField,
  textField,
} from "@kenstack/fields";
import { defineFormFields } from "@kenstack/fields/formFields";
import { resolveServerFields } from "@kenstack/fields/server";
import { saveRecord } from "@kenstack/records/save";

const Component = () => null;
const fields = defineFields({
  fields: {
    title: textField(),
    value: field({
      default: "",
      kind: "client-value",
      zod: z.string(),
    }),
  },
});
const records = pgTable("type_test_records", {
  id: integer().primaryKey(),
  second: text(),
  title: text(),
});
const projectedFields = resolveServerFields(
  defineFields({ fields: { title: textField() } }),
);

// TypeScript compiles this block; Vitest does not treat these contracts as runtime tests.
if (false) {
  <TextEdit name="title" />;
  <TextEdit name="title" tag="blockquote" cite="https://example.com" />;
  // @ts-expect-error Blockquote props require the matching explicit tag.
  <TextEdit name="title" cite="https://example.com" />;

  const listFields = defineFields({
    fields: {
      file: fileField({ list: true }),
      image: imageField({ list: true }),
      money: moneyField({ list: true }),
      number: numberField({ list: true }),
      title: textField({ list: true }),
      semanticImage: {
        ...imageField({ list: true }),
        kind: "semantic-image",
      } as const,
    },
  });

  defineClient({
    admin: {
      fields: listFields,
      EditForm: Component,
      listItems: [
        [
          (row) => {
            expectTypeOf(row.file).toEqualTypeOf<SelectedMedia | null>();
            expectTypeOf(row.image).toEqualTypeOf<SelectedImage | null>();
            expectTypeOf(row.money).toEqualTypeOf<number | null>();
            expectTypeOf(row.number).toEqualTypeOf<number | null>();
            expectTypeOf(row.title).toEqualTypeOf<string>();
            expectTypeOf(row.semanticImage).toEqualTypeOf<
              z.output<(typeof listFields.semanticImage)["zod"]>
            >();
            return null;
          },
        ],
      ],
    },
  });

  defineClient({
    admin: {
      fields: {
        // @ts-expect-error defineClient accepts definitions, not resolved components.
        title: {
          ...fields.title,
          component: Component,
        },
      },
      EditForm: Component,
    },
  });

  const formSourceFields = defineFields({
    fields: {
      title: textField(),
      value: field({
        default: "",
        kind: "client-value",
        zod: z.string(),
      }),
    },
  });
  const relatedFields = defineFields({
    fields: {
      related: field({
        default: "",
        kind: "related-client-value",
        zod: z.string(),
      }),
    },
  });
  const oneToOne = resolveOneToOneDefinition({ details: relatedFields });
  const formFieldsWithSelection = withOneToOneSelectionField(
    formSourceFields,
    oneToOne,
  );
  const generatedFields = defineFormFields(formSourceFields, {
    components: { value: Component },
  });
  expectTypeOf(formFieldsWithSelection.kind.kind).toEqualTypeOf<"one-to-one">();
  expectTypeOf(formFieldsWithSelection.kind.default).toEqualTypeOf<"details">();
  expectTypeOf<Exclude<keyof typeof generatedFields, symbol>>().toEqualTypeOf<
    "title" | "value"
  >();
  void generatedFields;

  withOneToOneSelectionField(
    // @ts-expect-error one-to-one configuration owns the reserved kind field.
    defineFields({ fields: { kind: textField() } }),
    oneToOne,
  );

  const clientOneToOne = {
    details: defineOneToOneClient({
      fields: relatedFields,
      EditForm: ({ fields: relatedFields, prefix }) => {
        expectTypeOf(
          relatedFields.related.kind,
        ).toEqualTypeOf<"related-client-value">();
        expectTypeOf(prefix).toEqualTypeOf<string>();
        return null;
      },
    }),
  };

  defineClient({
    admin: {
      fields: formSourceFields,
      EditForm: Component,
      oneToOne: clientOneToOne,
    },
  });

  const fieldOwnedProps = defineFormFields(
    defineFields({
      fields: {
        category: relationshipField({ mode: "single" }),
        quantity: numberField({
          description: "Configured description",
          label: "Quantity",
          min: 1,
          step: 1,
        }),
        select: selectField({
          options: [{ label: "Example", value: "example" }],
        }),
        stocked: booleanField(),
      },
    }),
  );
  type CategoryProps = ComponentProps<typeof fieldOwnedProps.category>;
  type QuantityProps = ComponentProps<typeof fieldOwnedProps.quantity>;
  type SelectProps = ComponentProps<typeof fieldOwnedProps.select>;
  type StockedProps = ComponentProps<typeof fieldOwnedProps.stocked>;
  expectTypeOf<Extract<keyof CategoryProps, "mode">>().toEqualTypeOf<never>();
  expectTypeOf<
    Extract<keyof QuantityProps, "description" | "label" | "min" | "step">
  >().toEqualTypeOf<never>();
  expectTypeOf<Extract<keyof SelectProps, "options">>().toEqualTypeOf<never>();
  expectTypeOf<
    Extract<keyof StockedProps, "checked" | "unchecked">
  >().toEqualTypeOf<never>();
  void fieldOwnedProps;

  const editorConfiguration = configurable<{ tone?: string }>("tone");
  const configuredEditor = defineFormFields(
    defineFields({
      fields: {
        summary: field({
          ...editorConfiguration,
          default: "",
          kind: "client-value",
          tone: "warm",
          zod: z.string(),
        }),
      },
    }),
    { components: { summary: Component } },
  );
  type SummaryProps = ComponentProps<typeof configuredEditor.summary>;
  expectTypeOf<Extract<keyof SummaryProps, "tone">>().toEqualTypeOf<never>();
  void configuredEditor;

  defineFormFields(formSourceFields, {
    components: {
      // @ts-expect-error Component registrations are keyed by known field names.
      typo: Component,
    },
  });

  const settingsFields = defineFields({ fields: { title: textField() } });
  defineClient({
    settings: {
      fields: settingsFields,
      SettingsForm: Component,
      // @ts-expect-error Settings accept a form, not a component registry.
      fieldComponents: { custom: Component },
    },
  });
  defineClient({
    settings: {
      fields: settingsFields,
      SettingsForm: Component,
      // @ts-expect-error Settings accept a form, not field-kind registrations.
      fieldKinds: [],
    },
  });

  void saveRecord({
    actionPrefix: "admin",
    fields: projectedFields,
    revalidate: [
      (row) => {
        expectTypeOf(row.title).toEqualTypeOf<string | null>();
        // @ts-expect-error Unselected table columns are not available to revalidation.
        return String(row.second);
      },
    ],
    table: records,
    values: { title: "Saved" },
  });
}
